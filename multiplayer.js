// ═══════════════════════════════════════════════════════════
//  UzayNet — Uzay Zone ortak çok oyunculu modülü
//
//  Firebase Realtime Database üzerinde oda kodu ile eşleşme.
//  Tüm oyunlar bu modülü paylaşır; oyuna özel hiçbir mantık
//  burada yer almaz — sadece oda kur / katıl / durum senkronu.
//
//  Kullanım (iki kişilik — yuvalar 'X' ve 'O'):
//    import * as Net from '../multiplayer.js';
//    const kod = await Net.createRoom('xox', { size: 3, board: '---------' });
//    Net.onRoom(oda => { ... });
//    Net.patch({ board: yeniTahta, turn: 'O' });
//
//  Kullanım (ikiden fazla — yuvalar 'P1'..'P5'):
//    const kod = await Net.createRoom('gezegen-yarisi', { ... }, { maxPlayers: 5 });
//    await Net.joinRoom('gezegen-yarisi', 'ABCD');   // boş ilk yuvayı kapar
//    Net.mySymbol()   // 'P3'
//    Net.myIndex()    // 2   (X/O modunda X=0, O=1)
// ═══════════════════════════════════════════════════════════

import {
  ref, child, get, set, update, onValue,
  onDisconnect, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { db } from './firebase-init.js';

// Karıştırılması kolay karakterler (0/O, 1/I/L) bilinçli olarak çıkarıldı
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN   = 4;
const ROOM_TTL   = 6 * 60 * 60 * 1000;   // 6 saat sonra oda kodu yeniden kullanılabilir

let session = null;   // { game, code, symbol, roomRef, unsubs: [] }

function randomCode() {
  const buf = new Uint32Array(CODE_LEN);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[buf[i] % CODE_CHARS.length];
  return s;
}

const isStale = room => !room || (Date.now() - (room.createdAt || 0)) > ROOM_TTL;

// Yuva adları. İki kişilik oyunlar tarihsel olarak 'X'/'O' kullanır ve öyle
// kalmalı; daha kalabalık oyunlar 'P1'..'Pn' alır. Her iki şemada da yuva
// sırası anahtarların alfabetik sırasıdır (RTDB çocukları böyle döndürür),
// yani 'O' < 'X' — sıra indeksi için slotOrder kullan, Object.keys değil.
const PAIR_SLOTS = ['X', 'O'];
const slotsFor = n => Array.from({ length: n }, (_, i) => `P${i + 1}`);
const slotOrder = players =>
  players && players.P1 !== undefined
    ? slotsFor(Object.keys(players).length)
    : PAIR_SLOTS;

// ── Oda kur ───────────────────────────────────────────────
// initialState: oyuna özel başlangıç alanları (tahta, boyut, ...)
// opts.maxPlayers: 3+ verilirse yuvalar 'P1'..'Pn' olur (varsayılan 'X'/'O').
// Dönüş: oda kodu. Kuran oyuncu her zaman ilk yuvadır ('X' veya 'P1').
export async function createRoom(game, initialState = {}, opts = {}) {
  const slots = opts.maxPlayers ? slotsFor(opts.maxPlayers) : PAIR_SLOTS;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const roomRef = ref(db, `rooms/${game}/${code}`);

    // Transaction: aynı kodu iki kişinin aynı anda kapmasını engeller
    const res = await runTransaction(roomRef, current => {
      if (current && !isStale(current)) return;   // kod dolu → iptal, yeni kod dene
      const players = {};
      slots.forEach((s, i) => { players[s] = i === 0; });
      return { ...initialState, createdAt: Date.now(), players };
    });

    if (res.committed) {
      attach(game, code, slots[0]);
      return code;
    }
  }
  throw new Error('Oda kodu üretilemedi, lütfen tekrar dene.');
}

// ── Odaya katıl ───────────────────────────────────────────
// Boş ilk yuvayı transaction ile kapar: üç kişi aynı anda katılsa bile
// ikisi aynı yuvaya düşmez. Dönüş: odanın mevcut durumu.
// Kapılan yuvayı Net.mySymbol() / Net.myIndex() ile öğren.
export async function joinRoom(game, code) {
  code = String(code).trim().toUpperCase();
  if (code.length !== CODE_LEN) throw new Error(`Kod ${CODE_LEN} karakter olmalı.`);

  const roomRef = ref(db, `rooms/${game}/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error('Böyle bir oda yok. Kodu kontrol et.');

  const room = snap.val();
  if (isStale(room)) throw new Error('Bu odanın süresi dolmuş.');

  const order = slotOrder(room.players);
  let claimed = null;

  const res = await runTransaction(
    ref(db, `rooms/${game}/${code}/players`),
    current => {
      claimed = null;
      if (!current) return;                                  // oda silinmiş → iptal
      claimed = order.find(s => current[s] !== true) || null;
      if (!claimed) return;                                  // boş yuva yok → iptal
      return { ...current, [claimed]: true };
    }
  );

  if (!res.committed || !claimed) throw new Error('Bu oda dolu.');

  attach(game, code, claimed);
  return { ...room, players: res.snapshot.val() };
}

// ── Bağlantı / varlık takibi ──────────────────────────────
// Firebase'in standart "presence" deseni: bağlantı her kurulduğunda
// kendimizi çevrimiçi işaretle, kopunca sunucu bizi çevrimdışı yapsın.
// Böylece kısa bir ağ kesintisi oyunu bitirmez, geri bağlanınca düzelir.
function attach(game, code, symbol) {
  const roomRef = ref(db, `rooms/${game}/${code}`);
  const meRef   = ref(db, `rooms/${game}/${code}/players/${symbol}`);

  session = { game, code, symbol, roomRef, unsubs: [] };

  const unsub = onValue(ref(db, '.info/connected'), snap => {
    if (snap.val() !== true) return;
    onDisconnect(meRef).set(false);
    set(meRef, true);
  });
  session.unsubs.push(unsub);
}

// ── Durum senkronu ────────────────────────────────────────
export function onRoom(cb) {
  if (!session) throw new Error('Önce bir odaya bağlan.');
  session.unsubs.push(onValue(session.roomRef, snap => cb(snap.val())));
}

export function patch(obj) {
  if (!session) return Promise.resolve();
  return update(session.roomRef, obj);
}

// Tek bir dalı dinle / yaz.
// Gerçek zamanlı oyunlarda tüm odayı dinlemek gereksiz trafik yaratır;
// sadece değişen dalı (ör. 'snap', 'in2') izlemek çok daha ucuzdur.
export function onChild(path, cb) {
  if (!session) throw new Error('Önce bir odaya bağlan.');
  session.unsubs.push(onValue(child(session.roomRef, path), snap => cb(snap.val())));
}

export function setChild(path, value) {
  if (!session) return Promise.resolve();
  return set(child(session.roomRef, path), value);
}

export const mySymbol = () => session?.symbol ?? null;
export const roomCode = () => session?.code ?? null;

// Oda kuran = ilk yuva. İki kişilikte 'X', kalabalık oyunlarda 'P1'.
export const isHost = () => session?.symbol === 'X' || session?.symbol === 'P1';

// Yuvanın sıra numarası: X/O → 0/1, P1..Pn → 0..n-1. Odadaki dizileri
// (konumlar, puanlar) indekslemek için kullan.
export const myIndex = () => {
  const s = session?.symbol;
  if (!s) return -1;
  return s[0] === 'P' ? parseInt(s.slice(1), 10) - 1 : PAIR_SLOTS.indexOf(s);
};

// Odanın yuva adları, sıra numarası sırasında.
export const slots = players => slotOrder(players);

// ── Odadan ayrıl ──────────────────────────────────────────
export async function leave() {
  if (!session) return;
  const { game, code, symbol, unsubs } = session;
  unsubs.forEach(fn => fn());
  session = null;
  try {
    await set(ref(db, `rooms/${game}/${code}/players/${symbol}`), false);
  } catch { /* bağlantı zaten kopmuşsa önemli değil */ }
}

// ═══════════════════════════════════════════════════════════
//  UzayNet — Uzay Zone ortak çok oyunculu modülü
//
//  Firebase Realtime Database üzerinde oda kodu ile eşleşme.
//  Tüm oyunlar bu modülü paylaşır; oyuna özel hiçbir mantık
//  burada yer almaz — sadece oda kur / katıl / durum senkronu.
//
//  Kullanım:
//    import * as Net from '../multiplayer.js';
//    const kod = await Net.createRoom('xox', { size: 3, board: '---------' });
//    Net.onRoom(oda => { ... });
//    Net.patch({ board: yeniTahta, turn: 'O' });
// ═══════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getDatabase, ref, child, get, set, update, onValue,
  onDisconnect, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

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

// ── Oda kur ───────────────────────────────────────────────
// initialState: oyuna özel başlangıç alanları (tahta, boyut, ...)
// Dönüş: oda kodu. Kuran oyuncu her zaman 'X'.
export async function createRoom(game, initialState = {}) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const roomRef = ref(db, `rooms/${game}/${code}`);

    // Transaction: aynı kodu iki kişinin aynı anda kapmasını engeller
    const res = await runTransaction(roomRef, current => {
      if (current && !isStale(current)) return;   // kod dolu → iptal, yeni kod dene
      return {
        ...initialState,
        createdAt: Date.now(),
        players: { X: true, O: false }
      };
    });

    if (res.committed) {
      attach(game, code, 'X');
      return code;
    }
  }
  throw new Error('Oda kodu üretilemedi, lütfen tekrar dene.');
}

// ── Odaya katıl ───────────────────────────────────────────
// Dönüş: odanın mevcut durumu. Katılan oyuncu her zaman 'O'.
export async function joinRoom(game, code) {
  code = String(code).trim().toUpperCase();
  if (code.length !== CODE_LEN) throw new Error(`Kod ${CODE_LEN} karakter olmalı.`);

  const roomRef = ref(db, `rooms/${game}/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error('Böyle bir oda yok. Kodu kontrol et.');

  const room = snap.val();
  if (isStale(room))      throw new Error('Bu odanın süresi dolmuş.');
  if (room.players?.O)    throw new Error('Bu oda dolu.');

  await update(ref(db, `rooms/${game}/${code}/players`), { O: true });
  attach(game, code, 'O');
  return room;
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
export const isHost   = () => session?.symbol === 'X';

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

// ═══════════════════════════════════════════════════════════
//  Uzay Zone · Hesap, Nickname ve Uzay Coin
//
//  Her sayfaya <script src="../hesap.js" defer></script> ile eklenir.
//  destek.js gibi KLASİK bir script'tir (modül değil): Firebase SDK'sını
//  içeride dinamik import() ile yükler. file:// ile açıldığında import
//  başarısız olur, sessizce yutulur ve sayfa hesapsız çalışmaya devam eder.
//
//  Oyunlara açtığı tek arayüz:
//    window.UzayHesap.odul('yildiz-avcisi', skor)   → kazanılan coin (Promise<number>)
//    window.UzayHesap.kullanici()                   → { uid, nick, coin } | null
//    window.UzayHesap.onDegisim(cb)                 → giriş/çıkış/coin değişiminde çağrılır
//
//  HİLE NOTU: Site statik olduğu için coin'i tarayıcı yazar. Realtime
//  Database kuralları (firebase-rules.json) bunu tavanlarla sınırlar:
//  tek ödül ≤ 250, iki ödül arası ≥ 10 sn, günlük toplam ≤ 1000.
//  Kurallardaki tavanlar burasıyla AYNI olmalı — birini değiştirirsen
//  diğerini de değiştir, yoksa yazımlar PERMISSION_DENIED alır.
// ═══════════════════════════════════════════════════════════
(function () {
'use strict';

// Bu script'in bulunduğu klasör = sitenin kökü. Dinamik import() ve linkler
// belge adresine göre çözülür, o yüzden her yolu bu köke göre kuruyoruz;
// aksi halde oyun klasörlerinden ../firebase-init.js bulunamaz.
const KOK = new URL('.', document.currentScript.src).href;
const url = yol => new URL(yol, KOK).href;

// ─── Denge: skor → coin ───
// Oyunların içine dağıtılmaz, hepsi burada durur ki tek dosyadan ayarlanabilsin.
const ORAN = {
  'yildiz-avcisi': s => s / 60,
  'uzay-kacisi':   s => s / 40,
  'kule-yigini':   s => s * 5,
  'helezon':       s => s * 4
};

const TEK_MAX      = 250;    // tek oyunda kazanılabilecek en fazla coin
const GUN_MAX      = 1000;   // bir günde toplam en fazla coin
const OYUN_GUN_MAX = 500;    // bir günde tek oyundan en fazla coin
const BEKLE        = 10000;  // iki ödül arası en az süre (ms)

const NICK_DESEN  = /^[a-z0-9çğıöşü_]{3,16}$/;
const YASAK_PARCA = ['admin', 'yonetici', 'uzayzone', 'moderator', 'sistem'];

// Rastgele nickname havuzu — "RedTiger", "NovaFalcon" gibi anlamlı çiftler.
// En uzun sıfat + en uzun isim = 14 karakter, 16'lık sınırı aşmıyor.
const NICK_SIFAT = ['Red', 'Blue', 'Neon', 'Nova', 'Turbo', 'Cyber', 'Iron', 'Solar',
                    'Lunar', 'Cosmic', 'Shadow', 'Golden', 'Frost', 'Storm', 'Astro',
                    'Quantum', 'Plasma', 'Hyper', 'Dark', 'Wild'];
const NICK_ISIM  = ['Tiger', 'Wolf', 'Falcon', 'Comet', 'Rocket', 'Pilot', 'Ranger',
                    'Hunter', 'Phoenix', 'Raven', 'Panther', 'Nomad', 'Rider',
                    'Voyager', 'Titan', 'Viper', 'Orbit', 'Nebula', 'Meteor', 'Captain'];

const sec = liste => liste[Math.floor(Math.random() * liste.length)];
const rastgeleNick = () => sec(NICK_SIFAT) + sec(NICK_ISIM);

// ─── Durum ───
let auth = null, db = null, api = null;   // Firebase modülleri yüklenince dolar
let uid  = null;
let prof = {};                            // users/$uid anlık kopyası
let sonOdulYerel = 0;
let profDinleyici = null;
let hazirHata = null;                      // Firebase hiç yüklenemediyse dolar
const dinleyiciler = [];

const bildir = () => dinleyiciler.forEach(fn => { try { fn(kullanici()); } catch (e) { console.warn(e); } });
const kullanici = () => uid ? { uid, nick: prof.nick || null, coin: prof.coin || 0 } : null;

// ─── Türkçe küçük harf ───
// 'I'.toLowerCase() → 'i' verir, Türkçede 'ı' olmalı. Nickname kilidi bu
// dönüşümün üstüne kurulu olduğu için doğru olması şart.
const kucuk = s => String(s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();

// ─── Dönem anahtarları (Europe/Istanbul) ───
// Türkiye 2016'dan beri sabit UTC+3, yaz saati uygulaması yok.
// UTC ile hesaplasaydık hafta/gün sabah 03:00'te dönerdi.
function trZaman(d) { return new Date((d || new Date()).getTime() + 3 * 3600 * 1000); }

function gunKey() { return trZaman().toISOString().slice(0, 10); }   // "2026-08-08"
function ayKey()  { return trZaman().toISOString().slice(0, 7);  }   // "2026-08"

function haftaKey() {                                               // "2026-W32"
  const d = trZaman();
  d.setUTCHours(0, 0, 0, 0);
  // ISO-8601: haftanın perşembesine kay; yılın 1. haftası 4 Ocak'ı içeren haftadır
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yilBasi = Date.UTC(d.getUTCFullYear(), 0, 1);
  const hafta = Math.ceil(((d.getTime() - yilBasi) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(hafta).padStart(2, '0');
}

// ─── Firebase'i geç yükle ───
let yuklemePromise = null;
function firebase() {
  if (!yuklemePromise) {
    yuklemePromise = Promise.all([
      import(url('firebase-init.js')),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js')
    ]).then(([init, a, d]) => {
      auth = a.getAuth(init.app);
      db   = init.db;
      api  = Object.assign({}, a, d);
      return api;
    });
  }
  return yuklemePromise;
}

// ═══════════════════════════════════════════════════════════
//  Arayüz
// ═══════════════════════════════════════════════════════════

const CSS = `
/* Sağ üst şerit: [DESTEK OL] [GİRİŞ YAP] yan yana.
   destek.js kendi düğmesini body'ye fixed olarak koyuyor; aşağıda onu
   bu şeridin içine taşıyıp fixed konumunu iptal ediyoruz. */
.uzh-bar {
  position: fixed; top: 14px; right: 14px; z-index: 900;
  display: flex; align-items: center; gap: 10px;
  font-family: 'Nunito', sans-serif;
}
.uzh-bar .uzd-fab {
  position: static !important; top: auto !important; right: auto !important;
}
.uzh-kok { position: relative; display: none; }
.uzh-kok.gorunur { display: block; }
.uzh-rozet {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 14px; border-radius: 30px; cursor: pointer;
  background: rgba(8, 6, 24, 0.78); backdrop-filter: blur(8px);
  border: 1.5px solid rgba(125, 249, 255, 0.38);
  color: #7df9ff; font-weight: 800; font-size: 0.78rem;
  box-shadow: 0 0 16px rgba(125, 249, 255, 0.18);
  transition: all 0.25s ease; touch-action: manipulation;
  font-family: 'Orbitron', sans-serif; letter-spacing: 0.08em;
}
.uzh-rozet:hover {
  background: rgba(125, 249, 255, 0.16); color: #fff;
  box-shadow: 0 0 26px rgba(125, 249, 255, 0.42); transform: translateY(-1px);
}
.uzh-avatar {
  width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
  background: rgba(125, 249, 255, 0.18); display: grid; place-items: center; font-size: 0.8rem;
}
.uzh-selam { color: #9d97ba; font-weight: 700; }
.uzh-ad   { max-width: 11ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uzh-coin { color: #ffd75e; }
.uzh-ucan {
  position: absolute; top: 100%; right: 12px; margin-top: 2px;
  font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 0.9rem;
  color: #ffd75e; text-shadow: 0 0 14px rgba(255, 215, 94, 0.7);
  pointer-events: none; animation: uzhUc 1.6s ease-out forwards;
}
@keyframes uzhUc {
  0%   { opacity: 0; transform: translateY(0) scale(0.7); }
  18%  { opacity: 1; transform: translateY(-6px) scale(1.15); }
  70%  { opacity: 1; transform: translateY(-16px) scale(1); }
  100% { opacity: 0; transform: translateY(-34px) scale(1); }
}
.uzh-menu {
  position: absolute; top: calc(100% + 8px); right: 0; min-width: 190px;
  background: linear-gradient(165deg, #141029 0%, #0a0818 75%);
  border: 1px solid rgba(125, 249, 255, 0.24); border-radius: 16px;
  padding: 6px; display: none; box-shadow: 0 18px 50px rgba(0,0,0,0.6);
}
.uzh-menu.acik { display: block; }
.uzh-menu button, .uzh-menu a {
  display: block; width: 100%; text-align: left; text-decoration: none;
  background: none; border: 0; border-radius: 11px; cursor: pointer;
  padding: 10px 13px; color: #d8d2ee; font: 700 0.84rem 'Nunito', sans-serif;
  transition: all 0.18s;
}
.uzh-menu button:hover, .uzh-menu a:hover { background: rgba(125, 249, 255, 0.12); color: #fff; }
.uzh-menu .uzh-cikis { color: #ff8fa8; }
.uzh-menu .uzh-ayrac { height: 1px; background: rgba(255,255,255,0.09); margin: 5px 8px; }

.uzh-ortu {
  position: fixed; inset: 0; z-index: 10000; display: none;
  background: rgba(4, 4, 14, 0.86); backdrop-filter: blur(8px);
  padding: 24px 14px; overflow-y: auto;
  font-family: 'Nunito', sans-serif;
}
.uzh-ortu.acik { display: flex; }
.uzh-kutu {
  margin: auto; width: min(420px, 100%); position: relative;
  background: linear-gradient(165deg, #171029 0%, #0b0818 72%);
  border: 1px solid rgba(125, 249, 255, 0.26); border-radius: 24px;
  padding: 34px 28px 28px; box-shadow: 0 24px 80px rgba(0,0,0,0.65);
  animation: uzhGiris 0.32s ease;
}
@keyframes uzhGiris { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: none; } }
.uzh-kapat {
  position: absolute; top: 14px; right: 14px; width: 34px; height: 34px;
  border-radius: 50%; border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); color: #aaa8c0; cursor: pointer; line-height: 1;
}
.uzh-kapat:hover { background: rgba(125,249,255,0.16); color: #fff; }
.uzh-baslik {
  font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 1.15rem;
  letter-spacing: 0.07em; color: #fff; text-align: center; margin-bottom: 8px;
  text-shadow: 0 0 22px rgba(125, 249, 255, 0.4);
}
.uzh-alt { text-align: center; color: #a9a4c2; font-size: 0.86rem; line-height: 1.5; margin-bottom: 22px; }
.uzh-buton {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 13px 16px; margin-bottom: 10px; cursor: pointer;
  border-radius: 14px; border: 1px solid rgba(125, 249, 255, 0.3);
  background: rgba(125, 249, 255, 0.09); color: #eae5ff;
  font: 800 0.9rem 'Nunito', sans-serif; transition: all 0.22s;
  touch-action: manipulation;
}
.uzh-buton:hover:not(:disabled) { background: rgba(125, 249, 255, 0.2); border-color: #7df9ff; color: #fff; }
.uzh-buton:disabled { opacity: 0.5; cursor: default; }
.uzh-buton.sonuc {
  background: linear-gradient(135deg, #7df9ff, #b06bff); color: #08061a;
  border: 0; font-family: 'Orbitron', sans-serif; font-weight: 900; letter-spacing: 0.08em;
}
.uzh-buton.sade { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.14); }
.uzh-giris {
  width: 100%; padding: 13px 15px; margin-bottom: 8px;
  border-radius: 14px; border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.05); color: #fff;
  font: 700 1rem 'Nunito', sans-serif; text-align: center; letter-spacing: 0.04em;
}
.uzh-giris:focus { outline: 0; border-color: #7df9ff; box-shadow: 0 0 0 3px rgba(125,249,255,0.14); }
.uzh-durum { min-height: 1.4em; text-align: center; font-size: 0.82rem; margin: 4px 0 14px; color: #a9a4c2; }
.uzh-durum.hata { color: #ff8fa8; }
.uzh-durum.iyi  { color: #7dffb0; }

@media (max-width: 640px) {
  .uzh-bar { top: 10px; right: 10px; gap: 6px; }
  .uzh-rozet { font-size: 0.7rem; padding: 6px 11px; gap: 6px; }
  .uzh-selam { display: none; }          /* dar ekranda "Merhaba," yerine sadece nickname */
  .uzh-ad { max-width: 8ch; }
}
`;

const stil = document.createElement('style');
stil.textContent = CSS;
document.head.appendChild(stil);

const kok = document.createElement('div');
kok.className = 'uzh-kok';
kok.innerHTML =
  '<button class="uzh-rozet" id="uzhRozet" aria-haspopup="true" aria-expanded="false">GİRİŞ YAP</button>' +
  '<div class="uzh-menu" id="uzhMenu" role="menu">' +
    '<a href="' + url('skor-tablosu/') + '" role="menuitem">🏆 Skor Tablosu</a>' +
    '<button type="button" id="uzhNickDegis" role="menuitem">✏️ Nickname değiştir</button>' +
    '<div class="uzh-ayrac"></div>' +
    '<button type="button" class="uzh-cikis" id="uzhCikis" role="menuitem">🚪 Çıkış yap</button>' +
  '</div>';

const ortu = document.createElement('div');
ortu.className = 'uzh-ortu';
ortu.innerHTML =
  '<div class="uzh-kutu" role="dialog" aria-modal="true" aria-labelledby="uzhBaslik">' +
    '<button class="uzh-kapat" id="uzhKapat" aria-label="Kapat">✕</button>' +
    '<h2 class="uzh-baslik" id="uzhBaslik"></h2>' +
    '<p class="uzh-alt" id="uzhAlt"></p>' +
    '<div id="uzhGovde"></div>' +
    '<p class="uzh-durum" id="uzhDurum"></p>' +
  '</div>';

const bar = document.createElement('div');
bar.className = 'uzh-bar';
bar.appendChild(kok);

document.body.appendChild(bar);
document.body.appendChild(ortu);

// destek.js de defer ile yükleniyor ve bizden SONRA çalışıyor, yani düğmesi
// henüz yok. Belirdiğinde şeridin içine al ki "DESTEK OL" ile "GİRİŞ YAP"
// yan yana dursun. Oyun sayfalarında destek.js hiç yok — o zaman da sorun
// değil, şeritte tek başına hesap rozeti kalır.
(function destegiSerideAl() {
  const tasi = () => {
    const fab = document.querySelector('.uzd-fab');
    if (!fab) return false;
    if (fab.parentElement !== bar) bar.insertBefore(fab, kok);
    return true;
  };
  if (tasi()) return;
  // Ortam MutationObserver desteklemiyorsa vazgeç: düğme kendi yerinde kalır,
  // hesap sistemi çalışmaya devam eder. Burada atılan hata her şeyi düşürürdü.
  if (typeof MutationObserver !== 'function') return;
  const gozcu = new MutationObserver(() => { if (tasi()) gozcu.disconnect(); });
  gozcu.observe(document.body, { childList: true });
  // destek.js hiç yüklenmiyorsa gözcüyü sonsuza kadar açık tutma
  setTimeout(() => gozcu.disconnect(), 10000);
})();

const $ = id => document.getElementById(id);
const rozetEl = $('uzhRozet'), menuEl = $('uzhMenu');
const baslikEl = $('uzhBaslik'), altEl = $('uzhAlt'), govdeEl = $('uzhGovde'), durumEl = $('uzhDurum');

function durumYaz(metin, sinif) {
  durumEl.textContent = metin || '';
  durumEl.className = 'uzh-durum' + (sinif ? ' ' + sinif : '');
}

let kapatilabilir = true;
function modalAc(baslik, alt, icerik, kapanabilir) {
  baslikEl.textContent = baslik;
  altEl.innerHTML = alt;
  govdeEl.innerHTML = '';
  govdeEl.appendChild(icerik);
  durumYaz('');
  kapatilabilir = kapanabilir !== false;
  $('uzhKapat').style.display = kapatilabilir ? '' : 'none';
  ortu.classList.add('acik');
  menuKapat();
}
function modalKapat(zorla) {
  if (!kapatilabilir && !zorla) return;
  ortu.classList.remove('acik');
}
function menuKapat() { menuEl.classList.remove('acik'); rozetEl.setAttribute('aria-expanded', 'false'); }

$('uzhKapat').addEventListener('click', () => modalKapat());
ortu.addEventListener('click', e => { if (e.target === ortu) modalKapat(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { modalKapat(); menuKapat(); } });
document.addEventListener('click', e => { if (!kok.contains(e.target)) menuKapat(); });

rozetEl.addEventListener('click', () => {
  if (hazirHata) { kapaliModali(); return; }
  if (!uid) { girisModali(); return; }
  if (!prof.nick) { nickModali(true); return; }
  const acik = menuEl.classList.toggle('acik');
  rozetEl.setAttribute('aria-expanded', String(acik));
});

$('uzhCikis').addEventListener('click', async () => {
  menuKapat();
  const fb = await firebase();
  await fb.signOut(auth);
});

$('uzhNickDegis').addEventListener('click', () => nickModali(false));

// ─── Rozeti tazele ───
function rozetiCiz() {
  if (!uid) {
    rozetEl.innerHTML = 'GİRİŞ YAP';
    return;
  }
  const foto = auth && auth.currentUser && auth.currentUser.photoURL;
  const avatar = foto
    ? '<img class="uzh-avatar" src="' + foto + '" alt="">'
    : '<span class="uzh-avatar">🚀</span>';

  // Nickname henüz yoksa selamlama yerine yapılması gerekeni göster
  if (!prof.nick) {
    rozetEl.innerHTML = avatar + '<span class="uzh-ad">Nickname seç</span>';
    return;
  }

  rozetEl.innerHTML =
    avatar +
    '<span class="uzh-selam">Merhaba,</span>' +
    '<span class="uzh-ad">' + kacisla(prof.nick) + '</span>' +
    '<span class="uzh-coin">🪙 ' + (prof.coin || 0).toLocaleString('tr-TR') + '</span>';
}

function kacisla(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function ucanCoin(miktar) {
  const el = document.createElement('div');
  el.className = 'uzh-ucan';
  el.textContent = '+' + miktar + ' 🪙';
  kok.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

// ═══════════════════════════════════════════════════════════
//  Giriş
// ═══════════════════════════════════════════════════════════

// Hesap sistemi hiç açılamadıysa sessiz kalma — nedenini söyle.
// En sık sebep: sayfanın çift tıklayarak file:// ile açılması. Tarayıcılar
// file:// üzerinden ES modülü indirmeyi güvenlik gereği engeller.
function kapaliModali() {
  const yerelDosya = location.protocol === 'file:';
  const govde = document.createElement('div');

  govde.innerHTML = yerelDosya
    ? '<p style="color:#c9c3e2;font-size:0.88rem;line-height:1.65;margin-bottom:16px">' +
        'Sayfayı diskten <b>çift tıklayarak</b> açtın. Tarayıcı bu modda güvenlik gereği ' +
        'Firebase modüllerini yükleyemez, o yüzden giriş yapılamıyor.<br><br>' +
        'Oyunun kendisi normal çalışır — sadece hesap ve coin kapalıdır.</p>' +
      '<p style="color:#8d88ab;font-size:0.8rem;margin-bottom:8px">Sitenin klasöründe bir terminal açıp şunu çalıştır:</p>' +
      '<code style="display:block;background:rgba(0,0,0,0.4);border:1px solid rgba(125,249,255,0.2);' +
        'border-radius:12px;padding:12px 14px;color:#7df9ff;font-size:0.86rem;margin-bottom:14px">npx serve</code>' +
      '<p style="color:#8d88ab;font-size:0.8rem">Sonra çıkan <b>http://localhost:3000</b> adresinden aç.</p>'
    : '<p style="color:#c9c3e2;font-size:0.88rem;line-height:1.65">' +
        'Hesap sistemine şu an bağlanılamıyor. İnternet bağlantını kontrol edip sayfayı yenile.<br><br>' +
        '<span style="color:#8d88ab;font-size:0.82rem">Ayrıntı: ' + kacisla(hazirHata && hazirHata.message || 'bilinmiyor') + '</span></p>';

  modalAc('HESAP SİSTEMİ KAPALI', yerelDosya ? 'Yerel sunucu gerekiyor' : 'Bağlantı kurulamadı', govde);
}

function girisModali() {
  const govde = document.createElement('div');
  govde.innerHTML =
    '<button type="button" class="uzh-buton" id="uzhGoogle">' +
      '<svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">' +
        '<path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36 45 30.6 45 24z"/>' +
        '<path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.9-12.5-9.2l-7.1 5.5C8.1 41 15.4 46 24 46z"/>' +
        '<path fill="#FBBC05" d="M11.5 28.3c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3l-7.1-5.5C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 9.8l7.1-5.5z"/>' +
        '<path fill="#EA4335" d="M24 9.5c3.2 0 6 1.1 8.2 3.2l6.1-6.1C34.9 3.1 29.9 1 24 1 15.4 1 8.1 6 4.4 14.2l7.1 5.5C13.3 13.4 18.2 9.5 24 9.5z"/>' +
      '</svg> Google ile Giriş Yap</button>' +
    '<button type="button" class="uzh-buton sade" id="uzhMisafir">👾 Misafir olarak oyna</button>';

  modalAc('UZAY ZONE HESABI',
    'Giriş yap, kendine bir nickname seç ve oynadığın oyunlardan <b style="color:#ffd75e">Uzay Coin</b> kazan.<br>Haftanın ve ayın en iyi 5 oyuncusu skor tablosunda yayınlanır 🏆',
    govde);

  $('uzhGoogle').addEventListener('click', () => sar($('uzhGoogle'), googleGiris));
  $('uzhMisafir').addEventListener('click', () => sar($('uzhMisafir'), misafirGiris));
}

// Butonu kilitle, hatayı modalda göster — her giriş yolunda aynı davranış.
async function sar(buton, is) {
  const eski = buton.innerHTML;
  buton.disabled = true;
  durumYaz('Bağlanılıyor…');
  try {
    await is();
    // İş kendi mesajını yazdıysa (ör. "bu isim boşta") onu ezme
    if (durumEl.textContent === 'Bağlanılıyor…') durumYaz('');
  } catch (e) {
    console.warn('[hesap]', e);
    durumYaz(hataMetni(e), 'hata');
  } finally {
    buton.disabled = false;
    buton.innerHTML = eski;
  }
}

function hataMetni(e) {
  const kod = e && e.code || '';
  if (kod === 'auth/popup-closed-by-user' || kod === 'auth/cancelled-popup-request') return 'Giriş penceresi kapatıldı.';
  if (kod === 'auth/network-request-failed') return 'Bağlantı kurulamadı, internetini kontrol et.';
  if (kod === 'auth/operation-not-allowed') return 'Bu giriş yöntemi Firebase konsolunda açık değil.';
  if (kod === 'auth/unauthorized-domain') return 'Bu alan adı Firebase\'de yetkili değil.';
  return (e && e.message) || 'Bir şeyler ters gitti, tekrar dene.';
}

async function googleGiris() {
  const fb = await firebase();
  const saglayici = new fb.GoogleAuthProvider();
  const mevcut = auth.currentUser;

  // Misafirken Google'a bağlanırsa uid korunur → coin ve nickname taşınır
  if (mevcut && mevcut.isAnonymous) {
    try {
      await fb.linkWithPopup(mevcut, saglayici);
      return;
    } catch (e) {
      if (e.code !== 'auth/credential-already-in-use' && e.code !== 'auth/email-already-in-use') throw e;
      // Bu Google hesabının zaten profili var: misafir ilerlemesi değil, o hesap kazanır
      await fb.signInWithPopup(auth, saglayici);
      durumYaz('Bu Google hesabının zaten bir profili vardı, ona geçtin.', 'iyi');
      return;
    }
  }

  try {
    await fb.signInWithPopup(auth, saglayici);
  } catch (e) {
    if (e.code === 'auth/popup-blocked') { await fb.signInWithRedirect(auth, saglayici); return; }
    throw e;
  }
}

async function misafirGiris() {
  const fb = await firebase();
  await fb.signInAnonymously(auth);
}

// ═══════════════════════════════════════════════════════════
//  Nickname
// ═══════════════════════════════════════════════════════════

function nickModali(ilkKez) {
  const govde = document.createElement('div');
  govde.innerHTML =
    '<input class="uzh-giris" id="uzhNick" maxlength="16" autocomplete="off" spellcheck="false" ' +
      'placeholder="nickname" value="' + kacisla(prof.nick || '') + '">' +
    '<button type="button" class="uzh-buton sade" id="uzhNickRastgele">🎲 Rastgele öner</button>' +
    '<button type="button" class="uzh-buton sonuc" id="uzhNickKaydet">KAYDET</button>' +
    (ilkKez ? '' : '<button type="button" class="uzh-buton sade" id="uzhNickVazgec">Vazgeç</button>');

  modalAc(ilkKez ? 'NICKNAME SEÇ' : 'NICKNAME DEĞİŞTİR',
    'Skor tablosunda bu isimle görüneceksin.<br>3–16 karakter; harf, rakam ve alt çizgi.',
    govde, !ilkKez);

  const girisEl = $('uzhNick');
  girisEl.focus();
  girisEl.addEventListener('keydown', e => { if (e.key === 'Enter') $('uzhNickKaydet').click(); });

  $('uzhNickRastgele').addEventListener('click', () => sar($('uzhNickRastgele'), async () => {
    girisEl.value = await musaitNickBul();
    durumYaz('Bu isim boşta — beğenmezsen tekrar bas 🎲', 'iyi');
  }));

  $('uzhNickKaydet').addEventListener('click', () => sar($('uzhNickKaydet'), async () => {
    await nickKaydet(girisEl.value.trim());
    modalKapat(true);
  }));
  if (!ilkKez) $('uzhNickVazgec').addEventListener('click', () => modalKapat(true));
}

// Boşta olan bir öneri bul. Havuz 400 kombinasyon, çakışma nadirdir;
// yine de dolu çıkarsa birkaç kez dener, en sonunda sonuna sayı ekler.
async function musaitNickBul() {
  const fb = await firebase();
  for (let deneme = 0; deneme < 6; deneme++) {
    const aday = rastgeleNick();
    const anlik = await fb.get(fb.ref(db, 'nicks/' + kucuk(aday)));
    if (!anlik.exists()) return aday;
  }
  // Hepsi doluysa: taban + rastgele sayı (taban en fazla 14, +2 hane = 16)
  return rastgeleNick() + Math.floor(Math.random() * 90 + 10);
}

async function nickKaydet(nick) {
  if (!uid) throw new Error('Önce giriş yapmalısın.');
  const alt = kucuk(nick);
  if (!NICK_DESEN.test(alt)) throw new Error('3–16 karakter olmalı; harf, rakam ve _ kullanabilirsin.');
  if (YASAK_PARCA.some(k => alt.includes(k))) throw new Error('Bu nickname kullanılamaz, başka bir tane seç.');
  if (alt === prof.nickLower) { if (nick !== prof.nick) await nickYaz(nick, alt); return; }

  const fb = await firebase();
  // Transaction: iki kişi aynı anda aynı nickname'i alamaz
  const sonuc = await fb.runTransaction(fb.ref(db, 'nicks/' + alt),
    mevcut => (mevcut === null || mevcut === uid) ? uid : undefined);
  if (!sonuc.committed) throw new Error('Bu nickname alınmış, başka bir tane dene.');

  const eskiAlt = prof.nickLower;
  await nickYaz(nick, alt);
  if (eskiAlt && eskiAlt !== alt) {
    try { await fb.set(fb.ref(db, 'nicks/' + eskiAlt), null); } catch (e) { console.warn('[hesap] eski nick bırakılamadı', e); }
  }
  await boardNickTazele(nick);
}

async function nickYaz(nick, alt) {
  const fb = await firebase();
  await fb.update(fb.ref(db, 'users/' + uid), {
    nick: nick,
    nickLower: alt,
    olusturuldu: prof.olusturuldu || Date.now()
  });
}

// Skor tablosuna nickname kopyalanıyor (tablo users/ okumadan çizilebilsin diye).
// İsim değişince içinde bulunulan dönemlerin kaydını da tazele.
async function boardNickTazele(nick) {
  const fb = await firebase();
  const yollar = ['board/haftalik/' + haftaKey() + '/' + uid, 'board/aylik/' + ayKey() + '/' + uid];
  await Promise.all(yollar.map(yol =>
    fb.runTransaction(fb.ref(db, yol), mevcut => mevcut ? Object.assign({}, mevcut, { nick: nick }) : undefined)
      .catch(e => console.warn('[hesap] skor tablosu nick tazelenemedi', e))
  ));
}

// ═══════════════════════════════════════════════════════════
//  Uzay Coin
// ═══════════════════════════════════════════════════════════

async function odul(oyunId, skor) {
  if (!uid || !prof.nick) return 0;              // giriş yok / nickname yok → sessizce geç
  const oran = ORAN[oyunId];
  if (!oran) { console.warn('[hesap] tanımsız oyun:', oyunId); return 0; }

  const gun = gunKey();
  const gunToplam = (prof.gun && prof.gun.tarih === gun && prof.gun.toplam) || 0;
  const oyunGun   = (prof.gunluk && prof.gunluk[oyunId] && prof.gunluk[oyunId][gun]) || 0;

  let coin = Math.floor(oran(Math.max(0, Number(skor) || 0)));
  coin = Math.min(coin, TEK_MAX, GUN_MAX - gunToplam, OYUN_GUN_MAX - oyunGun);
  if (coin <= 0) return 0;

  const simdi = Date.now();
  if (simdi - sonOdulYerel < BEKLE) return 0;    // sunucu da denetler, burası boşuna yazım yapmasın diye
  sonOdulYerel = simdi;

  const fb = await firebase();
  try {
    // TEK update: coin + lastOdul + gün sayaçları birlikte gitmeli,
    // DB kuralı bunları birbirine bağlı doğruluyor (bkz. firebase-rules.json).
    const yazim = {
      coin: (prof.coin || 0) + coin,
      lastOdul: fb.serverTimestamp(),
      'gun/tarih': gun,
      'gun/toplam': gunToplam + coin
    };
    yazim['gunluk/' + oyunId + '/' + gun] = oyunGun + coin;
    await fb.update(fb.ref(db, 'users/' + uid), yazim);
  } catch (e) {
    sonOdulYerel = 0;
    console.warn('[hesap] coin yazılamadı', e);
    return 0;
  }

  ucanCoin(coin);

  // Skor tablosu ayrı yazılır; buradaki hata kazanılan coin'i geri almaz
  const yollar = ['board/haftalik/' + haftaKey() + '/' + uid, 'board/aylik/' + ayKey() + '/' + uid];
  await Promise.all(yollar.map(yol =>
    fb.runTransaction(fb.ref(db, yol),
      mevcut => ({ nick: prof.nick, coin: ((mevcut && mevcut.coin) || 0) + coin }))
      .catch(e => console.warn('[hesap] skor tablosu güncellenemedi', e))
  ));

  return coin;
}

// ═══════════════════════════════════════════════════════════
//  Oturum takibi
// ═══════════════════════════════════════════════════════════

function profiliDinle(fb) {
  if (profDinleyici) { profDinleyici(); profDinleyici = null; }
  if (!uid) { prof = {}; rozetiCiz(); bildir(); return; }

  let ilkVeri = true;
  profDinleyici = fb.onValue(fb.ref(db, 'users/' + uid), anlik => {
    prof = anlik.val() || {};
    rozetiCiz();
    bildir();
    if (ilkVeri) {
      ilkVeri = false;
      if (!prof.nick) nickModali(true);   // yeni hesap → nickname iste
    }
  }, hata => console.warn('[hesap] profil okunamadı', hata));
}

// Rozet hemen görünür; Firebase arkada yüklenir. Yükleme başarısız olursa
// rozet KAYBOLMAZ — tıklayınca nedenini açıklayan modal çıkar. Oyun her
// durumda oynanabilir kalır, UzayHesap.odul() sessizce 0 döner.
kok.classList.add('gorunur');

firebase().then(fb => {
  fb.onAuthStateChanged(auth, kullanan => {
    uid = kullanan ? kullanan.uid : null;
    sonOdulYerel = 0;
    if (!uid) { modalKapat(true); menuKapat(); }
    profiliDinle(fb);
  });
}).catch(e => {
  hazirHata = e || new Error('bilinmeyen hata');
  console.info('[hesap] hesap sistemi devre dışı:', e && e.message);
});

// ─── Oyunlara açılan arayüz ───
window.UzayHesap = {
  odul: (oyunId, skor) => odul(oyunId, skor).catch(e => { console.warn('[hesap]', e); return 0; }),
  kullanici: kullanici,
  onDegisim: fn => { dinleyiciler.push(fn); try { fn(kullanici()); } catch (e) { console.warn(e); } },
  girisAc: girisModali,
  // Ana sayfa kartlarındaki 🪙 rozetini bu liste besler — ORAN tablosu tek
  // kaynaktır, index.html'de ikinci bir liste tutulmaz.
  coinliOyunlar: () => Object.keys(ORAN),
  // skor-tablosu sayfası bunları kullanıyor
  _haftaKey: haftaKey,
  _ayKey: ayKey,
  _firebase: firebase
};

})();

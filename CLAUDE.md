# Uzay Zone

Statik oyun portalı. GitHub Pages'ten yayınlanır (`CNAME`), build adımı yoktur — dosyalar deposunda ne yazıyorsa tarayıcıda o çalışır.

## Yapı

- Her oyun kökte kendi klasöründe: `<klasor-adi>/index.html` (küçük harf, tireli, Türkçe karaktersiz)
- Ana sayfa `index.html` — oyun kartları içindeki `GAMES` array'inden üretilir
- Paylaşılan kök dosyalar: `analytics.js` (GA4), `hesap.js` (giriş + Uzay Coin), `multiplayer.js` (oda kodlu çok oyunculu), `destek.js`
- Firebase: `firebase-config.js` (anahtarlar) + `firebase-init.js` (tek `initializeApp` — `multiplayer.js` ve `hesap.js` ikisi de bunu import eder) + `firebase-rules.json` (kaynak kopya; **konsola elle yapıştırılmadan geçerli olmaz**)
- Oyun olmayan klasörler: `admin/`, `hediye/`, `logo/`, `skor-tablosu/`

## Değişmezler

Mevcut bir oyunu düzenlerken de geçerli:

- **Tek dosya**: CSS ve JS oyunun `index.html`'i içinde inline. Harici dosya yalnızca kütüphane CDN'i ve `assets/`.
- **Türkçe**: `lang="tr"` ve tüm görünür metinler Türkçe.
- **Bağımsız**: Oyun, portal olmadan `<klasor>/index.html` açılarak da çalışmalı.
- **Her sayfada analytics**: `</head>` öncesinde `<script src="../analytics.js"></script>`. Measurement ID yalnız `analytics.js` içinde durur.
- **Her oyunda hesap**: yanına `<script src="../hesap.js" defer></script>`, oyun bitişinde tek satır `window.UzayHesap?.odul('klasor-adi', skor)` ve `hesap.js` içindeki `ORAN` tablosuna oyunun satırı. `?.` şart — hesap sistemi yoksa oyun yine çalışmalı.
- **Her oyunda Ana Sayfa butonu**: `href="../"` ile sabit konumlu dönüş linki.
- **Mobil**: viewport meta + dokunmatik kontrol zorunlu.
- **npm/build yok**: Bağımlılık eklemek = bir CDN `<script>` etiketi.

## Uzay Coin ve skor tablosu

`hesap.js` = Firebase Auth (Google + misafir) + nickname + coin cüzdanı + sağ üst rozet. Skor tablosu `skor-tablosu/` altında: haftanın ve ayın en iyi 5'i. Dönem anahtarları Europe/Istanbul (sabit UTC+3) saatine göre üretilir, sıfırlama işi yoktur — anahtar kendiliğinden değişir.

Coin'i tarayıcı yazar (site statik, sunucu yok). Hile **imkansız değil, tavanlı**: tek ödül ≤ 250, iki ödül arası ≥ 10 sn, günlük toplam ≤ 1000, oyun başına günlük ≤ 500. Bu sayılar `hesap.js` ile `firebase-rules.json` içinde **iki yerde** durur; birini değiştirirsen diğerini de değiştir, yoksa yazımlar `PERMISSION_DENIED` alır.

Ödül yazımı `users/$uid` üzerinde **tek bir `update()`** olmalı (coin + lastOdul + gün sayaçları birlikte) — kural bunları birbirine bağlı doğruluyor.

## Test

Çok oyunculu oyunlar `multiplayer.js`'i, `hesap.js` de Firebase SDK'sını ES modülü olarak yükler; **`file://` ile açmak çalışmaz**, yerel sunucu gerekir (`npx serve` veya benzeri). `file://` ile açıldığında hesap rozeti hiç görünmez ve `UzayHesap` tanımsız kalır — oyun bundan etkilenmemeli. Tek bilgisayarda iki pencereyle test ederken pencereler yan yana ve tamamen görünür olmalı — arka plandaki sekmede Chrome `requestAnimationFrame`'i ~1 fps'e düşürür, bu ağ gecikmesi sanılır.

## Otomatik kontrol

`.claude/hooks/oyun-kontrol.js`, bir oyunun `index.html`'i her yazıldığında analytics satırını, Ana Sayfa butonunu, `lang="tr"`, viewport'u, HTML'de karşılığı olmayan `getElementById` çağrılarını ve `display:none` elemanı `style.display=''` ile açma hatasını denetler. Uyarı gelirse düzelt.

## Yeni oyun

`/new-game` skill'ini kullan — adım adım akış ve detaylar `.claude/skills/new-game/` altında.

# Uzay Zone

Statik oyun portalı. GitHub Pages'ten yayınlanır (`CNAME`), build adımı yoktur — dosyalar deposunda ne yazıyorsa tarayıcıda o çalışır.

## Yapı

- Her oyun kökte kendi klasöründe: `<klasor-adi>/index.html` (küçük harf, tireli, Türkçe karaktersiz)
- Ana sayfa `index.html` — oyun kartları içindeki `GAMES` array'inden üretilir
- Paylaşılan kök dosyalar: `analytics.js` (GA4), `hesap.js` (giriş + Uzay Coin), `multiplayer.js` (oda kodlu çok oyunculu), `destek.js`
- Firebase: `firebase-config.js` (anahtarlar) + `firebase-init.js` (tek `initializeApp` — `multiplayer.js` ve `hesap.js` ikisi de bunu import eder) + `firebase-rules.json` (kaynak kopya; **konsola elle yapıştırılmadan geçerli olmaz**)
- Oyun olmayan klasörler: `admin/`, `haberler/`, `hediye/`, `logo/`, `sikayetler/`, `skor-tablosu/`, `uzaygpt/`

## Değişmezler

Mevcut bir oyunu düzenlerken de geçerli:

- **Tek dosya**: CSS ve JS oyunun `index.html`'i içinde inline. Harici dosya yalnızca kütüphane CDN'i ve `assets/`.
- **Türkçe**: `lang="tr"` ve tüm görünür metinler Türkçe.
- **Bağımsız**: Oyun, portal olmadan `<klasor>/index.html` açılarak da çalışmalı.
- **Her sayfada analytics**: `</head>` öncesinde `<script src="../analytics.js"></script>`. Measurement ID yalnız `analytics.js` içinde durur.
- **Her oyunda hesap**: yanına `<script src="../hesap.js" defer></script>`, oyun bitişinde tek satır `window.UzayHesap?.odul('klasor-adi', deger)` ve `hesap.js` içindeki `ODUL` tablosuna oyunun satırı. `?.` şart — hesap sistemi yoksa oyun yine çalışmalı.
- **Her oyunda Ana Sayfa butonu**: `href="../"` ile sabit konumlu dönüş linki.
- **Mobil**: viewport meta + dokunmatik kontrol zorunlu.
- **npm/build yok**: Bağımlılık eklemek = bir CDN `<script>` etiketi.

## Uzay Coin ve skor tablosu

`hesap.js` = Firebase Auth (Google + misafir + nickname/şifre) + nickname + coin cüzdanı + sağ üst rozet.

Misafir hesabı kaydolurken şifre belirler: Firebase'de kullanıcı adı diye bir yöntem olmadığı için nickname'den sahte bir adres türetilir (`u_<nick>@misafir.uzayzone.com`, Türkçe harfler `-c`/`-s`… diye kaçışlanır) ve anonim hesaba `linkWithCredential` ile bağlanır — uid değişmediği için coin ve skor tablosu kaydı korunur, oyuncu başka bir bilgisayardan aynı nickname + şifreyle girer. Giriş adı ayrı bir alanda tutulmaz, `auth.currentUser.email`'den okunur; nickname sonradan değişse bile giriş adı kayıt anındaki isim olarak kalır. **Firebase konsolunda Authentication → Sign-in method → E-posta/Şifre açık olmalı**, kapalıysa kayıt `auth/operation-not-allowed` verir. Skor tablosu `skor-tablosu/` altında: haftanın ve ayın en iyi 5'i. Dönem anahtarları Europe/Istanbul (sabit UTC+3) saatine göre üretilir, sıfırlama işi yoktur — anahtar kendiliğinden değişir.

**Her oyundan coin kazanılır** ve miktar sabittir; oyunun zorluğuna/uzunluğuna göre 50 ile 250 arasında değişir (`hesap.js` → `ODUL`). Her satırda `coin` (kazanılan miktar) ve `esik` (`odul()`'e geçirilen değerin en az kaçı olması gerektiği) durur: skorlu oyunlarda skor, sayaçlı oyunlarda sayaç (tıklama/blok/sipariş), "başardım" oyunlarında 1. Eşiğin altı 0 coin — açıp hemen kaybederek coin toplanamasın. Sonu olmayan oyunlar (mini-mimar, havai-fişek, süper şef, simya, tıkla kazan) ödülü aralıklarla verir; ana sayfa kartlarında coin rozeti yoktur, ayırt edici değil.

Coin'i tarayıcı yazar (site statik, sunucu yok). Hile **imkansız değil, tavanlı**: tek ödül ≤ 250, iki ödül arası ≥ 10 sn, günlük toplam ≤ 1000, oyun başına günlük ≤ 500. Bu sayılar `hesap.js` ile `firebase-rules.json` içinde **iki yerde** durur; birini değiştirirsen diğerini de değiştir, yoksa yazımlar `PERMISSION_DENIED` alır.

Ödül yazımı `users/$uid` üzerinde **tek bir `update()`** olmalı (coin + lastOdul + gün sayaçları birlikte) — kural bunları birbirine bağlı doğruluyor.

## Haberler

`haberler/` — siteye ne geldi / ne yapılıyor / sırada ne var duyuru akışı. Verisi Realtime Database'de:

- `haberler/$id` = `{ baslik, metin, durum, tarih }` — `durum` yalnızca `geldi` | `yapiliyor` | `gelecek` olabilir (kural doğruluyor), sayfada ✅ YAYINDA / 🔧 YAPILIYOR / 🔭 YAKINDA rozetine dönüşür. Liste en yeniden eskiye, üstteki üç düğmeyle duruma göre süzülür.
- `yoneticiler/$uid` = `true` — **haber yazma/düzenleme/silme hakkı yalnızca bu uid'lerde**. Düğüme yazma kurallarda kapalı (`".write": false`), yani tarayıcıdan kimse kendini yönetici yapamaz: **Firebase konsolundan elle** `yoneticiler/<uid> = true` eklemelisin. Kendi uid'ini konsolda `UzayHesap.kullanici().uid` ile öğren.

Yönetici panosu (haber yazma formu) sadece o hesapta görünür; panoyu DevTools'la açmak işe yaramaz, kural aynı düğüme bakar. Düzenlemede `tarih` alanına dokunulmaz — haberin özgün yayın tarihi kalır. Okuma herkese açık, giriş istemez. Sayfa **coin vermez**.

Ana sayfadaki `📡 HABERLER` linkinde okunmamış haber varsa "YENİ" rozeti yanar: haberler sayfası en yeni haberin `tarih`'ini `localStorage['uz_haber_gorulen']`'e yazar, ana sayfa da en yeni haberi (`limitToLast(1)`) bununla karşılaştırır.

## Şikayetler ve Öneriler

`sikayetler/` (sayfa adı "Şikayetler ve Öneriler") — herkese açık şikayet/öneri duvarı; oy, yanıt ve "Bizi puanla" bölümü. Verisi Realtime Database'de:

- `sikayetler/$id` = `{ metin, isim, tarih, uid? }` — **yazmak giriş istemez**, isim boşsa "Anonim". Kural yalnızca var olmayan bir düğüme yazmaya izin verir: bir kez yazılan şikayet tarayıcıdan ne değiştirilebilir ne silinebilir. Uygunsuz kaydı **Firebase konsolundan** sil.
- `sikayetler/$id/oylar/$uid` = `1` / `-1` — 👍/👎. Sayaç tutulmaz, oylar sayılarak hesaplanır; böylece kimse sayıyı şişiremez. Aynı düğmeye ikinci basış oyu geri çeker.
- `sikayetler/$id/yanitlar/$yid` = `{ uid, nick, metin, tarih }`
- `puanlar/$uid` = `1..6` — 6 yıldızlı puanlama, ortalama sayfada hesaplanır.

Oy, yanıt ve puan **giriş ister** (`hesap.js`) — uid olmadan aynı kişinin tekrar tekrar oy vermesi engellenemezdi. `tarih` alanları `serverTimestamp()` ile yazılır, kural `newData.val() == now` diye doğrular.

Yanıtlarda "GELİŞTİRİCİ" rozeti sayfanın başındaki `GELISTIRICI_UID` dizisindeki uid'lere çıkar; **varsayılan boştur**, kendi uid'ini konsolda `UzayHesap.kullanici().uid` ile öğrenip ekle. Sayfa coin vermez.

## UzayGPT

`uzaygpt/` — Claude API ile çalışan Türkçe sohbet asistanı (soru-cevap + görsel üretimi).

Site statik olduğu için API anahtarı tarayıcıya konulamaz; araya bir **Cloudflare Worker** girer. `uzaygpt/worker.js` bu Worker'ın kaynak kopyasıdır — `firebase-rules.json` gibi, **Cloudflare paneline elle yapıştırılmadan geçerli olmaz**. Anahtar orada `ANTHROPIC_API_KEY` adlı Secret olarak durur. Kurulum ve sorun giderme: `uzaygpt/KURULUM.md`.

- Model, hız sınırı, mesaj/token tavanları ve sistem talimatı `worker.js`'in en üstünde — tarayıcı bunları değiştiremez.
- `IZINLI_ADRESLER` listesi CORS allowlist'i; yeni alan adı eklenirse Worker yeniden deploy edilmeli. `localhost` yerel test için otomatik izinli.
- Sohbet Anthropic'in SSE akışını olduğu gibi tarayıcıya geçirir; `index.html` sadece `text_delta` parçalarını okur.
- Görsel: Claude Türkçe isteği İngilizce bir prompt'a çevirir, görseli ücretsiz `image.pollinations.ai` üretir (anahtar gerektirmez). Pollinations'ın metin API'si ücretlidir, kullanılmıyor.
- **Coin veremez ve bu kasıtlı**: sayfa `UzayHesap.odul()` çağrısı içermez, `hesap.js` yalnızca rozet için yüklenir. Model ne söylerse söylesin coin yazılmaz. Buraya bir ödül satırı eklenmemeli — sohbetle sınırsız coin üretilir.

## Test

Çok oyunculu oyunlar `multiplayer.js`'i, `hesap.js` de Firebase SDK'sını ES modülü olarak yükler; **`file://` ile açmak çalışmaz**, yerel sunucu gerekir (`npx serve` veya benzeri). `file://` ile açıldığında hesap rozeti hiç görünmez ve `UzayHesap` tanımsız kalır — oyun bundan etkilenmemeli. Tek bilgisayarda iki pencereyle test ederken pencereler yan yana ve tamamen görünür olmalı — arka plandaki sekmede Chrome `requestAnimationFrame`'i ~1 fps'e düşürür, bu ağ gecikmesi sanılır.

## Otomatik kontrol

`.claude/hooks/oyun-kontrol.js`, bir oyunun `index.html`'i her yazıldığında analytics satırını, Ana Sayfa butonunu, `lang="tr"`, viewport'u, HTML'de karşılığı olmayan `getElementById` çağrılarını ve `display:none` elemanı `style.display=''` ile açma hatasını denetler. Uyarı gelirse düzelt.

## Yeni oyun

`/new-game` skill'ini kullan — adım adım akış ve detaylar `.claude/skills/new-game/` altında.

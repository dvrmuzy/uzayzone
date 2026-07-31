# Uzay Zone

Statik oyun portalı. GitHub Pages'ten yayınlanır (`CNAME`), build adımı yoktur — dosyalar deposunda ne yazıyorsa tarayıcıda o çalışır.

## Yapı

- Her oyun kökte kendi klasöründe: `<klasor-adi>/index.html` (küçük harf, tireli, Türkçe karaktersiz)
- Ana sayfa `index.html` — oyun kartları içindeki `GAMES` array'inden üretilir
- Paylaşılan kök dosyalar: `analytics.js` (GA4), `multiplayer.js` + `firebase-config.js` (oda kodlu çok oyunculu), `destek.js`
- Oyun olmayan klasörler: `admin/`, `hediye/`, `logo/`

## Değişmezler

Mevcut bir oyunu düzenlerken de geçerli:

- **Tek dosya**: CSS ve JS oyunun `index.html`'i içinde inline. Harici dosya yalnızca kütüphane CDN'i ve `assets/`.
- **Türkçe**: `lang="tr"` ve tüm görünür metinler Türkçe.
- **Bağımsız**: Oyun, portal olmadan `<klasor>/index.html` açılarak da çalışmalı.
- **Her sayfada analytics**: `</head>` öncesinde `<script src="../analytics.js"></script>`. Measurement ID yalnız `analytics.js` içinde durur.
- **Her oyunda Ana Sayfa butonu**: `href="../"` ile sabit konumlu dönüş linki.
- **Mobil**: viewport meta + dokunmatik kontrol zorunlu.
- **npm/build yok**: Bağımlılık eklemek = bir CDN `<script>` etiketi.

## Test

Çok oyunculu oyunlar `multiplayer.js`'i ES modülü olarak yükler; **`file://` ile açmak çalışmaz**, yerel sunucu gerekir (`npx serve` veya benzeri). Tek bilgisayarda iki pencereyle test ederken pencereler yan yana ve tamamen görünür olmalı — arka plandaki sekmede Chrome `requestAnimationFrame`'i ~1 fps'e düşürür, bu ağ gecikmesi sanılır.

## Otomatik kontrol

`.claude/hooks/oyun-kontrol.js`, bir oyunun `index.html`'i her yazıldığında analytics satırını, Ana Sayfa butonunu, `lang="tr"`, viewport'u, HTML'de karşılığı olmayan `getElementById` çağrılarını ve `display:none` elemanı `style.display=''` ile açma hatasını denetler. Uyarı gelirse düzelt.

## Yeni oyun

`/new-game` skill'ini kullan — adım adım akış ve detaylar `.claude/skills/new-game/` altında.

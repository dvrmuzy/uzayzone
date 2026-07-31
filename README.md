# Uzay Zone 🚀

Tarayıcıda çalışan, kurulum gerektirmeyen Türkçe oyun portalı. 23 oyun, hepsi ücretsiz.

**[uzay.zone](https://uzay.zone)**

Altısı arkadaşınla uzaktan oynanabiliyor: bir oda kodu paylaşıyorsun, karşı taraf kendi bilgisayarından aynı oyuna giriyor.

## Oyunlar

| | Oyun | Tür |
|---|---|---|
| 🏍️ | [Neon Tron](neon-tron/) | 2 Kişilik / Aksiyon 🌐 |
| 🤼 | [Uzay Sumo](uzay-sumo/) | 2 Kişilik / Aksiyon 🌐 |
| 🎯 | [Tank Savaşı](tank-savasi/) | 2 Kişilik / Aksiyon 🌐 |
| 🏓 | [Uzay Ping-Pong](uzay-pingpong/) | 2 Kişilik / Arcade 🌐 |
| 🪙 | [Tıkla Kazan](tikla-kazan/) | Clicker / Eğlence |
| 🖥️ | [Bilgisayar Toplama](bilgisayar-toplama/) | 3D Eğitici / Bulmaca |
| 🛰️ | [Roket Görevi](roket-ucusu/) | 3D Simülasyon / Uzay |
| 🥊 | [Stickman Dövüş](stickman-dovus/) | Aksiyon / Dövüş 🌐 |
| 👨‍🍳 | [Süper Şef](super-sef/) | 3D Restoran / Yönetim |
| ⚔️ | [Mermi Kesici](mermi-kesici/) | 3D Aksiyon / Refleks |
| 🎆 | [Havai Fişek](havai-fisek/) | Festival / Rahatlatıcı |
| ⚗️ | [Simya](simya/) | Bulmaca / Keşif |
| 🌀 | [Helezon](helezon/) | 3D Arcade |
| 🏰 | [Mini Mimar](mini-mimar/) | 3D Yaratıcılık |
| 🌻 | [Hafıza Bahçesi](hafiza-bahcesi/) | Bulmaca / Hafıza |
| 🛸 | [Uzay Kaçışı](uzay-kacisi/) | 3D Aksiyon |
| 🚀 | [Yıldız Avcısı](yildiz-avcisi/) | Aksiyon / Uzay |
| 🏗️ | [Kule Yığını](kule-yigini/) | 3D Arcade |
| 💣 | [Araba Patlatma](araba-patlatma/) | Aksiyon / Arcade |
| 🏎️ | [Bilgi Yarışı](araba-yarisi/) | Eğitici / Arcade |
| ⭕ | [XOX](xox/) | Strateji 🌐 |
| 🏓 | [NEONBALL](neonball/) | Arcade |
| 🔥 | [Çöp Cümbüşü](kibrit-oyunu/) | Bulmaca |

🌐 = oda kodu ile arkadaşınla uzaktan oynanabilir

## Nasıl çalışıyor

Build adımı yok, paket yöneticisi yok, sunucu tarafı kod yok. Her oyun kendi klasöründe **tek bir `index.html`** — CSS ve JS dosyanın içinde. Kütüphane gerektiğinde (Three.js, Phaser, Matter.js) tek bir CDN `<script>` etiketiyle geliyor. Depoda ne yazıyorsa tarayıcıda o çalışıyor.

```
uzayzone/
├── index.html          # portal — kartlar GAMES array'inden üretilir
├── analytics.js        # ortak GA4
├── multiplayer.js      # oda kur/katıl + durum senkronu (Firebase Realtime DB)
├── firebase-config.js
├── <oyun-adi>/
│   ├── index.html      # oyunun tamamı
│   └── assets/         # varsa (CC0 / CC-BY)
└── admin/ hediye/ logo/
```

### Çok oyunculu

Kuran oyuncu 4 haneli bir oda kodu alır, karşı taraf kodu girer. İki desen var:

- **Sıra tabanlı** (XOX): oda durumu tek doğruluk kaynağı, iki taraf da odadan gelen güncellemeyle çizer.
- **Gerçek zamanlı** (ping-pong, sumo, tank, tron): oda kuran fiziği çalıştırıp ~20 Hz durum özeti yayınlar; katılan tarafta girdi gecikmesi yerel tahminle veya kendi nesnesinin sahipliğiyle gizlenir.

Firebase SDK'sı tembel yüklenir — çevrimiçi modu seçmeyen oyuncu hiç indirmez.

## Yerelde çalıştırma

Tek kişilik oyunlar için `index.html`'i çift tıklamak yeterli. Çok oyunculu oyunlar ES modülü kullandığı için **yerel sunucu gerekir**:

```bash
npx serve .
# http://localhost:3000
```

İki pencereyle test ederken pencereleri yan yana ve tamamen görünür tut — arka plandaki sekmede Chrome kare hızını ~1 fps'e düşürür, bu ağ gecikmesi sanılır.

## Yeni oyun ekleme

Depo [Claude Code](https://claude.com/claude-code) ile çalışacak şekilde ayarlı:

- `/new-game <oyun fikri>` — klasörü açar, oyunu yazar, portala kartını ekler, 2+ kişilikse çok oyunculu modu da kurar
- `.claude/hooks/oyun-kontrol.js` — her yazmadan sonra analytics, Ana Sayfa butonu, `lang="tr"`, viewport ve kopuk `getElementById` bağlantılarını denetler
- `CLAUDE.md` — projenin değişmezleri

Elle eklemek istersen: `<klasor-adi>/index.html` oluştur, `</head>` öncesine `<script src="../analytics.js"></script>` ve `</body>` öncesine `href="../"` dönüş linkini koy, sonra kök `index.html`'deki `GAMES` array'inin **sonuna** kartını ekle (kartlar ters sırada çizilir, son eklenen en başta ve "YENİ" rozetiyle çıkar).

## Lisans

Oyunların kodu bu depoya ait. `assets/` altındaki dosyalar CC0 veya CC-BY lisanslıdır; CC-BY olanların kaynağı ilgili oyunun HTML'inde yorum olarak belirtilmiştir.

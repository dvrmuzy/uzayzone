---
name: new-game
description: Uzay Zone portalına yeni bir oyun ekle. Yeni klasör oluşturur, oyunun index.html dosyasını yapar, ana sayfaya kart olarak ekler ve ana sayfaya dön butonu koyar. 2+ kişilik oyunlara oda kodu ile "Arkadaşınla Oyna" çok oyunculu modunu da ekler.
argument-hint: [oyun-açıklaması]
user-invocable: true
---

# Yeni Oyun Oluşturma Skill'i

Kullanıcı yeni bir oyun istediğinde aşağıdaki adımları **sırasıyla** uygula.

Detaylar `references/` altındaki dosyalarda. **Hepsini okuma** — her adımdaki koşula bak, yalnızca gerekeni oku. Yollar bu skill klasörüne göredir: `.claude/skills/new-game/references/<dosya>.md`

## Adım 1: Oyun Bilgilerini Belirle

Kullanıcının `$ARGUMENTS` ile verdiği açıklamadan şunları çıkar veya gerekirse sor:

- **Oyun adı** (Türkçe, kısa ve akılda kalıcı)
- **Klasör adı** (küçük harf, tire ile ayırmalı, Türkçe karakter olmadan. Örnek: `yilan-oyunu`)
- **Oyun türü/genre** (Bulmaca, Arcade, Strateji, Aksiyon, vb.)
- **Kısa açıklama** (portal kartı için, 1-2 cümle)
- **Emoji ikon** (oyunla ilişkili bir emoji)
- **Renk paleti** (oyunun temasına uygun ana renk, accent renk, glow renk)
- **Kaç kişilik?** — Adım 5'i bu belirler, şimdi karara bağla.

## Adım 2: Kütüphane Seçimi

Basit 2D bulmaca / kart / sıra tabanlı / DOM ağırlıklı oyunlarda **vanilla JS + Canvas** kal, referans dosyasını açma.

Sprite'lı arcade, fizik, 3D veya yüksek performans grafik gerekiyorsa → **oku:** `references/kutuphane-secimi.md` (kütüphane tablosu + CDN URL'leri)

## Adım 3: Asset Kararı

Önce şunlara bak — bunlar asset **gerektirmez**, kodla üret:

- Küçük SFX (atış, bip, vuruş, kazanma melodisi) → Web Audio API ile sentezle
- Geometrik şekiller, basit ikon → Canvas/SVG ile çiz
- Pattern, gradient, parçacık → procedural üret

Gerçekten sprite / 3D model / hazır ses gerekiyorsa → **oku:** `references/assetler.md` (CC0 kaynakları, indirme akışı, fallback)

## Adım 4: Oyun Dosyasını Oluştur

`<klasor-adi>/index.html` yaz. Kurallar:

- **Türkçe**: Tüm görünür metinler Türkçe (`lang="tr"`)
- **Responsive**: Mobil ve masaüstü uyumlu (viewport meta + media queries)
- **Tek HTML dosyası**: CSS ve JS inline (kütüphane CDN'i ve `assets/` dışında harici dosya yok)
- **Bağımsız çalışsın**: Portal olmadan da `<klasor>/index.html` doğrudan açılabilmeli
- **Kaliteli, cilalı, tam çalışır**: Yarım bırakma; HUD, oyun sonu, restart butonu, sesler dahil olsun
- **Performans**: Canvas tabanlı oyunlar için `requestAnimationFrame`; objeleri yeniden kullan (pool)
- **Erişilebilirlik**: Klavye + dokunma kontrolü; renk körü dostu kontrast
- **Oyun durumu görünür**: Skor, can, seviye, süre, ilerleme HUD'da
- **Web Audio** ses sentezi her zaman ekle (kütüphanenin kendi audio'su yerine de kullanabilirsin)
- **Zorluk seviyeleri** (Kolay/Orta/Zor) genelde değer katar — uygunsa ekle, seçim `localStorage`'da saklansın

Analytics satırı, `hesap.js` + coin ödülü ve Ana Sayfa butonu zorunlu → **oku:** `references/portal-entegrasyon.md`

## Adım 5: Çok Oyunculu — "Arkadaşınla Oyna"

**Oyun 2+ kişilikse ZORUNLU** (aynı ekranda iki oyuncu, sıra tabanlı, düello, vb.) — atlanırsa oyun eksik sayılır.
**Tek kişilikse** (skor koşusu, bulmaca, endless runner) bu adımı tamamen atla.

2+ kişilikse → **oku:** `references/coklu-oyuncu.md` (`multiplayer.js` API'si, sıra tabanlı vs gerçek zamanlı desen, arayüz paneli, sık hatalar)

## Adım 6: Ana Sayfaya Kart Ekle

`index.html` içindeki `GAMES` array'inin **sonuna** yeni oyun objesini ekle — kart otomatik olarak listenin başında ve "YENİ" rozetiyle çıkar.

Obje şeması ve renk türetme → `references/portal-entegrasyon.md` (Adım 4'te zaten okuduysan tekrar açma)

## Adım 7: Doğrulama

`oyun-kontrol.js` hook'u analytics satırını, Ana Sayfa butonunu, `lang="tr"`, viewport ve çok oyunculu panel ID'lerini yazma sonrası otomatik denetler — uyarı gelirse düzelt. Sen şunlara bak:

1. Klasör (`<klasor-adi>/`) ve `index.html` oluşturuldu mu
2. Asset indirildiyse `<klasor-adi>/assets/` altında doğru yolda mı
3. Kütüphane CDN'i doğru ve güncel mi
4. Oyun bağımsız çalışıyor mu (mantık hatası, asset yükleme hatası yok mu)
5. `index.html` GAMES array'ine kart eklendi mi
5b. `hesap.js` içindeki `ODUL` tablosuna oyunun satırı eklendi mi (yoksa coin kazanılmaz)
6. Kullanıcıya oyunu tarayıcıda test etmesini söyle, ana sayfa URL'sini hatırlat — çok oyunculu eklendiyse **yerel sunucu gerektiğini** de belirt

## Mevcut Oyun Referansları

Bir deseni nasıl uyguladığını görmek için:

- `kibrit-oyunu/` — vanilla bulmaca
- `neonball/` — vanilla arcade
- `yildiz-avcisi/` — vanilla 2D shooter
- `hafiza-bahcesi/` — DOM card flip
- `kule-yigini/`, `uzay-kacisi/`, `mini-mimar/` — Three.js 3D
- `xox/` — sıra tabanlı çok oyunculu
- `uzay-pingpong/`, `neon-tron/` — katılan kendi nesnesinin sahibi
- `uzay-sumo/`, `tank-savasi/` — yerel tahmin + düzeltme (`tank-savasi` ayrıca bozulabilir harita)
- `stickman-dovus/` — senkron lobi + silah seçimi

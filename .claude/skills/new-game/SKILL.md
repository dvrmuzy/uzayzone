---
name: new-game
description: Uzay Zone portalına yeni bir oyun ekle. Yeni klasör oluşturur, oyunun index.html dosyasını yapar, ana sayfaya kart olarak ekler ve ana sayfaya dön butonu koyar.
argument-hint: [oyun-açıklaması]
user-invocable: true
---

# Yeni Oyun Oluşturma Skill'i

Kullanıcı yeni bir oyun istediğinde aşağıdaki adımları **sırasıyla** uygula:

## Adım 1: Oyun Bilgilerini Belirle

Kullanıcının `$ARGUMENTS` ile verdiği açıklamadan şunları çıkar veya gerekirse sor:
- **Oyun adı** (Türkçe, kısa ve akılda kalıcı)
- **Klasör adı** (küçük harf, tire ile ayırmalı, Türkçe karakter olmadan. Örnek: `yilan-oyunu`)
- **Oyun türü/genre** (Bulmaca, Arcade, Strateji, Aksiyon, vb.)
- **Kısa açıklama** (portal kartı için, 1-2 cümle)
- **Emoji ikon** (oyunla ilişkili bir emoji)
- **Renk paleti** (oyunun temasına uygun ana renk, accent renk, glow renk)

## Adım 2: Motor / Kütüphane Seçimi

Oyun türüne göre **en uygun aracı** seç. Tek bir CDN `<script>` etiketiyle ekle — npm/build adımı yok, hepsi browser-ready. Birden fazla kütüphane gerekirse birleştirebilirsin (örn. PixiJS + Matter.js).

| Tür | Önerilen | Neden |
|---|---|---|
| Basit 2D bulmaca, kart, sıra-tabanlı, kullanıcı arayüzü ağırlıklı | **Vanilla JS + Canvas/DOM** | Küçük, hızlı, bağımlılık yok |
| 2D arcade / platformer / shooter / RPG (sprite, fizik, sahne yönetimi) | **Phaser 3** | Hazır sahne, sprite, tween, arcade/matter fizik, input |
| 2D yüksek performans grafik (binlerce parçacık, shader efektleri) | **PixiJS** | WebGL renderer — Phaser daha framework, Pixi daha grafik |
| 2D fizik bulmaca (sapan, blok yığma, ragdoll, kumaş) | **Matter.js** (Canvas veya Pixi ile) | Saf 2D rigid body fizik motoru |
| 3D oyun / voxel editör / düşük poligon dünya / atış | **Three.js** | En geniş ekosistem, hızlı sahne kurulumu |
| 3D ileri (PBR, fizik, post-process, hazır kamera/giriş) | **Babylon.js** | Built-in fizik, ışık & kameralar, sahne inspector |

**CDN URL'leri** (script tag olarak ekle, `</head>`'den önce veya `</body>`'den hemen önce):

```html
<!-- Three.js -->
<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
<!-- Three.js GLTFLoader (3D model yüklemek için) -->
<script src="https://unpkg.com/three@0.160.0/examples/js/loaders/GLTFLoader.js"></script>

<!-- Babylon.js (çekirdek + loaders) -->
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>

<!-- Phaser 3 -->
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>

<!-- PixiJS v8 -->
<script src="https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.js"></script>

<!-- Matter.js -->
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
```

CDN her zaman erişilebilir olmayabilir — basit oyunlarda kütüphane gereksizse Vanilla JS'i tercih et.

## Adım 3: Ücretsiz Asset Kullanımı

Oyunun görsel/işitsel kalitesini artırmak için **ücretsiz CC0 / CC-BY lisanslı asset**'ler indir ve kullan. Tüm assetler oyun klasörü altında `assets/` alt klasörüne koyulmalı.

### Önerilen kaynaklar (telif derdi yok)

| Tür | Kaynak | Lisans |
|---|---|---|
| 2D sprite, ses, UI ikon paketleri | **kenney.nl/assets** | CC0 (kamu malı) |
| Geniş çeşitlilik 2D/3D/ses | **opengameart.org** | CC0 / CC-BY (lisansı oku) |
| Düşük poligon 3D model (GLB) | **quaternius.com** | CC0 |
| 3D model arama motoru | **poly.pizza** | CC0 / CC-BY (filtrele) |
| Ses efektleri | **freesound.org** | CC0 / CC-BY (filtrele) |
| Royalty-free görsel/ses | **pixabay.com** | Pixabay Lisansı (free) |
| Yazı tipleri | **fonts.google.com** | Open Font License |

### Asset indirme akışı

1. Oyunun ne tür asset'e ihtiyacı olduğunu belirle (ör. "uçak sprite + patlama sesi", "ağaç GLB modeli + yaprak doku")
2. Yukarıdaki kaynaklardan **CC0 veya CC-BY** olan doğrudan indirme URL'lerini bul
3. `curl` veya `Invoke-WebRequest` ile `<oyun-klasoru>/assets/` altına indir:
   ```powershell
   New-Item -ItemType Directory -Force <oyun-klasoru>/assets | Out-Null
   Invoke-WebRequest -Uri "<doğrudan-url>" -OutFile "<oyun-klasoru>/assets/<dosya>"
   ```
   veya bash ortamında:
   ```bash
   mkdir -p <oyun-klasoru>/assets
   curl -L "<doğrudan-url>" -o <oyun-klasoru>/assets/<dosya>
   ```
4. Asset'leri relatif yolla kullan (`./assets/ship.png`, `./assets/hit.ogg`)
5. **CC-BY** ise oyun HTML'ine bir kredi yorumu ekle:
   ```html
   <!-- Assets: "Ship Sprite" by [Yazar] from kenney.nl (CC-BY 3.0) -->
   ```

### Asset kullanmama kuralı

- **Küçük SFX (atış, bip, vuruş, kazanma melodisi):** Web Audio API ile sentezle — indirme yok
- **Geometrik şekiller (top, kare, dikdörtgen, basit ikon):** Canvas/SVG ile çiz — indirme yok
- **Procedural pattern, gradient, parçacık:** Kod ile üret — indirme yok
- **Sprite/3D model gerekiyorsa, "asset olmadan ucuz görünür" durumda:** İndir
- **Asset boyut hedefi:** Toplam `assets/` < ~5 MB; 4K texture ve büyük müzik indirme

### Asset yükleme güvenliği

İndirme başarısız olabilir veya çevrimdışı oyna senaryosu olabilir. Asset yüklenirken:
- `Image.onerror` / `loader.onError` ile geri-düş (fallback) — renkli dikdörtgen, emoji vb.
- Yükleme bekleme ekranı göster (progress bar veya "Yükleniyor...")
- Hata durumunda kullanıcıya net mesaj

## Adım 4: Oyun Dosyasını Oluştur

`uzayzone/<klasor-adi>/index.html` yaz. Aşağıdaki kurallara uy:

- **Türkçe**: Tüm görünür metinler Türkçe (`lang="tr"`)
- **Responsive**: Mobil ve masaüstü uyumlu (viewport meta + media queries)
- **Tek HTML dosyası**: CSS ve JS inline (kütüphane CDN'i ve `assets/` dışında harici dosya yok)
- **Bağımsız çalışsın**: Portal olmadan da `<klasor>/index.html` doğrudan açılabilmeli
- **Kaliteli, cilalı, tam çalışır**: Yarım bırakma; HUD, oyun sonu, restart butonu, sesler dahil olsun
- **Performans**: Canvas tabanlı oyunlar için `requestAnimationFrame`; objeleri yeniden kullan (pool)
- **Erişilebilirlik**: Klavye kontrolü + dokunma kontrolü; renk körü dostu kontrast

### Google Analytics (Zorunlu)

Her oyun sayfası, portalın ortak Google Analytics (GA4) kodunu yükleyen paylaşılan dosyayı içermeli. Oyunun `</head>` tagından hemen önce şu satırı ekle:

```html
<script src="../analytics.js"></script>
```

- Dosya kök dizindeki `uzayzone/analytics.js`'tir; oyun klasörü bir seviye altta olduğu için **`../analytics.js`** şeklinde relatif yol kullan.
- Ölçüm Kimliği (Measurement ID) tek yerde — `analytics.js` içinde — tutulur, sayfalara tekrar yazma.
- Bu satırı **tüm yeni oyunlara** eklemeyi unutma; eksikse o oyunun ziyaretleri analitiğe düşmez.

### Ana Sayfaya Dön Butonu

Oyunun `</body>` tagından hemen önce şu butonu ekle (renkleri oyunun temasına uyarla):

```html
<a href="../index.html" style="position:fixed;top:16px;left:16px;z-index:9999;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(0,0,0,0.55);color:OYUN_TEXT_RENGI;font-family:OYUN_FONT_FAMILY;font-size:0.85rem;font-weight:700;border-radius:30px;text-decoration:none;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);transition:background 0.3s,transform 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)';this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(0,0,0,0.55)';this.style.transform='scale(1)'">&#8592; Ana Sayfa</a>
```

Butonun `color` ve `font-family` değerlerini oyunun temasına göre ayarla. Buton sabit kalmalı, oynanışı engellemeyecek konumda olmalı (mobilde alt kısma da alabilirsin).

## Adım 5: Ana Sayfaya Kart Ekle

`uzayzone/index.html` dosyasındaki `GAMES` JavaScript array'ine yeni oyun objesini ekle.

```javascript
const GAMES = [
  {
    title: 'Oyun Adı',
    genre: 'Tür',
    desc: 'Kısa açıklama.',
    href: 'klasor-adi/index.html',
    icon: '🎮',
    colors: {
      bg: 'linear-gradient(135deg, #renk1, #renk2)',
      accent: '#accent-renk',
      glow: 'rgba(r,g,b,0.15)',
      bar: 'linear-gradient(90deg, #renk1, #renk2)',
      border: 'rgba(r,g,b,0.15)'
    }
  },
  // ... diğer oyunlar
];
```

Yeni oyun objesini array'in **sonuna** ekle (son `]` kapanışından önce). Renkleri oyunun temasından türet:
- `bg`: Oyunun arka plan renklerinin koyu versiyonu (uzay portalında iyi görünmesi için)
- `accent`: Oyunun en belirgin vurgu rengi
- `glow`: Accent rengin düşük opaklıklı rgba versiyonu
- `bar`: Oyunun 2 ana renginden oluşan gradient
- `border`: Accent rengin düşük opaklıklı rgba versiyonu

### Sıralama ve "YENİ" Vurgusu (Otomatik)

Ana sayfada kartlar `renderCards()` ile **ters sırada** gösterilir: array'in **sonuna** eklenen oyun listede **en başta** gözükür. Yani yeni oyunu sona eklemen yeterli — otomatik olarak en üstte çıkar.

Array'in **son `NEW_COUNT` (varsayılan 2)** oyunu otomatik olarak `is-new` sınıfını alır:
- Köşede animasyonlu **"YENİ" rozeti** gösterilir
- Karta **dikkat çekici, nabız gibi atan accent renkli border** (`newRing` animasyonu) eklenir

Bunlar için ekstra bir şey yapmana gerek yok; sadece yeni oyunu array'in sonuna ekle. Böylece son eklenen 2 oyun her zaman "YENİ" olarak işaretli kalır, daha eskiler otomatik olarak normale döner. Kaç oyunun "YENİ" sayılacağını değiştirmek istersen `index.html` içindeki `const NEW_COUNT = 2;` değerini güncelle.

## Adım 6: Doğrulama

Bitirdikten sonra şunları kontrol et:

1. Yeni klasör (`<klasor-adi>/`) ve `index.html` oluşturuldu mu
2. Asset indirildi ise `<klasor-adi>/assets/` altında doğru yolda mı
3. Kütüphane CDN'i doğru ve güncel mi (`<script src="...">`)
4. Oyun bağımsız çalışıyor mu (mantık hatası, asset yükleme hatası yok mu)
5. Ana sayfaya dön butonu oyunda görünüyor mu
6. `<script src="../analytics.js"></script>` oyunun `</head>` öncesine eklendi mi (Google Analytics)
7. `uzayzone/index.html` GAMES array'ine kart eklendi mi
8. Kullanıcıya oyunu tarayıcıda test etmesini söyle, ana sayfa URL'sini hatırlat

## Önemli Notlar

- **Mevcut oyun referansları:** `kibrit-oyunu/` (vanilla bulmaca), `neonball/` (vanilla arcade), `xox/` (vanilla), `kule-yigini/` (Three.js 3D), `yildiz-avcisi/` (vanilla 2D shooter), `uzay-kacisi/` (Three.js 3D dodger), `mini-mimar/` (Three.js voxel editör), `hafiza-bahcesi/` (DOM card flip)
- **Karmaşıklığı isteğe göre ayarla** ama her zaman **tam çalışır** olsun — yarım bırakma
- **Web Audio** ses sentezi her zaman ekle (kütüphanenin kendi audio'su yerine de kullanabilirsin) — atış, vuruş, kazanma melodisi
- **Oyun durumu görünür**: Skor, can, seviye, süre, ilerleme HUD'da
- **Mobil dokunmatik:** Tüm oyunlarda touch events ile çalışmalı; sürükle/tap'leri test et
- **Zorluk seviyeleri** (Kolay/Orta/Zor) genelde değer katar — uygunsa ekle, seçim localStorage'da saklansın
- **Lisans:** İndirilen her CC-BY asset için HTML'de kredi yorumu bırak; CC0 için gerekmez ama not düşmek temiz olur
- **Sınır:** Bir oyunda en fazla **1-2 kütüphane** kullan; gereksizse vanilla kal

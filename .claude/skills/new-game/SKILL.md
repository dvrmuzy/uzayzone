---
name: new-game
description: Uzay Zone portalına yeni bir oyun ekle. Yeni klasör oluşturur, oyunun index.html dosyasını yapar, ana sayfaya kart olarak ekler ve ana sayfaya dön butonu koyar. 2+ kişilik oyunlara oda kodu ile "Arkadaşınla Oyna" çok oyunculu modunu da ekler.
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
<a href="../" style="position:fixed;top:16px;left:16px;z-index:9999;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(0,0,0,0.55);color:OYUN_TEXT_RENGI;font-family:OYUN_FONT_FAMILY;font-size:0.85rem;font-weight:700;border-radius:30px;text-decoration:none;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);transition:background 0.3s,transform 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)';this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(0,0,0,0.55)';this.style.transform='scale(1)'">&#8592; Ana Sayfa</a>
```

Butonun `color` ve `font-family` değerlerini oyunun temasına göre ayarla. Buton sabit kalmalı, oynanışı engellemeyecek konumda olmalı (mobilde alt kısma da alabilirsin).

## Adım 5: Çok Oyunculu — "Arkadaşınla Oyna" (2+ kişilik oyunlarda ZORUNLU)

Oyun **2 veya daha fazla kişiyle** oynanabiliyorsa (aynı ekranda iki oyuncu, sıra tabanlı, düello, vb.) mutlaka **oda kodu ile uzaktan oynama** modunu da ekle. İki arkadaş farklı bilgisayarlardan 4 haneli kod paylaşarak aynı oyuna girer.

Tek kişilik oyunlarda (skor koşusu, bulmaca, endless runner) bu adımı **atla**.

### Altyapı

Kök dizindeki paylaşılan modülü kullan — her oyun için yeniden yazma:

- `multiplayer.js` — oda kur/katıl, durum senkronu, bağlantı takibi (Firebase Realtime Database)
- `firebase-config.js` — yapılandırma (hazır, dokunma)
- `firebase-rules.json` — güvenlik kuralları (referans)

**Firebase SDK'sını tembel yükle** — yalnızca kullanıcı çevrimiçi modu seçince inmeli, normal oynayanlar indirmemeli:

```js
let Net = null;
async function loadNet() {
  if (!Net) Net = await import('../multiplayer.js');
  return Net;
}
```

Modülün API'si:

```js
const kod  = await Net.createRoom('klasor-adi', { ...başlangıçDurumu });  // kuran = 'X'
const oda  = await Net.joinRoom('klasor-adi', 'ABCD');                    // katılan = 'O'
Net.onRoom(oda => { ... });          // tüm odayı dinle (sıra tabanlı oyunlar)
Net.onChild('snap', s => { ... });   // tek dalı dinle (gerçek zamanlı — çok daha ucuz)
Net.patch({ alan: değer });          // birden fazla alanı güncelle
Net.setChild('snap', metin);         // tek dalı yaz
Net.leave();
```

### İki desen — oyunun türüne göre seç

**A) Sıra tabanlı** (XOX, dama, kelime oyunu, kart oyunu)

Oda durumu **tek doğruluk kaynağıdır**. Hamle yapan oyuncu yerel durumu değiştirmez; doğrudan odaya yazar. Ekranı **iki taraf da odadan gelen güncellemeyle** çizer. Böylece durum ayrışması imkânsız hale gelir.

Skor gibi biriken değerleri **yalnızca oda kuran** yazsın (iki taraf da yazarsa çift sayılır). Referans: `xox/index.html`.

**B) Gerçek zamanlı** (dövüş, yarış, top oyunu, nişancı)

**Host-otoriteli** kur: oda kuran fiziğin tamamını çalıştırıp ~20 Hz durum özeti yayınlar; katılan fizik çalıştırmaz, girdisini yollayıp gelen durumu yumuşatarak çizer.

Durum özetini **virgülle ayrılmış sayı dizisi** olarak paketle (JSON değil) — 50-200 bayt aralığında kalır, saniyede 20 kez göndermek ~1-2 KB/sn eder. Konumları `Math.round(v*10)/10` ile yuvarla.

Katılan taraftaki girdi gecikmesini gizlemek şart, yoksa oyun "gecikmeli" hissettirir. İki yöntem:

1. **Katılan kendi nesnesinin sahibi olsun** — nesnenin hareketi rakiple etkileşmiyor ise (ping-pong raketi, tron motorunun yolu gibi) katılan onu tamamen yerelde sürüp **konumunu / geçtiği hücreleri** yollasın, host bunları olduğu gibi işleyip yalnızca hakemlik yapsın. En temizi, sıfır gecikme. Referans: `uzay-pingpong/index.html`, `neon-tron/index.html`
2. **Yerel tahmin + orantılı düzeltme** — nesne rakiple çarpışıyorsa (sumo savaşçısı, tank gibi) katılan aynı hareket fonksiyonunu yerelde çalıştırsın, otoritenin sonucuyla arasındaki hatayı büyüklüğüne göre kapatsın: küçük sapma %5, çarpışma %40, ışınlanma anında. Yalnız **hareketi** tahmin et; ateş etme, hasar ve toplama otoritede kalsın, yoksa iki tarafta ayrı mermi/puan oluşur. Referans: `uzay-sumo/index.html`, `tank-savasi/index.html`

**Dikkat:** Durum özetini oyun *bittiğinde de* göndermeye devam et. Yalnızca "oynanıyor" durumunda gönderirsen katılan oyuncu oyunun bittiğini hiç öğrenemez.

**Bozulabilir dünya** (yıkılan duvar, değişen labirent, rastgele harita) varsa bunu özetin içine koyma — ayrı bir dalda, yalnız değiştiğinde ve kısıtlanmış sıklıkta yolla. Referans: `tank-savasi/index.html` (`map` dalı).

**Lobi de senkronlanmalı** — oyun başlamadan önce karakter/silah/hazır seçimi varsa bunlar da odada tutulmalı; her oyuncu yalnızca kendi yuvasını düzenleyebilmeli ve maçı oda kuran başlatmalı. Referans: `stickman-dovus/index.html`

Sesleri ve parçacıkları katılan tarafta **durum farkından türet** (hasar arttı → vuruş sesi, skor arttı → sayı sesi); ayrıca olay göndermeye gerek yok.

### Arayüz düzeni (tüm oyunlarda aynı olsun)

Mod seçim satırına üçüncü düğme: `🌐 ARKADAŞINLA`. Seçilince oyunun başlat düğmesi gizlenir, yerine şu panel çıkar:

```html
<div id="online-wrap">
  <div class="row">
    <button id="net-create">🆕 ODA KUR</button>
    <button id="net-showjoin">🔑 KODA KATIL</button>
  </div>
  <div id="net-join-row">
    <input id="net-code-in" maxlength="4" placeholder="––––" autocomplete="off" spellcheck="false" />
    <button id="net-join">KATIL</button>
  </div>
  <div id="net-code-box">
    <div class="lbl">ODA KODUN</div><div id="net-code">––––</div>
    <button id="net-copy">📋 KOPYALA</button>
  </div>
  <div id="net-status"></div>
</div>
```

Oyun alanının köşesine bağlantı rozeti koy: yeşil/kırmızı nokta + rol ("SEN: OYUNCU 2") + katılan tarafta ölçülen **ms gecikme**. Gecikmeyi gerçekten ölç — katılanın girdisine sıra numarası koy, host özette geri yansıtsın, katılan kendi saatiyle gidiş-dönüşü hesaplasın.

### Sık yapılan hatalar

- **CSS'te `display:none` olan paneli `style.display = ''` ile açma** — bu inline stili siler ve eleman CSS kuralına geri düşerek gizli kalır. `classList.toggle('on')` + `#panel.on { display: flex }` kullan.
- Kod girme kutusunda `keydown` olayına `e.stopPropagation()` ekle, yoksa yazarken oyunun tuş kısayolları tetiklenir.
- Çevrimiçi modda **duraklatmayı kapat** (tek taraflı duraklatma diğerini dondurur) ve **yeni maçı yalnızca oda kuran başlatabilsin**.
- Katılan oyuncu kendi bilgisayarında yalnız olduğu için **her iki tuş takımını da** (WASD ve oklar) kendi karakteri için kabul et.
- Oda kodu üretirken karıştırılan karakterleri çıkar (`0/O`, `1/I/L`) — modül bunu zaten yapıyor.

### Test uyarısı (kullanıcıya mutlaka söyle)

ES modülü kullanıldığı için dosyayı çift tıklayarak (`file://`) açmak **çalışmaz**; yerel sunucu gerekir. Ayrıca tek bilgisayarda iki pencereyle test ederken pencereler **yan yana ve tamamen görünür** olmalı — Chrome arkada kalan sekmelerde `requestAnimationFrame`'i saniyede ~1 kareye düşürür ve bu gecikme sanılır.

## Adım 6: Ana Sayfaya Kart Ekle

`uzayzone/index.html` dosyasındaki `GAMES` JavaScript array'ine yeni oyun objesini ekle.

```javascript
const GAMES = [
  {
    title: 'Oyun Adı',
    genre: 'Tür',
    desc: 'Kısa açıklama.',
    href: 'klasor-adi/',
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

## Adım 7: Doğrulama

Bitirdikten sonra şunları kontrol et:

1. Yeni klasör (`<klasor-adi>/`) ve `index.html` oluşturuldu mu
2. Asset indirildi ise `<klasor-adi>/assets/` altında doğru yolda mı
3. Kütüphane CDN'i doğru ve güncel mi (`<script src="...">`)
4. Oyun bağımsız çalışıyor mu (mantık hatası, asset yükleme hatası yok mu)
5. Ana sayfaya dön butonu oyunda görünüyor mu
6. `<script src="../analytics.js"></script>` oyunun `</head>` öncesine eklendi mi (Google Analytics)
7. **2+ kişilik oyunsa** "🌐 ARKADAŞINLA" modu eklendi mi; panel açılıyor mu (`classList.toggle('on')` kullanıldı mı), Firebase tembel yükleniyor mu, referans verilen ID'lerin hepsi HTML'de var mı
8. `uzayzone/index.html` GAMES array'ine kart eklendi mi
9. Kullanıcıya oyunu tarayıcıda test etmesini söyle, ana sayfa URL'sini hatırlat — çok oyunculu eklendiyse **yerel sunucu gerektiğini** de belirt

## Önemli Notlar

- **Mevcut oyun referansları:** `kibrit-oyunu/` (vanilla bulmaca), `neonball/` (vanilla arcade), `xox/` (vanilla + **sıra tabanlı çok oyunculu**), `kule-yigini/` (Three.js 3D), `yildiz-avcisi/` (vanilla 2D shooter), `uzay-kacisi/` (Three.js 3D dodger), `mini-mimar/` (Three.js voxel editör), `hafiza-bahcesi/` (DOM card flip), `uzay-sumo/` (**gerçek zamanlı çok oyunculu, yerel tahmin**), `uzay-pingpong/` (**katılan kendi raketinin sahibi**), `tank-savasi/` (**bozulabilir harita ayrı dalda**), `neon-tron/` (**ızgara adımları delta olarak**), `stickman-dovus/` (**senkron lobi + silah seçimi**)
- **Çok oyunculu:** Oyun 2+ kişilikse Adım 5 zorunludur — atlanırsa oyun eksik sayılır
- **Karmaşıklığı isteğe göre ayarla** ama her zaman **tam çalışır** olsun — yarım bırakma
- **Web Audio** ses sentezi her zaman ekle (kütüphanenin kendi audio'su yerine de kullanabilirsin) — atış, vuruş, kazanma melodisi
- **Oyun durumu görünür**: Skor, can, seviye, süre, ilerleme HUD'da
- **Mobil dokunmatik:** Tüm oyunlarda touch events ile çalışmalı; sürükle/tap'leri test et
- **Zorluk seviyeleri** (Kolay/Orta/Zor) genelde değer katar — uygunsa ekle, seçim localStorage'da saklansın
- **Lisans:** İndirilen her CC-BY asset için HTML'de kredi yorumu bırak; CC0 için gerekmez ama not düşmek temiz olur
- **Sınır:** Bir oyunda en fazla **1-2 kütüphane** kullan; gereksizse vanilla kal

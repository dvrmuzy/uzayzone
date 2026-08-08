# Portal Entegrasyonu

Her yeni oyunun portala bağlanması için gereken dört parça: analytics, hesap/coin, Ana Sayfa butonu, `GAMES` kartı.

## 1. Google Analytics (zorunlu)

Oyunun `</head>` tagından hemen önce:

```html
<script src="../analytics.js"></script>
```

- Dosya kök dizindeki `analytics.js`'tir; oyun klasörü bir seviye altta olduğu için **`../analytics.js`** şeklinde relatif yol kullan.
- Ölçüm Kimliği (Measurement ID) tek yerde — `analytics.js` içinde — tutulur, sayfalara tekrar yazma.
- Eksikse o oyunun ziyaretleri analitiğe düşmez. `oyun-kontrol.js` hook'u bunu yakalar.

## 2. Hesap ve Uzay Coin (zorunlu)

Oyunun `</head>` tagından hemen önce, analytics satırının yanına:

```html
<script src="../hesap.js" defer></script>
```

Bu, sağ üst köşeye giriş/nickname/coin rozetini ekler ve `window.UzayHesap` arayüzünü açar.

Sonra **oyun bittiği yerde** — mevcut `localStorage` en-iyi-skor kaydının hemen yanında — tek satır:

```javascript
window.UzayHesap?.odul('klasor-adi', skor);
```

- `?.` şart: `file://` ile açıldığında veya Firebase ulaşılamazsa `UzayHesap` hiç tanımlanmaz, oyun yine de çalışmalı.
- Sadece **oyun bitişinde bir kez** çağır — her karede değil.
- Mevcut `localStorage` best mantığını **kaldırma**; giriş yapmayan oyuncu için o çalışmaya devam eder.
- Son adım: kök dizindeki **`hesap.js` içindeki `ORAN` tablosuna** oyunun satırını ekle, yoksa `odul()` uyarı basıp 0 döner:

```javascript
const ORAN = {
  ...
  'klasor-adi': s => s / 60      // iyi bir oyun ~30–120 coin getirmeli
};
```

Denge ölçüsü: tek ödül tavanı 250, günlük toplam tavanı 1000 coin. Oranı, ortalama bir oyuncunun bir turda 30–120 coin alacağı şekilde seç — skoru binlerle giden oyunlarda böl (`s / 60`), onlarla giden oyunlarda çarp (`s * 5`).

## 3. Ana Sayfaya Dön butonu

Oyunun `</body>` tagından hemen önce:

```html
<a href="../" style="position:fixed;top:16px;left:16px;z-index:9999;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(0,0,0,0.55);color:OYUN_TEXT_RENGI;font-family:OYUN_FONT_FAMILY;font-size:0.85rem;font-weight:700;border-radius:30px;text-decoration:none;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);transition:background 0.3s,transform 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)';this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(0,0,0,0.55)';this.style.transform='scale(1)'">&#8592; Ana Sayfa</a>
```

`color` ve `font-family` değerlerini oyunun temasına göre ayarla. Buton sabit kalmalı, oynanışı engellemeyecek konumda olmalı (mobilde alt kısma da alabilirsin).

## 4. Ana sayfa kartı

`index.html` dosyasındaki `GAMES` JavaScript array'ine yeni oyun objesini ekle:

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

### Sıralama ve "YENİ" vurgusu (otomatik)

Ana sayfada kartlar `renderCards()` ile **ters sırada** gösterilir: array'in **sonuna** eklenen oyun listede **en başta** gözükür. Yani yeni oyunu sona eklemen yeterli — otomatik olarak en üstte çıkar.

Array'in **son `NEW_COUNT` (şu an 3)** oyunu otomatik olarak `is-new` sınıfını alır:

- Köşede animasyonlu **"YENİ" rozeti** gösterilir
- Karta **nabız gibi atan accent renkli border** (`newRing` animasyonu) eklenir

Bunlar için ekstra bir şey yapmana gerek yok. Kaç oyunun "YENİ" sayılacağını değiştirmek istersen `index.html` içindeki `const NEW_COUNT = 2;` değerini güncelle.

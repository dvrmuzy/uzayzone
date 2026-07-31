# Portal Entegrasyonu

Her yeni oyunun portala bağlanması için gereken üç parça: analytics, Ana Sayfa butonu, `GAMES` kartı.

## 1. Google Analytics (zorunlu)

Oyunun `</head>` tagından hemen önce:

```html
<script src="../analytics.js"></script>
```

- Dosya kök dizindeki `analytics.js`'tir; oyun klasörü bir seviye altta olduğu için **`../analytics.js`** şeklinde relatif yol kullan.
- Ölçüm Kimliği (Measurement ID) tek yerde — `analytics.js` içinde — tutulur, sayfalara tekrar yazma.
- Eksikse o oyunun ziyaretleri analitiğe düşmez. `oyun-kontrol.js` hook'u bunu yakalar.

## 2. Ana Sayfaya Dön butonu

Oyunun `</body>` tagından hemen önce:

```html
<a href="../" style="position:fixed;top:16px;left:16px;z-index:9999;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(0,0,0,0.55);color:OYUN_TEXT_RENGI;font-family:OYUN_FONT_FAMILY;font-size:0.85rem;font-weight:700;border-radius:30px;text-decoration:none;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);transition:background 0.3s,transform 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)';this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(0,0,0,0.55)';this.style.transform='scale(1)'">&#8592; Ana Sayfa</a>
```

`color` ve `font-family` değerlerini oyunun temasına göre ayarla. Buton sabit kalmalı, oynanışı engellemeyecek konumda olmalı (mobilde alt kısma da alabilirsin).

## 3. Ana sayfa kartı

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

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

## Adım 2: Oyun Klasörünü ve Dosyasını Oluştur

`D:/uzay_projects/uzayzone` altında yeni klasör oluştur ve içine `index.html` yaz.

Oyun dosyası şu kurallara uymalı:
- **Tek dosya**: Tüm CSS ve JS inline olmalı (harici dosya yok)
- **Türkçe**: Tüm metinler Türkçe olmalı
- **Responsive**: Mobil ve masaüstü uyumlu
- **Web Audio API**: Ses efektleri için Web Audio API kullan (harici ses dosyası yok)
- **`lang="tr"`**: HTML lang attribute Türkçe olmalı
- **Kaliteli**: Oyun tam çalışır, cilalı ve eğlenceli olmalı

### Ana Sayfaya Dön Butonu

Oyunun `</body>` tagından hemen önce şu butonu ekle (renkleri oyunun temasına uyarla):

```html
<a href="../index.html" style="position:fixed;top:16px;left:16px;z-index:9999;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(0,0,0,0.55);color:OYUN_TEXT_RENGI;font-family:OYUN_FONT_FAMILY;font-size:0.85rem;font-weight:700;border-radius:30px;text-decoration:none;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);transition:background 0.3s,transform 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)';this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(0,0,0,0.55)';this.style.transform='scale(1)'">&#8592; Ana Sayfa</a>
```

Butonun `color` ve `font-family` değerlerini oyunun kendi temasına göre ayarla. Buton oyunun üstünde sabit durmalı, oynanışı engellememelidir.

## Adım 3: Ana Sayfaya Kart Ekle

`D:/uzay_projects/uzayzone/index.html` dosyasındaki `GAMES` JavaScript array'ine yeni oyun objesini ekle.

Mevcut array yapısı şu formatta:

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

Yeni oyun objesini array'in **sonuna** ekle (son `]` kapanışından önce). Renkleri oyunun kendi temasından türet:
- `bg`: Oyunun arka plan renklerinin koyu versiyonu (uzay portalında iyi görünmesi için)
- `accent`: Oyunun en belirgin vurgu rengi
- `glow`: Accent rengin düşük opaklıklı rgba versiyonu
- `bar`: Oyunun 2 ana renginden oluşan gradient
- `border`: Accent rengin düşük opaklıklı rgba versiyonu

## Adım 4: Doğrulama

Bitirdikten sonra şunları kontrol et:
1. Yeni klasör ve `index.html` dosyası oluşturuldu mu
2. Oyun tarayıcıda açılıp çalışıyor mu (mantık hatası yok mu)
3. Ana sayfaya dön butonu oyunun içinde görünüyor mu
4. `D:/uzay_projects/index.html`'deki GAMES array'ine yeni kart eklendi mi
5. Kullanıcıya oyunu tarayıcıda test etmesini söyle

## Önemli Notlar

- Mevcut oyunlar referans: `kibrit-oyunu/`, `neonball/`, `xox/` — kalite seviyelerini incele
- Her oyun **kendi başına bağımsız** çalışmalı (portal olmadan da açılabilmeli)
- Oyun karmaşıklığı kullanıcının isteğine göre ayarlanmalı ama her zaman **tam çalışır** olmalı
- Ses efektleri oyun deneyimini zenginleştirir, mutlaka ekle
- Canvas tabanlı oyunlar için `requestAnimationFrame` kullan
- Oyun durumunu (skor, seviye vb.) göster

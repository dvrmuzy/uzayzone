---
name: destek-mailleri
description: Gmail MCP ile siteden gelen "Uzay Zone Destek" maillerini çeker, admin/messages.js dosyasına yazar ve yerel admin panelini günceller. Kullanıcı "destek maillerini çek", "mesajları güncelle", "admin panelini yenile" dediğinde kullan.
---

# Destek Maillerini Çek

Sitedeki "Geliştiriciye Destek Ol" formundan gelen mailleri Gmail'den çekip
yerel admin paneline (`admin/index.html`) aktarır.

## Ön koşul

Bir Gmail MCP aracı bağlı olmalı (mail arama + okuma yetenekli). Bağlı değilse
kullanıcıya söyle ve durdur: claude.ai → Ayarlar → Bağlayıcılar'dan Gmail'i
bağlayıp Claude Code'da `/mcp` ile etkinleştirebilir, ya da yerel bir Gmail
MCP sunucusu ekleyebilir.

## Adımlar

1. Önce `admin/messages.js` dosyasını oku (varsa). İçindeki
   `window.UZAY_MESAJLAR` dizisinden **en yeni `tarih` değerini** belirle.
   Bu, "son çekilen" sınırıdır.
2. Gmail'de şu aramayı yap: `in:anywhere subject:"Uzay Zone Destek"`.
   - `messages.js` varsa aramaya `after:<epoch>` ekle. `<epoch>`, en yeni
     kaydın `tarih` değerinden **5 dakika öncesinin** Unix epoch saniyesi
     olmalı (Gmail `after:` epoch saniye kabul eder ve saniye hassasiyetinde
     çalışır; `YYYY/MM/DD` biçimi KULLANMA, gün hassasiyetindedir).
     Örnek: en yeni tarih `2026-06-12T13:57:36Z` ise epoch = o anın
     saniyesi − 300.
   - Arama sonucu zaten her mailin tarih-saatini ve özetini içerir.
     **Mail tarih-saati `en yeni kayıt tarihi - 5 dk` sınırından eski
     olanları atla**; sınırdan yeni olanlar aday. Sadece adaylar için
     `get_thread` ile tam içerik çek — önceden işlenmiş maillerin gövdesini
     ASLA yeniden çekme; asıl token maliyeti mail gövdelerindedir. Tarih-saati
     mevcut bir kayıtla birebir aynı olan maili de atla (zaten işlenmiştir).
   - Hiç aday yoksa: dosyaya dokunma, kullanıcıya "yeni mesaj yok, toplam X
     mesaj var" de ve bitir.
3. Her aday mailin gövdesinde `UZAYZONE_DATA:` ile başlayan satırı bul ve
   sonrasındaki JSON'u ayrıştır. Bu JSON şu şekildedir:
   ```json
   { "hediye": {...}, "isim": "...", "eposta": "...", "mesaj": "...", "tarih": "ISO-8601" }
   ```
   - `UZAYZONE_DATA` satırı olmayan ama konusu eşleşen mail varsa, gövdedeki
     `🎁 Hediye:` / `👤 İsim:` / `💬 Mesaj:` satırlarından elden geldiğince
     bir kayıt türet; `tarih` olarak mailin alınma zamanını kullan.
4. Yeni kayıtları 1. adımda okunan mevcut kayıtlarla birleştir. Tekrarları
   `tarih` alanına göre ele (aynı `tarih` = aynı kayıt). Yeniden eskiye
   sırala.
5. Dosyayı şu formatta yaz (UTF-8):
   ```js
   // Bu dosya /destek-mailleri becerisi tarafından üretilir; elle düzenleme.
   window.UZAY_MESAJLAR = [ ...kayıtlar... ];
   ```
6. Kullanıcıya özetle: kaç yeni mesaj geldi, toplam kaç mesaj var, en
   yenisi kimden. `admin/index.html` dosyasını tarayıcıda açmasını hatırlat
   (çift tıklamak yeterli, sunucu gerekmez).

## Notlar

- `admin/` klasörü `.gitignore`'dadır; mesajlar asla commit edilmez.
- Hediye SVG'leri admin sayfasında `../destek.js` içindeki
  `window.UzayDestek.renderGift()` ile çizilir; `hediye` nesnesini olduğu
  gibi koru, alanlarını değiştirme.
- Geçerli `hediye.tur` değerleri: `dondurma`, `cikolata`, `gezegen`,
  `yakit`, `yildiz`.

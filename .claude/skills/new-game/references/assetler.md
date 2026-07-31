# Ücretsiz Asset Kullanımı

Oyunun görsel/işitsel kalitesini artırmak için **ücretsiz CC0 / CC-BY lisanslı asset**'ler indir ve kullan. Tüm assetler oyun klasörü altında `assets/` alt klasörüne koyulmalı.

## Önerilen kaynaklar (telif derdi yok)

| Tür | Kaynak | Lisans |
|---|---|---|
| 2D sprite, ses, UI ikon paketleri | **kenney.nl/assets** | CC0 (kamu malı) |
| Geniş çeşitlilik 2D/3D/ses | **opengameart.org** | CC0 / CC-BY (lisansı oku) |
| Düşük poligon 3D model (GLB) | **quaternius.com** | CC0 |
| 3D model arama motoru | **poly.pizza** | CC0 / CC-BY (filtrele) |
| Ses efektleri | **freesound.org** | CC0 / CC-BY (filtrele) |
| Royalty-free görsel/ses | **pixabay.com** | Pixabay Lisansı (free) |
| Yazı tipleri | **fonts.google.com** | Open Font License |

## Asset indirme akışı

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

## Asset kullanmama kuralı

- **Küçük SFX (atış, bip, vuruş, kazanma melodisi):** Web Audio API ile sentezle — indirme yok
- **Geometrik şekiller (top, kare, dikdörtgen, basit ikon):** Canvas/SVG ile çiz — indirme yok
- **Procedural pattern, gradient, parçacık:** Kod ile üret — indirme yok
- **Sprite/3D model gerekiyorsa, "asset olmadan ucuz görünür" durumda:** İndir
- **Asset boyut hedefi:** Toplam `assets/` < ~5 MB; 4K texture ve büyük müzik indirme

## Asset yükleme güvenliği

İndirme başarısız olabilir veya çevrimdışı oyna senaryosu olabilir. Asset yüklenirken:

- `Image.onerror` / `loader.onError` ile geri-düş (fallback) — renkli dikdörtgen, emoji vb.
- Yükleme bekleme ekranı göster (progress bar veya "Yükleniyor...")
- Hata durumunda kullanıcıya net mesaj

## Lisans

İndirilen her CC-BY asset için HTML'de kredi yorumu bırak; CC0 için gerekmez ama not düşmek temiz olur.

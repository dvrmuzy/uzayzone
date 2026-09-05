# UzayGPT Kurulumu

UzayGPT iki parçadan oluşur:

| Parça | Nerede | Ne yapar |
|---|---|---|
| `uzaygpt/index.html` | GitHub Pages (site) | Sohbet ekranı |
| `uzaygpt/worker.js` | Cloudflare Workers | API anahtarını saklar, Claude'a sorar |

**Neden ikiye ayrılıyor?** Anthropic API anahtarı tarayıcıya konulamaz — siteyi
açan herkes kaynak koddan görür ve senin hesabından harcama yapabilir. Worker
araya girer: anahtar Cloudflare'de kalır, tarayıcı sadece Worker'a konuşur.

Toplam süre: yaklaşık 10 dakika. Kredi kartı gerekmez (Cloudflare ücretsiz planı
günde 100.000 istek verir), sadece Anthropic'te kullandığın kadar ödersin.

---

## 1. Anthropic API anahtarı al

1. <https://console.anthropic.com> adresine gir, hesap aç.
2. **Billing** bölümünden bir miktar kredi yükle (5 $ başlangıç için fazlasıyla yeter).
3. **API Keys** → **Create Key**. Anahtarı kopyala.
   `sk-ant-...` diye başlar. **Bir daha gösterilmez**, kaybedersen yenisini oluşturursun.

> Anahtarı hiçbir dosyaya, sohbete veya GitHub'a yapıştırma. Sadece 2. adımdaki
> Cloudflare kutusuna girecek.

---

## 2. Cloudflare Worker'ı oluştur

1. <https://dash.cloudflare.com> adresine gir, hesap aç (ücretsiz).
2. Sol menüden **Compute (Workers)** → **Create** → **Start with Hello World!** → **Deploy**.
3. Worker'a bir isim ver: `uzaygpt`.
4. Açılan sayfada **Edit code** (veya **</> Edit code**) düğmesine bas.
5. Editördeki tüm kodu sil, bu depodaki **`uzaygpt/worker.js`** dosyasının
   içeriğini olduğu gibi yapıştır.
6. Sağ üstten **Deploy**.

---

## 3. API anahtarını Worker'a gizli değişken olarak ekle

1. Worker'ın sayfasında **Settings** → **Variables and Secrets**.
2. **Add** → tür olarak **Secret** seç.
3. **Variable name**: `ANTHROPIC_API_KEY`
   **Value**: 1. adımda kopyaladığın `sk-ant-...` anahtarı.
4. **Deploy** / **Save**.

> Secret olarak eklenen değer bir daha panelde bile görünmez — doğrusu budur.

---

## 4. Worker adresini siteye yaz

Worker sayfasının üstünde şuna benzer bir adres yazar:

```
https://uzaygpt.kullaniciadin.workers.dev
```

Bunu kopyala ve `uzaygpt/index.html` dosyasında şu satırı bul:

```js
const API = 'https://uzaygpt.DEGISTIR.workers.dev';
```

Kendi adresinle değiştir:

```js
const API = 'https://uzaygpt.kullaniciadin.workers.dev';
```

Sonra commit + push. GitHub Pages birkaç dakikada yayına alır.

---

## 5. Alan adını Worker'a tanıt

`worker.js` içindeki `IZINLI_ADRESLER` listesinde `https://uzay.zone` zaten var.
Başka bir alan adından da kullanacaksan listeye ekleyip Worker'ı yeniden
**Deploy** et. Listede olmayan bir siteden gelen istek `403` alır — böylece
başkası Worker'ı kendi sitesinde kullanamaz.

---

## 6. Test et

`https://uzay.zone/uzaygpt/` adresini aç ve bir soru sor.

| Ne görüyorsun | Sebebi | Çözümü |
|---|---|---|
| "UzayGPT henüz bağlanmadı" | `API` satırı hâlâ `DEGISTIR` içeriyor | 4. adım |
| "Bu adresten istek kabul edilmiyor" | Alan adı `IZINLI_ADRESLER`'de yok | 5. adım |
| "Sunucuda ANTHROPIC_API_KEY tanımlı değil" | Secret eklenmemiş | 3. adım |
| "Şu an cevap veremiyorum" | Anthropic kredisi bitmiş ya da anahtar geçersiz | Console → Billing |
| "Biraz yavaş!" | Dakikada 20 istek sınırına takıldın | Bir dakika bekle |

Yerel testte (`npx serve`) `localhost` adresleri otomatik izinlidir; ekstra
ayar gerekmez.

---

## Ayarlar

Hepsi `worker.js` dosyasının en üstünde:

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `MODEL` | `claude-opus-5` | Model. Daha ucuz/hızlı için `claude-haiku-4-5` |
| `MAX_MESAJ` | `2000` | Tek sorunun karakter sınırı |
| `MAX_GECMIS` | `16` | Sunucuya gönderilen en fazla mesaj sayısı |
| `MAX_CIKTI` | `1500` | Cevabın token sınırı |
| `DAKIKA_LIMIT` | `20` | Aynı IP'den dakikada en fazla istek |

Model fiyatları (1 milyon token başına, giriş/çıkış):

| Model | Giriş | Çıkış |
|---|---|---|
| `claude-opus-5` | 5 $ | 25 $ |
| `claude-sonnet-5` | 3 $ | 15 $ |
| `claude-haiku-4-5` | 1 $ | 5 $ |

Bir çocuk sorusu + cevabı ortalama 1.000-2.000 token tutar. Opus 5 ile günde
100 soru ≈ ayda 1-2 dolar. Yine de Anthropic Console → **Limits** bölümünden
aylık bir harcama tavanı koymanı öneririm.

---

## Hile koruması

UzayGPT **Uzay Coin veremez**, çünkü:

1. `uzaygpt/index.html` hiçbir yerde `window.UzayHesap.odul()` çağırmaz.
   Sayfa `hesap.js`'i yalnızca sağ üstteki rozeti göstermek için yükler.
2. Coin yazımı `hesap.js` üzerinden yapılır ve `firebase-rules.json`
   kuralları tek ödülü 250, günlük toplamı 1000 ile sınırlar.
3. Modelin ne söylediğinin bir önemi yok — "sana 60000 coin verdim" dese bile
   hiçbir şey yazılmaz. Sistem talimatı ayrıca bu cümleyi kurmamasını söyler.

Yani sohbetle coin üretmek **yazılım olarak mümkün değil**, sadece modelin iyi
niyetine bırakılmış bir kural değil.

## Görseller

Görsel üretimi ücretsiz [Pollinations](https://pollinations.ai) servisinden
gelir; API anahtarı gerektirmez, Anthropic faturasına yansımaz. Sadece Türkçe
isteği İngilizce çizim tarifine çevirmek için Claude'a çok kısa bir istek gider
(soru başına birkaç kuruş). Pollinations kapanır veya yavaşlarsa yalnızca görsel
modu etkilenir, sohbet çalışmaya devam eder.

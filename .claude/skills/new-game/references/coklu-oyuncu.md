# Çok Oyunculu — "Arkadaşınla Oyna"

Oyun **2 veya daha fazla kişiyle** oynanabiliyorsa (aynı ekranda iki oyuncu, sıra tabanlı, düello, vb.) mutlaka **oda kodu ile uzaktan oynama** modunu da ekle. İki arkadaş farklı bilgisayarlardan 4 haneli kod paylaşarak aynı oyuna girer.

Tek kişilik oyunlarda (skor koşusu, bulmaca, endless runner) bu dosya hiç okunmamalı.

## Altyapı

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

## İki desen — oyunun türüne göre seç

### A) Sıra tabanlı (XOX, dama, kelime oyunu, kart oyunu)

Oda durumu **tek doğruluk kaynağıdır**. Hamle yapan oyuncu yerel durumu değiştirmez; doğrudan odaya yazar. Ekranı **iki taraf da odadan gelen güncellemeyle** çizer. Böylece durum ayrışması imkânsız hale gelir.

Skor gibi biriken değerleri **yalnızca oda kuran** yazsın (iki taraf da yazarsa çift sayılır). Referans: `xox/index.html`.

### B) Gerçek zamanlı (dövüş, yarış, top oyunu, nişancı)

**Host-otoriteli** kur: oda kuran fiziğin tamamını çalıştırıp ~20 Hz durum özeti yayınlar; katılan fizik çalıştırmaz, girdisini yollayıp gelen durumu yumuşatarak çizer.

Durum özetini **virgülle ayrılmış sayı dizisi** olarak paketle (JSON değil) — 50-200 bayt aralığında kalır, saniyede 20 kez göndermek ~1-2 KB/sn eder. Konumları `Math.round(v*10)/10` ile yuvarla.

Katılan taraftaki girdi gecikmesini gizlemek şart, yoksa oyun "gecikmeli" hissettirir. İki yöntem:

1. **Katılan kendi nesnesinin sahibi olsun** — nesnenin hareketi rakiple etkileşmiyor ise (ping-pong raketi, tron motorunun yolu gibi) katılan onu tamamen yerelde sürüp **konumunu / geçtiği hücreleri** yollasın, host bunları olduğu gibi işleyip yalnızca hakemlik yapsın. En temizi, sıfır gecikme. Referans: `uzay-pingpong/index.html`, `neon-tron/index.html`
2. **Yerel tahmin + orantılı düzeltme** — nesne rakiple çarpışıyorsa (sumo savaşçısı, tank gibi) katılan aynı hareket fonksiyonunu yerelde çalıştırsın, otoritenin sonucuyla arasındaki hatayı büyüklüğüne göre kapatsın: küçük sapma %5, çarpışma %40, ışınlanma anında. Yalnız **hareketi** tahmin et; ateş etme, hasar ve toplama otoritede kalsın, yoksa iki tarafta ayrı mermi/puan oluşur. Referans: `uzay-sumo/index.html`, `tank-savasi/index.html`

**Dikkat:** Durum özetini oyun *bittiğinde de* göndermeye devam et. Yalnızca "oynanıyor" durumunda gönderirsen katılan oyuncu oyunun bittiğini hiç öğrenemez.

**Bozulabilir dünya** (yıkılan duvar, değişen labirent, rastgele harita) varsa bunu özetin içine koyma — ayrı bir dalda, yalnız değiştiğinde ve kısıtlanmış sıklıkta yolla. Referans: `tank-savasi/index.html` (`map` dalı).

**Lobi de senkronlanmalı** — oyun başlamadan önce karakter/silah/hazır seçimi varsa bunlar da odada tutulmalı; her oyuncu yalnızca kendi yuvasını düzenleyebilmeli ve maçı oda kuran başlatmalı. Referans: `stickman-dovus/index.html`

Sesleri ve parçacıkları katılan tarafta **durum farkından türet** (hasar arttı → vuruş sesi, skor arttı → sayı sesi); ayrıca olay göndermeye gerek yok.

## Arayüz düzeni (tüm oyunlarda aynı olsun)

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

Bu ID'lerin **hepsi** HTML'de bulunmalı — `oyun-kontrol.js` hook'u eksik olanı yakalar.

Oyun alanının köşesine bağlantı rozeti koy: yeşil/kırmızı nokta + rol ("SEN: OYUNCU 2") + katılan tarafta ölçülen **ms gecikme**. Gecikmeyi gerçekten ölç — katılanın girdisine sıra numarası koy, host özette geri yansıtsın, katılan kendi saatiyle gidiş-dönüşü hesaplasın.

## Sık yapılan hatalar

- **CSS'te `display:none` olan paneli `style.display = ''` ile açma** — bu inline stili siler ve eleman CSS kuralına geri düşerek gizli kalır. `classList.toggle('on')` + `#panel.on { display: flex }` kullan.
- Kod girme kutusunda `keydown` olayına `e.stopPropagation()` ekle, yoksa yazarken oyunun tuş kısayolları tetiklenir.
- Çevrimiçi modda **duraklatmayı kapat** (tek taraflı duraklatma diğerini dondurur) ve **yeni maçı yalnızca oda kuran başlatabilsin**.
- Katılan oyuncu kendi bilgisayarında yalnız olduğu için **her iki tuş takımını da** (WASD ve oklar) kendi karakteri için kabul et.
- Oda kodu üretirken karıştırılan karakterleri çıkar (`0/O`, `1/I/L`) — modül bunu zaten yapıyor.

## Test uyarısı (kullanıcıya mutlaka söyle)

ES modülü kullanıldığı için dosyayı çift tıklayarak (`file://`) açmak **çalışmaz**; yerel sunucu gerekir. Ayrıca tek bilgisayarda iki pencereyle test ederken pencereler **yan yana ve tamamen görünür** olmalı — Chrome arkada kalan sekmelerde `requestAnimationFrame`'i saniyede ~1 kareye düşürür ve bu gecikme sanılır.

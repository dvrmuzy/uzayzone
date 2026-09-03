// Geçici test: oyunun betiğini sahte bir DOM ile yükleyip fizik + YZ'yi ölçer.
const fs = require('fs');
const html = fs.readFileSync('yorunge-duellosu/index.html', 'utf8');
const src = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];

const sahte = () => new Proxy(function () {}, {
  get(t, k) {
    if (k === 'classList') return { toggle() {}, add() {}, remove() {}, contains: () => false };
    if (k === 'style') return {};
    if (k === 'dataset') return {};
    if (k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
    if (k === 'querySelectorAll') return () => [];
    if (k === 'getBoundingClientRect') return () => ({ left: 0, top: 0, width: 1000, height: 620 });
    if (k === 'getContext') return () => ctx;
    if (k === Symbol.toPrimitive) return () => '';
    return sahte();
  },
  set() { return true; },
  apply() { return sahte(); }
});
const ctx = sahte();

global.document = { getElementById: () => sahte(), createElement: () => sahte() };
global.window = global;
global.localStorage = { getItem: () => null, setItem() {} };
global.requestAnimationFrame = () => 0;
global.devicePixelRatio = 1;
global.innerWidth = 1200; global.innerHeight = 900;
global.addEventListener = () => {};
global.AudioContext = undefined;

const dis = new Function(src + '\n;return { makeWorld, simulate, aiAtisBul, S, W, H, HEDEF_TUR };')();
const { makeWorld, simulate, aiAtisBul, S, W, H } = dis;

// ── 1. Dünya üretimi ──
let kotu = 0, gezegenSayilari = [0, 0, 0, 0];
for (let i = 0; i < 300; i++) {
  const w = makeWorld((Math.random() * 2e9) | 0);
  gezegenSayilari[w.planets.length]++;
  for (const s of w.ships) for (const p of w.planets) {
    if (Math.hypot(s.x - p.x, s.y - p.y) < p.r + 100) kotu++;
  }
  if (w.ships[0].x >= w.ships[1].x) kotu++;
}
console.log('Gezegen sayısı dağılımı [0,1,2,3]:', gezegenSayilari, '| kural ihlali:', kotu);

// ── 2. Determinizm: aynı tohum → aynı yörünge ──
const t = 123456;
const a1 = simulate(makeWorld(t), 0, 37, 71);
const a2 = simulate(makeWorld(t), 0, 37, 71);
console.log('Determinizm:', a1.pts.length === a2.pts.length && a1.son.x === a2.son.x ? 'AYNI ✓' : 'FARKLI ✗');

// ── 3. Yapay zekâ: isabet oranı ve süre ──
for (const zorluk of ['kolay', 'orta', 'zor']) {
  S.diff = zorluk;
  let isabet = 0, toplamSure = 0, deneme = 40, atisSayisi = 0;
  for (let i = 0; i < deneme; i++) {
    const w = makeWorld((Math.random() * 2e9) | 0);
    S.world = w;
    // YZ sağ gemi (1) olarak en fazla 6 atış yapsın, ne kadar sürede vuruyor?
    for (let k = 0; k < 6; k++) {
      const t0 = process.hrtime.bigint();
      const atis = aiAtisBul(w, 1);
      toplamSure += Number(process.hrtime.bigint() - t0) / 1e6;
      atisSayisi++;
      const sim = simulate(w, 1, atis.a, atis.p);
      if (sim.vurulan === 0) { isabet++; break; }
      if (sim.vurulan === 1) break;   // kendini vurdu
    }
  }
  console.log(`YZ ${zorluk.padEnd(5)} → 6 atışta isabet: ${isabet}/${deneme}` +
              ` | atış başına düşünme: ${(toplamSure / atisSayisi).toFixed(1)} ms`);
}

// ── 4. İnsan oyuncu düz atışla vurabiliyor mu? (oyun çözülebilir mi) ──
let cozulebilir = 0;
for (let i = 0; i < 200; i++) {
  const w = makeWorld((Math.random() * 2e9) | 0);
  let vardi = false;
  for (let a = -85; a <= 85 && !vardi; a += 2) {
    for (let p = 15; p <= 100 && !vardi; p += 3) {
      const sim = simulate(w, 0, a, p);
      if (sim.vurulan === 1) vardi = true;
    }
  }
  if (vardi) cozulebilir++;
}
console.log('Sol oyuncunun çözebildiği dünya oranı:', cozulebilir + '/200');

// ── 5. Uçuş süreleri ──
let sureler = [];
for (let i = 0; i < 200; i++) {
  const w = makeWorld((Math.random() * 2e9) | 0);
  const sim = simulate(w, 0, Math.random() * 90 - 20, 30 + Math.random() * 70);
  sureler.push((sim.pts.length / 2) / 120);
}
sureler.sort((x, y) => x - y);
console.log('Uçuş süresi sn — ortanca:', sureler[100].toFixed(2),
            '| %90:', sureler[180].toFixed(2), '| en uzun:', sureler[199].toFixed(2));

// ── 6. Atış başına isabet oranı ──
console.log('\n-- atış başına isabet --');
for (const zorluk of ['kolay', 'orta', 'zor']) {
  S.diff = zorluk;
  let isabet = 0, n = 300;
  for (let i = 0; i < n; i++) {
    const w = makeWorld((Math.random() * 2e9) | 0);
    S.world = w;
    const atis = aiAtisBul(w, 1);
    if (simulate(w, 1, atis.a, atis.p).vurulan === 0) isabet++;
  }
  console.log(zorluk.padEnd(5), (isabet / n * 100).toFixed(0) + '%');
}

// ─── Uzay Zone · "Geliştiriciye Destek Ol" Widget'ı ───
// index.html'e <script src="destek.js" defer></script> ile eklenir; sağ üst
// buton, modal ve tüm stiller bu dosyadan enjekte edilir.
//
// KURULUM: https://web3forms.com adresinde geliştirici e-postasıyla ücretsiz
// bir Access Key al ve aşağıdaki WEB3FORMS_KEY değerine yapıştır.
// Gönderilen hediyeler + mesajlar o e-posta adresine düşer.
//
// admin/ sayfası bu dosyayı window.UZD_RENDER_ONLY = true ile yükler ve
// sadece SVG çizicileri (window.UzayDestek) kullanır; arayüz enjekte edilmez.
(function () {
'use strict';

const WEB3FORMS_KEY = 'e359632d-f05f-46ea-b449-647bff8d81db';

// ─── Hediye Türleri ───
const TURLER = [
  { id: 'dondurma', ad: 'Dondurma',      e: '🍦' },
  { id: 'cikolata', ad: 'Çikolata',      e: '🍫' },
  { id: 'gezegen',  ad: 'Gezegen',       e: '🪐' },
  { id: 'yakit',    ad: 'Roket Yakıtı',  e: '🚀' },
  { id: 'yildiz',   ad: 'Yıldız Takımı', e: '✨' }
];

// c1 = açık ton (parlama), c2 = ana ton
const DONDURMA = [
  { id: 'cilek',     ad: 'Çilek',          c1: '#ff9fc2', c2: '#e85a8f' },
  { id: 'limon',     ad: 'Limon',          c1: '#faf3a0', c2: '#e0c84a' },
  { id: 'cikolata',  ad: 'Çikolata',       c1: '#a06a42', c2: '#5a3520' },
  { id: 'fistik',    ad: 'Antep Fıstığı',  c1: '#c2e4a4', c2: '#7ab35a' },
  { id: 'karamel',   ad: 'Karamel',        c1: '#f0bc7a', c2: '#c47e35' },
  { id: 'mersin',    ad: 'Yaban Mersini',  c1: '#9ab0ff', c2: '#5868d0' },
  { id: 'galaksi',   ad: 'Galaksi',        c1: '#b48aff', c2: '#6a3ad0', yildizli: true },
  { id: 'nebula',    ad: 'Nebula',         c1: '#ffb08a', c2: '#e85aa0' }
];

const CIKOLATA = [
  { id: 'sutlu',    ad: 'Sütlü',           c1: '#a06a42', c2: '#7a4a26' },
  { id: 'bitter',   ad: 'Bitter',          c1: '#5a3a24', c2: '#3a2212' },
  { id: 'beyaz',    ad: 'Beyaz',           c1: '#faf0da', c2: '#e8d4ae' },
  { id: 'findikli', ad: 'Fındıklı',        c1: '#b07a48', c2: '#8a5a30', findik: true },
  { id: 'cilekli',  ad: 'Çilek Dolgulu',   c1: '#d4707f', c2: '#aa4a62' },
  { id: 'karamelli',ad: 'Karamel Dolgulu', c1: '#dca050', c2: '#b07a32' },
  { id: 'portakal', ad: 'Portakallı',      c1: '#e08a4a', c2: '#b05a26' },
  { id: 'uzaytozu', ad: 'Uzay Tozu',       c1: '#9a7ae0', c2: '#6a4ab0', simli: true }
];

const YAKIT = [
  { id: 'plazma',    ad: 'Plazma',          c2: '#00e0f0' },
  { id: 'iyon',      ad: 'İyon',            c2: '#4a7aff' },
  { id: 'antimadde', ad: 'Antimadde',       c2: '#ff3df0' },
  { id: 'nebulagaz', ad: 'Nebula Gazı',     c2: '#ff7ab0' },
  { id: 'yildiztozu',ad: 'Yıldız Tozu',     c2: '#ffd24a' },
  { id: 'kuantum',   ad: 'Kuantum Köpüğü',  c2: '#6bffb0' },
  { id: 'karanlik',  ad: 'Karanlık Madde',  c2: '#9a6bff' },
  { id: 'gunes',     ad: 'Güneş Rüzgarı',   c2: '#ff9a3a' }
];

const GEZEGEN_RENK = [
  { ad: 'Mor',     base: '#9a6bff', mid: '#6a3ad0', dark: '#3a2068' },
  { ad: 'Turuncu', base: '#ffa04a', mid: '#d06a20', dark: '#7a3d10' },
  { ad: 'Mavi',    base: '#4ab0ff', mid: '#2570ab', dark: '#144a78' },
  { ad: 'Pembe',   base: '#ff7ab0', mid: '#d04a78', dark: '#6a2038' },
  { ad: 'Yeşil',   base: '#5ae0a0', mid: '#35a07a', dark: '#206850' },
  { ad: 'Kızıl',   base: '#ff6a5a', mid: '#c03a2a', dark: '#601a10' }
];

const GEZEGEN_DOKU = [
  { id: 'yok',      ad: 'Pürüzsüz' },
  { id: 'lekeler',  ad: 'Lekeli' },
  { id: 'cizgiler', ad: 'Çizgili' },
  { id: 'krater',   ad: 'Kraterli' }
];

const GEZEGEN_HALKA = [
  { id: 'yok',  ad: 'Halkasız' },
  { id: 'ince', ad: 'İnce Halka' },
  { id: 'cift', ad: 'Çift Halka' }
];

const YILDIZ_RENK = [
  { ad: 'Altın',   c: '#ffd24a' },
  { ad: 'Buz',     c: '#7df9ff' },
  { ad: 'Gül',     c: '#ff7ab0' },
  { ad: 'Lavanta', c: '#b48aff' },
  { ad: 'Nane',    c: '#8effb6' }
];

const MAX = { dondurma: 6, cikolata: 6, yakit: 8 };

// ─── Yardımcılar ───
let uidSayac = 0;
function uid() { return 'uzd' + (++uidSayac); }
function byId(list, id) { return list.find(x => x.id === id) || list[0]; }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Tohumlu rastgelelik (takımyıldızın her çiziminde aynı kalması için)
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function adlariListele(defs, ids) {
  const sayilar = {};
  ids.forEach(id => { sayilar[id] = (sayilar[id] || 0) + 1; });
  return Object.keys(sayilar)
    .map(id => (sayilar[id] > 1 ? sayilar[id] + '× ' : '') + byId(defs, id).ad)
    .join(' + ');
}

// ─── SVG: Dondurma ───
function svgDondurma(g) {
  const top = g.top || [];
  const id = uid();
  const defs = [];
  const katlar = [];
  top.forEach((fid, i) => {
    const f = byId(DONDURMA, fid);
    const cy = 200 - i * 30;
    const cx = 100 + (i % 2 === 0 ? 0 : (i % 4 === 1 ? -6 : 6));
    const r = 34 - i * 1.5;
    defs.push(`<radialGradient id="${id}-d${i}" cx="35%" cy="30%" r="85%">` +
      `<stop offset="0%" stop-color="${f.c1}"/><stop offset="100%" stop-color="${f.c2}"/></radialGradient>`);
    let ekstra = '';
    if (f.yildizli) {
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2 + i * 1.3;
        ekstra += `<circle cx="${(cx + Math.cos(a) * r * 0.55).toFixed(1)}" cy="${(cy + Math.sin(a) * r * 0.5).toFixed(1)}" r="1.6" fill="#fff" opacity="0.9"/>`;
      }
    }
    katlar.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-d${i})"/>` +
      `<ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.42}" rx="${r * 0.28}" ry="${r * 0.15}" ` +
      `fill="rgba(255,255,255,0.45)" transform="rotate(-25 ${cx - r * 0.35} ${cy - r * 0.42})"/>` + ekstra
    );
  });
  // Üst top önce çizilir, alttakiler üstüne biner
  katlar.reverse();

  // Kiraz (2+ top varsa)
  let kiraz = '';
  if (top.length >= 2) {
    const i = top.length - 1;
    const cy = 200 - i * 30;
    const cx = 100 + (i % 2 === 0 ? 0 : (i % 4 === 1 ? -6 : 6));
    const r = 34 - i * 1.5;
    kiraz = `<path d="M ${cx} ${cy - r - 4} q 6 -12 14 -14" stroke="#4a7a30" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="${cx}" cy="${cy - r - 2}" r="6.5" fill="#e02a4a"/>` +
      `<circle cx="${cx - 2}" cy="${cy - r - 4}" r="1.8" fill="rgba(255,255,255,0.6)"/>`;
  }

  const bosIpucu = top.length ? '' :
    `<circle cx="100" cy="200" r="34" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-dasharray="6 7"/>` +
    `<text x="100" y="206" text-anchor="middle" font-size="13" fill="rgba(255,255,255,0.35)" font-family="Nunito, sans-serif">top seç</text>`;

  return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${defs.join('')}
      <linearGradient id="${id}-kulah" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8a25a"/><stop offset="100%" stop-color="#a05f26"/>
      </linearGradient>
      <clipPath id="${id}-kclip"><polygon points="62,212 138,212 100,332"/></clipPath>
    </defs>
    ${bosIpucu}${kiraz}${katlar.join('')}
    <polygon points="62,212 138,212 100,332" fill="url(#${id}-kulah)"/>
    <g clip-path="url(#${id}-kclip)" stroke="rgba(90,45,10,0.45)" stroke-width="2">
      <line x1="40" y1="220" x2="130" y2="340"/><line x1="60" y1="208" x2="150" y2="328"/>
      <line x1="80" y1="200" x2="165" y2="315"/><line x1="160" y1="220" x2="70" y2="340"/>
      <line x1="140" y1="208" x2="50" y2="328"/><line x1="120" y1="200" x2="38" y2="312"/>
    </g>
    <ellipse cx="100" cy="212" rx="40" ry="9" fill="#c87f3e"/>
    <ellipse cx="100" cy="210" rx="40" ry="8" fill="#e8a25a"/>
  </svg>`;
}

// ─── SVG: Çikolata ───
function svgCikolata(g) {
  const parca = g.parca || [];
  const id = uid();
  const cols = 3, rows = 6, sq = 28, gap = 5;
  const x0 = 53, y0 = 70;
  const kareler = [];
  for (let r = 0; r < rows; r++) {
    // r=0 en alt satır; seçimler alttan yukarı dolar
    const f = r < parca.length ? byId(CIKOLATA, parca[r]) : null;
    const y = y0 + (rows - 1 - r) * (sq + gap);
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * (sq + gap);
      if (f) {
        kareler.push(
          `<rect x="${x}" y="${y}" width="${sq}" height="${sq}" rx="5" fill="${f.c2}"/>` +
          `<rect x="${x + 3}" y="${y + 3}" width="${sq - 6}" height="7" rx="3" fill="${f.c1}" opacity="0.55"/>`
        );
        if (f.findik) {
          kareler.push(`<circle cx="${x + 9}" cy="${y + 18}" r="2.6" fill="rgba(40,18,4,0.55)"/>` +
            `<circle cx="${x + 19}" cy="${y + 21}" r="2.2" fill="rgba(40,18,4,0.45)"/>`);
        }
        if (f.simli) {
          kareler.push(`<circle cx="${x + 8}" cy="${y + 17}" r="1.3" fill="#fff" opacity="0.85"/>` +
            `<circle cx="${x + 20}" cy="${y + 22}" r="1.1" fill="#fff" opacity="0.7"/>` +
            `<circle cx="${x + 15}" cy="${y + 11}" r="1" fill="#fff" opacity="0.6"/>`);
        }
      } else {
        kareler.push(`<rect x="${x}" y="${y}" width="${sq}" height="${sq}" rx="5" fill="#150b05" stroke="rgba(255,255,255,0.05)"/>`);
      }
    }
  }
  const bosIpucu = parca.length ? '' :
    `<text x="100" y="172" text-anchor="middle" font-size="13" fill="rgba(255,255,255,0.35)" font-family="Nunito, sans-serif">çeşit seç</text>`;
  return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${id}-folyo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3a2a4a"/><stop offset="100%" stop-color="#241836"/>
    </linearGradient></defs>
    <rect x="40" y="48" width="120" height="244" rx="12" fill="url(#${id}-folyo)" stroke="rgba(180,140,255,0.25)"/>
    <rect x="46" y="58" width="108" height="224" rx="9" fill="#1a0d06" stroke="#3a2412"/>
    ${kareler.join('')}${bosIpucu}
    <text x="100" y="312" text-anchor="middle" font-size="9" letter-spacing="3" fill="rgba(220,190,255,0.55)" font-family="Orbitron, sans-serif">UZAY ZONE</text>
  </svg>`;
}

// ─── SVG: Gezegen ───
function svgGezegen(g) {
  const id = uid();
  const pal = GEZEGEN_RENK[g.renk] || GEZEGEN_RENK[0];
  const R = 58, cx = 100, cy = 150;
  const ringRenk = pal.base;

  function halkaYay(rx, ry, w, ust) {
    // ust=true: gezegenin arkasında kalan üst yarım
    return `<path d="M ${-rx} 0 A ${rx} ${ry} 0 0 ${ust ? 1 : 0} ${rx} 0" fill="none" ` +
      `stroke="${ringRenk}" stroke-opacity="0.55" stroke-width="${w}"/>`;
  }
  let halkaArka = '', halkaOn = '';
  if (g.halka === 'ince' || g.halka === 'cift') {
    halkaArka += halkaYay(84, 22, 7, true);
    halkaOn += halkaYay(84, 22, 7, false);
  }
  if (g.halka === 'cift') {
    halkaArka += halkaYay(96, 26, 3, true);
    halkaOn += halkaYay(96, 26, 3, false);
  }

  let doku = '';
  if (g.doku === 'lekeler') {
    doku = `<ellipse cx="${cx - 18}" cy="${cy - 12}" rx="20" ry="9" fill="rgba(0,0,0,0.2)" transform="rotate(-15 ${cx - 18} ${cy - 12})"/>
      <ellipse cx="${cx + 22}" cy="${cy + 18}" rx="14" ry="7" fill="rgba(0,0,0,0.22)" transform="rotate(10 ${cx + 22} ${cy + 18})"/>
      <ellipse cx="${cx + 8}" cy="${cy - 30}" rx="10" ry="5" fill="rgba(0,0,0,0.16)"/>`;
  } else if (g.doku === 'cizgiler') {
    doku = `<rect x="${cx - R}" y="${cy - 32}" width="${R * 2}" height="11" fill="rgba(0,0,0,0.18)"/>
      <rect x="${cx - R}" y="${cy - 8}" width="${R * 2}" height="15" fill="rgba(0,0,0,0.24)"/>
      <rect x="${cx - R}" y="${cy + 20}" width="${R * 2}" height="9" fill="rgba(0,0,0,0.16)"/>
      <rect x="${cx - R}" y="${cy + 38}" width="${R * 2}" height="6" fill="rgba(0,0,0,0.2)"/>`;
  } else if (g.doku === 'krater') {
    const k = (x, y, r) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(0,0,0,0.26)"/>` +
      `<circle cx="${x - r * 0.25}" cy="${y - r * 0.25}" r="${r * 0.65}" fill="rgba(255,255,255,0.07)"/>`;
    doku = k(cx - 22, cy - 16, 11) + k(cx + 20, cy + 8, 8) + k(cx - 4, cy + 30, 6) + k(cx + 28, cy - 28, 5);
  }

  const uyduTanim = [
    { x: 168, y: 84, r: 9 },
    { x: 30, y: 226, r: 7 },
    { x: 172, y: 240, r: 5 }
  ];
  let uydular = '';
  for (let i = 0; i < (g.uydu || 0) && i < 3; i++) {
    const u = uyduTanim[i];
    uydular += `<circle cx="${u.x}" cy="${u.y}" r="${u.r}" fill="url(#${id}-uydu)"/>` +
      `<circle cx="${u.x + u.r * 0.25}" cy="${u.y + u.r * 0.2}" r="${u.r * 0.3}" fill="rgba(0,0,0,0.25)"/>`;
  }

  const parilti = g.parilti ?
    `<circle cx="${cx}" cy="${cy}" r="${R + 22}" fill="url(#${id}-glow)"/>` : '';

  return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${id}-gz" cx="33%" cy="30%" r="85%">
        <stop offset="0%" stop-color="${pal.base}"/>
        <stop offset="60%" stop-color="${pal.mid}"/>
        <stop offset="100%" stop-color="${pal.dark}"/>
      </radialGradient>
      <radialGradient id="${id}-glow">
        <stop offset="55%" stop-color="${pal.base}" stop-opacity="0"/>
        <stop offset="80%" stop-color="${pal.base}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${pal.base}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id}-uydu" cx="35%" cy="32%" r="80%">
        <stop offset="0%" stop-color="#d8dde8"/><stop offset="100%" stop-color="#6a7080"/>
      </radialGradient>
      <clipPath id="${id}-gclip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    </defs>
    <circle cx="38" cy="58" r="1.4" fill="#fff" opacity="0.7"/>
    <circle cx="160" cy="40" r="1.1" fill="#fff" opacity="0.5"/>
    <circle cx="178" cy="150" r="1.3" fill="#fff" opacity="0.6"/>
    <circle cx="24" cy="170" r="1" fill="#fff" opacity="0.5"/>
    <circle cx="62" cy="282" r="1.3" fill="#fff" opacity="0.6"/>
    <circle cx="150" cy="300" r="1.1" fill="#fff" opacity="0.5"/>
    ${parilti}
    <g transform="translate(${cx} ${cy}) rotate(-14)">${halkaArka}</g>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}-gz)"/>
    <g clip-path="url(#${id}-gclip)">${doku}</g>
    <g transform="translate(${cx} ${cy}) rotate(-14)">${halkaOn}</g>
    ${uydular}
  </svg>`;
}

// ─── SVG: Roket Yakıtı ───
function svgYakit(g) {
  const hucre = g.hucre || [];
  const id = uid();
  const tankX = 80, tankY = 130, tankW = 40, tankH = 110;
  const katH = tankH / MAX.yakit;
  const katlar = hucre.map((hid, i) => {
    const f = byId(YAKIT, hid);
    const y = tankY + tankH - (i + 1) * katH;
    return `<rect x="${tankX}" y="${y.toFixed(1)}" width="${tankW}" height="${katH + 0.6}" fill="${f.c2}" opacity="0.9"/>` +
      `<rect x="${tankX}" y="${y.toFixed(1)}" width="${tankW}" height="2.5" fill="#fff" opacity="0.35"/>`;
  }).join('');

  let alev = '';
  if (hucre.length > 0) {
    const L = 16 + hucre.length * 4.5;
    alev = `<path d="M 86 280 Q 100 ${280 + L} 114 280 Q 108 ${280 + L * 0.55} 100 ${280 + L * 0.7} Q 92 ${280 + L * 0.55} 86 280" fill="url(#${id}-alev)"/>`;
  }

  const bosIpucu = hucre.length ? '' :
    `<text x="100" y="190" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.4)" font-family="Nunito, sans-serif">yakıt ekle</text>`;

  return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}-gov" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f0f3fa"/><stop offset="100%" stop-color="#aab2c4"/>
      </linearGradient>
      <linearGradient id="${id}-alev" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffd24a"/><stop offset="55%" stop-color="#ff8a2e"/>
        <stop offset="100%" stop-color="#ff4d1a" stop-opacity="0"/>
      </linearGradient>
      <clipPath id="${id}-tclip"><rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="9"/></clipPath>
    </defs>
    <circle cx="40" cy="70" r="1.3" fill="#fff" opacity="0.6"/>
    <circle cx="165" cy="55" r="1.1" fill="#fff" opacity="0.5"/>
    <circle cx="172" cy="200" r="1.3" fill="#fff" opacity="0.6"/>
    <circle cx="28" cy="250" r="1" fill="#fff" opacity="0.5"/>
    ${alev}
    <path d="M 72 260 L 48 292 L 72 276 Z" fill="#c44a5a"/>
    <path d="M 128 260 L 152 292 L 128 276 Z" fill="#c44a5a"/>
    <path d="M 86 260 L 114 260 L 120 280 L 80 280 Z" fill="#7a8294"/>
    <path d="M 72 90 Q 72 36 100 28 Q 128 36 128 90 L 128 260 L 72 260 Z" fill="url(#${id}-gov)"/>
    <path d="M 72 90 Q 72 36 100 28 Q 128 36 128 90 L 128 96 L 72 96 Z" fill="#c44a5a"/>
    <circle cx="100" cy="112" r="11" fill="#1a2a50" stroke="#8a93a8" stroke-width="2.5"/>
    <ellipse cx="96.5" cy="108.5" rx="3" ry="1.8" fill="rgba(160,210,255,0.8)" transform="rotate(-30 96.5 108.5)"/>
    <g clip-path="url(#${id}-tclip)">${katlar}</g>
    <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="9" fill="none" stroke="#5a6478" stroke-width="2.5"/>
    ${bosIpucu}
  </svg>`;
}

// ─── SVG: Yıldız Takımı ───
function svgYildiz(g) {
  const renk = YILDIZ_RENK[g.renk] || YILDIZ_RENK[0];
  const rnd = mulberry32(Math.floor((g.seed || 0.5) * 1e9) + 7);
  const sayi = Math.max(3, Math.min(9, g.sayi || 5));
  const noktalar = [];
  for (let i = 0; i < sayi; i++) {
    noktalar.push({
      x: 28 + rnd() * 144,
      y: 38 + rnd() * 198,
      s: 4 + rnd() * 4.5
    });
  }
  const cizgiler = noktalar.slice(1).map((p, i) =>
    `<line x1="${noktalar[i].x.toFixed(1)}" y1="${noktalar[i].y.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" ` +
    `stroke="${renk.c}" stroke-opacity="0.4" stroke-width="1.2"/>`).join('');
  const yildizlar = noktalar.map(p => {
    const x = p.x.toFixed(1), y = p.y.toFixed(1), s = p.s.toFixed(1), k = (p.s * 0.3).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${(p.s * 1.6).toFixed(1)}" fill="${renk.c}" opacity="0.14"/>` +
      `<path d="M ${x} ${p.y - p.s} Q ${x} ${y} ${p.x + p.s} ${y} Q ${x} ${y} ${x} ${p.y + p.s} Q ${x} ${y} ${p.x - p.s} ${y} Q ${x} ${y} ${x} ${p.y - p.s} Z" fill="${renk.c}"/>` +
      `<circle cx="${x}" cy="${y}" r="${k}" fill="#fff" opacity="0.9"/>`;
  }).join('');
  const isim = g.isim ? esc(g.isim) : 'İsimsiz Takımyıldız';
  return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="14" width="184" height="256" rx="14" fill="rgba(125,180,255,0.04)" stroke="rgba(125,180,255,0.14)"/>
    ${cizgiler}${yildizlar}
    <text x="100" y="300" text-anchor="middle" font-size="12" letter-spacing="1.5" fill="${renk.c}" font-family="Orbitron, sans-serif">${isim}</text>
    <text x="100" y="320" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)" font-family="Nunito, sans-serif">${sayi} yıldız · ${renk.ad}</text>
  </svg>`;
}

// ─── Ortak Çizici ve Özetleyici ───
function renderGift(g) {
  if (!g) return '';
  switch (g.tur) {
    case 'dondurma': return svgDondurma(g);
    case 'cikolata': return svgCikolata(g);
    case 'gezegen':  return svgGezegen(g);
    case 'yakit':    return svgYakit(g);
    case 'yildiz':   return svgYildiz(g);
  }
  return '';
}

function summarize(g) {
  if (!g) return 'Hediye yok, sadece mesaj';
  switch (g.tur) {
    case 'dondurma':
      return `🍦 ${g.top.length} toplu dondurma: ${adlariListele(DONDURMA, g.top)}`;
    case 'cikolata':
      return `🍫 ${g.parca.length} sıralı çikolata: ${adlariListele(CIKOLATA, g.parca)}`;
    case 'gezegen': {
      const renk = GEZEGEN_RENK[g.renk] || GEZEGEN_RENK[0];
      const doku = byId(GEZEGEN_DOKU, g.doku).ad.toLowerCase();
      const halka = byId(GEZEGEN_HALKA, g.halka).ad.toLowerCase();
      return `🪐 ${renk.ad} gezegen · ${doku} · ${halka} · ${g.uydu} uydu${g.parilti ? ' · parıltılı' : ''}`;
    }
    case 'yakit':
      return `🚀 ${g.hucre.length} hücre roket yakıtı: ${adlariListele(YAKIT, g.hucre)}`;
    case 'yildiz': {
      const renk = YILDIZ_RENK[g.renk] || YILDIZ_RENK[0];
      return `✨ "${g.isim || 'İsimsiz'}" takımyıldızı · ${g.sayi} ${renk.ad.toLowerCase()} yıldız`;
    }
  }
  return '';
}

// Admin sayfası ve dış kullanım için
window.UzayDestek = { renderGift, summarize, TURLER };
if (window.UZD_RENDER_ONLY) return;

// ─── Stiller ───
const CSS = `
.uzd-fab {
  position: fixed; top: 16px; right: 16px; z-index: 500;
  font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 0.72rem;
  letter-spacing: 0.12em; color: #ff8fc2; cursor: pointer;
  background: rgba(20, 8, 24, 0.75); border: 1.5px solid rgba(255, 95, 162, 0.55);
  border-radius: 30px; padding: 10px 18px; backdrop-filter: blur(6px);
  box-shadow: 0 0 16px rgba(255, 95, 162, 0.25);
  transition: all 0.3s ease; touch-action: manipulation;
}
.uzd-fab:hover {
  background: rgba(255, 95, 162, 0.18); color: #fff;
  box-shadow: 0 0 26px rgba(255, 95, 162, 0.5); transform: translateY(-2px);
}
.uzd-overlay {
  position: fixed; inset: 0; z-index: 1000; display: none;
  background: rgba(5, 5, 16, 0.85); backdrop-filter: blur(8px);
  overflow-y: auto; padding: 24px 14px;
}
.uzd-overlay.acik { display: flex; }
.uzd-modal {
  position: relative; margin: auto; width: min(860px, 100%);
  background: linear-gradient(165deg, #171029 0%, #0b0818 70%);
  border: 1px solid rgba(255, 95, 162, 0.28); border-radius: 24px;
  padding: 34px 30px 30px; box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,95,162,0.08);
  animation: uzdGiris 0.35s ease;
}
@keyframes uzdGiris { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: none; } }
.uzd-kapat {
  position: absolute; top: 16px; right: 16px; width: 36px; height: 36px;
  border-radius: 50%; border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); color: #aaa8c0; font-size: 1rem;
  cursor: pointer; transition: all 0.2s; line-height: 1;
}
.uzd-kapat:hover { background: rgba(255, 95, 162, 0.2); color: #fff; border-color: rgba(255,95,162,0.5); }
.uzd-baslik {
  font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 1.3rem;
  letter-spacing: 0.08em; color: #fff; text-align: center; margin-bottom: 8px;
  text-shadow: 0 0 24px rgba(255, 95, 162, 0.45);
}
.uzd-alt {
  text-align: center; color: #aaa8c0; font-size: 0.88rem; margin-bottom: 22px; line-height: 1.5;
}
.uzd-sekmeler { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 22px; }
.uzd-sekme {
  font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.82rem;
  color: #c8c2dd; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 30px;
  padding: 9px 16px; cursor: pointer; transition: all 0.25s; touch-action: manipulation;
}
.uzd-sekme:hover { border-color: rgba(255,95,162,0.5); }
.uzd-sekme.sec {
  color: #fff; background: rgba(255, 95, 162, 0.16);
  border-color: #ff5fa2; box-shadow: 0 0 16px rgba(255, 95, 162, 0.3);
}
.uzd-insa { display: flex; gap: 24px; margin-bottom: 24px; }
.uzd-ayarlar { flex: 1; min-width: 0; }
.uzd-onizleme {
  width: 240px; flex-shrink: 0; border-radius: 18px; padding: 12px 12px 16px;
  background: radial-gradient(circle at 50% 35%, rgba(125, 100, 220, 0.10), rgba(5,5,16,0.6) 75%);
  border: 1px solid rgba(255,255,255,0.09); text-align: center;
}
.uzd-onizleme svg { width: 100%; height: auto; display: block; }
.uzd-ozet { font-size: 0.78rem; color: #aaa8c0; line-height: 1.45; margin-top: 6px; min-height: 2.2em; }
.uzd-gbaslik {
  font-family: 'Orbitron', sans-serif; font-size: 0.66rem; letter-spacing: 0.18em;
  text-transform: uppercase; color: #8a84a8; margin: 16px 0 9px;
}
.uzd-gbaslik:first-child { margin-top: 0; }
.uzd-cipler { display: flex; flex-wrap: wrap; gap: 8px; }
.uzd-cip {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.82rem; color: #e8e0f0;
  background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.13);
  border-radius: 14px; padding: 8px 13px; cursor: pointer; transition: all 0.2s;
  user-select: none; touch-action: manipulation;
}
.uzd-cip:hover { border-color: #ff5fa2; transform: translateY(-1px); }
.uzd-cip.sec {
  background: rgba(255, 95, 162, 0.15); border-color: #ff5fa2;
  box-shadow: 0 0 12px rgba(255, 95, 162, 0.22);
}
.uzd-cip:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.uzd-nokta { width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px rgba(255,255,255,0.25) inset; }
.uzd-adet {
  font-size: 0.7rem; font-weight: 900; color: #050510; background: #ff8fc2;
  border-radius: 10px; padding: 1px 6px;
}
.uzd-arac { display: flex; gap: 8px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
.uzd-mini {
  font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.76rem; color: #aaa8c0;
  background: transparent; border: 1px solid rgba(255,255,255,0.16); border-radius: 12px;
  padding: 6px 12px; cursor: pointer; transition: all 0.2s; touch-action: manipulation;
}
.uzd-mini:hover { color: #fff; border-color: rgba(255,95,162,0.6); }
.uzd-sayac { font-size: 0.78rem; color: #8a84a8; font-weight: 700; }
.uzd-step { display: inline-flex; align-items: center; gap: 12px; }
.uzd-step button {
  width: 32px; height: 32px; border-radius: 50%; font-size: 1.05rem; font-weight: 900;
  color: #ff8fc2; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,95,162,0.4);
  cursor: pointer; transition: all 0.2s; line-height: 1; touch-action: manipulation;
}
.uzd-step button:hover { background: rgba(255,95,162,0.18); color: #fff; }
.uzd-step span { font-family: 'Orbitron', sans-serif; font-weight: 700; color: #fff; min-width: 20px; text-align: center; }
.uzd-form { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }
.uzd-form input, .uzd-form textarea {
  width: 100%; font-family: 'Nunito', sans-serif; font-size: 0.9rem; font-weight: 600;
  color: #e8e0f0; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.13); border-radius: 14px;
  padding: 12px 16px; margin-bottom: 12px; outline: none; transition: border-color 0.2s;
}
.uzd-form input:focus, .uzd-form textarea:focus { border-color: rgba(255, 95, 162, 0.6); }
.uzd-form textarea { resize: vertical; min-height: 84px; }
.uzd-satir { display: flex; gap: 12px; }
.uzd-satir input { flex: 1; min-width: 0; }
.uzd-gonder {
  display: block; width: 100%; font-family: 'Orbitron', sans-serif; font-weight: 700;
  font-size: 0.95rem; letter-spacing: 0.14em; color: #050510;
  background: linear-gradient(90deg, #ff5fa2, #b44eff); border: none; border-radius: 30px;
  padding: 14px; cursor: pointer; transition: all 0.25s;
  box-shadow: 0 0 24px rgba(255, 95, 162, 0.3); touch-action: manipulation;
}
.uzd-gonder:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 32px rgba(255, 95, 162, 0.5); }
.uzd-gonder:disabled { opacity: 0.55; cursor: wait; }
.uzd-durum { text-align: center; font-size: 0.84rem; font-weight: 700; margin: 10px 0 0; min-height: 1.3em; }
.uzd-durum.hata { color: #ff6a7a; }
.uzd-durum.bilgi { color: #8a84a8; }
.uzd-tesekkur { text-align: center; padding: 30px 10px 16px; }
.uzd-tesekkur .uzd-roket { font-size: 4rem; display: inline-block; animation: uzdUcus 1.6s ease-in-out infinite; }
@keyframes uzdUcus { 0%,100% { transform: translateY(0) rotate(-45deg); } 50% { transform: translateY(-14px) rotate(-45deg); } }
.uzd-tesekkur h3 {
  font-family: 'Orbitron', sans-serif; color: #fff; letter-spacing: 0.08em;
  margin: 18px 0 10px; font-size: 1.15rem;
}
.uzd-tesekkur p { color: #aaa8c0; font-size: 0.9rem; line-height: 1.6; margin-bottom: 22px; }
@media (max-width: 720px) {
  .uzd-fab { top: 10px; right: 10px; padding: 8px 14px; font-size: 0.66rem; }
  .uzd-modal { padding: 26px 18px 22px; }
  .uzd-insa { flex-direction: column-reverse; }
  .uzd-onizleme { width: min(240px, 100%); margin: 0 auto; }
  .uzd-satir { flex-direction: column; gap: 0; }
}
`;

// ─── Durum ───
const state = {
  tur: 'dondurma',
  dondurma: [],
  cikolata: [],
  yakit: [],
  gezegen: { renk: 0, doku: 'lekeler', halka: 'ince', uydu: 1, parilti: true },
  yildiz: { sayi: 5, renk: 0, seed: Math.random(), isim: '' }
};

function giftData() {
  const t = state.tur;
  if (t === 'dondurma') return state.dondurma.length ? { tur: t, top: state.dondurma.slice() } : null;
  if (t === 'cikolata') return state.cikolata.length ? { tur: t, parca: state.cikolata.slice() } : null;
  if (t === 'yakit') return state.yakit.length ? { tur: t, hucre: state.yakit.slice() } : null;
  if (t === 'gezegen') return Object.assign({ tur: t }, state.gezegen);
  return Object.assign({ tur: t }, state.yildiz);
}

// ─── Arayüzü Enjekte Et ───
const stilEl = document.createElement('style');
stilEl.textContent = CSS;
document.head.appendChild(stilEl);

const fab = document.createElement('button');
fab.className = 'uzd-fab';
fab.innerHTML = '💜 DESTEK OL';
fab.setAttribute('aria-label', 'Geliştiriciye destek ol');
document.body.appendChild(fab);

const overlay = document.createElement('div');
overlay.className = 'uzd-overlay';
overlay.innerHTML = `
  <div class="uzd-modal" role="dialog" aria-modal="true">
    <button class="uzd-kapat" aria-label="Kapat">✕</button>
    <h2 class="uzd-baslik">GELİŞTİRİCİYE DESTEK OL</h2>
    <p class="uzd-alt">Uzaydan bir hediye tasarla, istersen yanına mesajını ekle —<br>hepsi geliştiricinin gelen kutusuna fırlatılır 💌</p>
    <div id="uzdGovde">
      <div class="uzd-sekmeler" id="uzdSekmeler"></div>
      <div class="uzd-insa">
        <div class="uzd-ayarlar" id="uzdAyarlar"></div>
        <div class="uzd-onizleme"><div id="uzdSvg"></div><div class="uzd-ozet" id="uzdOzet"></div></div>
      </div>
      <div class="uzd-form">
        <div class="uzd-satir">
          <input id="uzdIsim" maxlength="60" placeholder="Adın (istersen)">
          <input id="uzdEposta" type="email" maxlength="100" placeholder="E-postan (cevap istersen)">
        </div>
        <textarea id="uzdMesaj" maxlength="2000" placeholder="Geliştiriciye mesajın... (istersen)"></textarea>
        <button class="uzd-gonder" id="uzdGonder">🚀 GÖNDER</button>
        <p class="uzd-durum" id="uzdDurum"></p>
      </div>
    </div>
  </div>`;
document.body.appendChild(overlay);

const $ = id => document.getElementById(id);
const modal = overlay.querySelector('.uzd-modal');

// ─── Çizimler ───
function cizSekmeler() {
  $('uzdSekmeler').innerHTML = TURLER.map(t =>
    `<button class="uzd-sekme${t.id === state.tur ? ' sec' : ''}" data-sekme="${t.id}">${t.e} ${t.ad}</button>`
  ).join('');
}

function cizOnizleme() {
  $('uzdSvg').innerHTML = renderGift(giftData() || { tur: state.tur, top: [], parca: [], hucre: [] });
  const g = giftData();
  $('uzdOzet').textContent = g ? summarize(g) : 'Henüz bir şey seçilmedi';
}

function listeAyarlar(defs, secimler, maxN, birim) {
  const sayilar = {};
  secimler.forEach(id => { sayilar[id] = (sayilar[id] || 0) + 1; });
  const dolu = secimler.length >= maxN;
  return `<div class="uzd-gbaslik">Çeşitler — eklemek için tıkla</div>
    <div class="uzd-cipler">${defs.map(f =>
      `<button class="uzd-cip" data-ekle="${f.id}" ${dolu ? 'disabled' : ''}>` +
      `<span class="uzd-nokta" style="background:${f.c2}"></span>${f.ad}` +
      (sayilar[f.id] ? `<span class="uzd-adet">×${sayilar[f.id]}</span>` : '') +
      `</button>`).join('')}</div>
    <div class="uzd-arac">
      <span class="uzd-sayac">${secimler.length}/${maxN} ${birim}</span>
      <button class="uzd-mini" data-eylem="geri">↩ Geri Al</button>
      <button class="uzd-mini" data-eylem="temizle">🗑 Temizle</button>
    </div>`;
}

function cizAyarlar() {
  const t = state.tur;
  let html = '';
  if (t === 'dondurma') html = listeAyarlar(DONDURMA, state.dondurma, MAX.dondurma, 'top');
  else if (t === 'cikolata') html = listeAyarlar(CIKOLATA, state.cikolata, MAX.cikolata, 'sıra');
  else if (t === 'yakit') html = listeAyarlar(YAKIT, state.yakit, MAX.yakit, 'hücre');
  else if (t === 'gezegen') {
    const g = state.gezegen;
    html = `<div class="uzd-gbaslik">Renk</div><div class="uzd-cipler">${GEZEGEN_RENK.map((r, i) =>
        `<button class="uzd-cip${i === g.renk ? ' sec' : ''}" data-gz="renk" data-v="${i}">` +
        `<span class="uzd-nokta" style="background:${r.base}"></span>${r.ad}</button>`).join('')}</div>
      <div class="uzd-gbaslik">Yüzey</div><div class="uzd-cipler">${GEZEGEN_DOKU.map(d =>
        `<button class="uzd-cip${d.id === g.doku ? ' sec' : ''}" data-gz="doku" data-v="${d.id}">${d.ad}</button>`).join('')}</div>
      <div class="uzd-gbaslik">Halka</div><div class="uzd-cipler">${GEZEGEN_HALKA.map(h =>
        `<button class="uzd-cip${h.id === g.halka ? ' sec' : ''}" data-gz="halka" data-v="${h.id}">${h.ad}</button>`).join('')}</div>
      <div class="uzd-gbaslik">Uydu</div><div class="uzd-cipler">${[0, 1, 2, 3].map(n =>
        `<button class="uzd-cip${n === g.uydu ? ' sec' : ''}" data-gz="uydu" data-v="${n}">${n === 0 ? 'Yok' : n + ' uydu'}</button>`).join('')}</div>
      <div class="uzd-gbaslik">Atmosfer Parıltısı</div><div class="uzd-cipler">
        <button class="uzd-cip${g.parilti ? ' sec' : ''}" data-gz="parilti" data-v="1">Açık</button>
        <button class="uzd-cip${!g.parilti ? ' sec' : ''}" data-gz="parilti" data-v="0">Kapalı</button>
      </div>`;
  } else if (t === 'yildiz') {
    const y = state.yildiz;
    html = `<div class="uzd-gbaslik">Yıldız Sayısı</div>
      <div class="uzd-step">
        <button data-yz="eksi" aria-label="Azalt">−</button><span>${y.sayi}</span><button data-yz="arti" aria-label="Artır">+</button>
      </div>
      <div class="uzd-gbaslik">Renk</div><div class="uzd-cipler">${YILDIZ_RENK.map((r, i) =>
        `<button class="uzd-cip${i === y.renk ? ' sec' : ''}" data-yz="renk" data-v="${i}">` +
        `<span class="uzd-nokta" style="background:${r.c}"></span>${r.ad}</button>`).join('')}</div>
      <div class="uzd-gbaslik">Takımyıldızının Adı</div>
      <input id="uzdYzIsim" maxlength="30" placeholder="örn. Sedef Takımyıldızı" value="${esc(y.isim)}"
        style="width:100%;font-family:Nunito,sans-serif;font-size:0.88rem;font-weight:600;color:#e8e0f0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.13);border-radius:14px;padding:11px 15px;outline:none;">
      <div class="uzd-arac"><button class="uzd-mini" data-yz="karistir">🎲 Yıldızları Karıştır</button></div>`;
  }
  $('uzdAyarlar').innerHTML = html;
}

function cizHepsi() {
  cizSekmeler();
  cizAyarlar();
  cizOnizleme();
}

// ─── Olaylar ───
function ac() {
  overlay.classList.add('acik');
  document.body.style.overflow = 'hidden';
  cizHepsi();
}
function kapat() {
  overlay.classList.remove('acik');
  document.body.style.overflow = '';
}

fab.addEventListener('click', ac);
overlay.addEventListener('click', e => { if (e.target === overlay) kapat(); });
modal.querySelector('.uzd-kapat').addEventListener('click', kapat);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('acik')) kapat();
});

modal.addEventListener('click', e => {
  const el = e.target.closest('[data-sekme],[data-ekle],[data-eylem],[data-gz],[data-yz]');
  if (!el) return;

  if (el.dataset.sekme) {
    state.tur = el.dataset.sekme;
    cizHepsi();
    return;
  }
  const liste = state[state.tur]; // dondurma / cikolata / yakit dizileri
  if (el.dataset.ekle !== undefined && Array.isArray(liste)) {
    if (liste.length < MAX[state.tur]) liste.push(el.dataset.ekle);
    cizAyarlar(); cizOnizleme();
    return;
  }
  if (el.dataset.eylem && Array.isArray(liste)) {
    if (el.dataset.eylem === 'geri') liste.pop();
    else liste.length = 0;
    cizAyarlar(); cizOnizleme();
    return;
  }
  if (el.dataset.gz) {
    const k = el.dataset.gz, v = el.dataset.v;
    if (k === 'renk' || k === 'uydu') state.gezegen[k] = parseInt(v, 10);
    else if (k === 'parilti') state.gezegen.parilti = v === '1';
    else state.gezegen[k] = v;
    cizAyarlar(); cizOnizleme();
    return;
  }
  if (el.dataset.yz) {
    const y = state.yildiz;
    if (el.dataset.yz === 'eksi') y.sayi = Math.max(3, y.sayi - 1);
    else if (el.dataset.yz === 'arti') y.sayi = Math.min(9, y.sayi + 1);
    else if (el.dataset.yz === 'renk') y.renk = parseInt(el.dataset.v, 10);
    else if (el.dataset.yz === 'karistir') y.seed = Math.random();
    cizAyarlar(); cizOnizleme();
  }
});

// Takımyıldız adı: yeniden çizmeden sadece önizlemeyi güncelle (odak kaybolmasın)
modal.addEventListener('input', e => {
  if (e.target.id === 'uzdYzIsim') {
    state.yildiz.isim = e.target.value;
    cizOnizleme();
  }
});

// ─── Gönderim ───
function durum(metin, sinif) {
  const d = $('uzdDurum');
  d.textContent = metin;
  d.className = 'uzd-durum' + (sinif ? ' ' + sinif : '');
}

// Gövde teşekkür ekranından sonra yeniden kurulduğu için delegasyonla dinle
modal.addEventListener('click', e => {
  if (e.target.closest('#uzdGonder')) gonder();
  if (e.target.closest('#uzdBitti')) {
    kapat();
    state.dondurma = []; state.cikolata = []; state.yakit = [];
    sifirlaGovde();
  }
});

async function gonder() {
  const hediye = giftData();
  const isim = $('uzdIsim').value.trim();
  const eposta = $('uzdEposta').value.trim();
  const mesaj = $('uzdMesaj').value.trim();

  if (!hediye && !mesaj) {
    durum('Önce bir hediye hazırla ya da bir mesaj yaz 🙂', 'hata');
    return;
  }
  if (WEB3FORMS_KEY.indexOf('BURAYA') === 0) {
    durum('Gönderim henüz yapılandırılmamış (Web3Forms anahtarı eksik).', 'hata');
    return;
  }

  const ozet = summarize(hediye);
  const veri = {
    hediye: hediye,
    isim: isim || null,
    eposta: eposta || null,
    mesaj: mesaj || null,
    tarih: new Date().toISOString()
  };
  // Hediye verisi linkin içinde kodlu: hediye/ sayfası bunu çözüp SVG'yi
  // birebir yeniden çizer. Mailden tıklayınca hediye kartı açılır.
  let hediyeLink = null;
  if (hediye) {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(veri))));
    // file:// ile yerel testte bile mailde canlı site adresi görünsün
    const kok = location.protocol.indexOf('http') === 0
      ? new URL('hediye/', location.href).href
      : 'https://uzay.zone/hediye/';
    hediyeLink = kok + '#' + b64;
  }
  const gov = [
    '🎁 Hediye: ' + ozet,
    '👤 İsim: ' + (isim || 'Anonim'),
    '💬 Mesaj: ' + (mesaj || '-')
  ];
  if (hediyeLink) gov.push('', '🖼 Hediyeyi görüntüle: ' + hediyeLink);
  gov.push('', 'UZAYZONE_DATA:' + JSON.stringify(veri));

  const istek = {
    access_key: WEB3FORMS_KEY,
    subject: 'Uzay Zone Destek · ' + ozet.slice(0, 70),
    from_name: isim || 'Uzay Zone Ziyaretçisi',
    message: gov.join('\n'),
    botcheck: ''
  };
  if (eposta) istek.email = eposta;

  const buton = $('uzdGonder');
  buton.disabled = true;
  durum('Fırlatılıyor... 🛰', 'bilgi');
  try {
    const yanit = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(istek)
    });
    const sonuc = await yanit.json();
    if (!sonuc.success) throw new Error(sonuc.message || 'Gönderilemedi');
    if (window.gtag) gtag('event', 'destek_gonder', { hediye_turu: hediye ? hediye.tur : 'mesaj' });
    $('uzdGovde').innerHTML = `
      <div class="uzd-tesekkur">
        <span class="uzd-roket">🚀</span>
        <h3>MESAJIN UZAYA FIRLATILDI!</h3>
        <p>${hediye ? esc(ozet) + '<br>' : ''}Hediyen ve mesajın geliştiriciye ulaştı. Teşekkürler! 💜</p>
        <button class="uzd-gonder" id="uzdBitti" style="max-width:240px;margin:0 auto;">KAPAT</button>
      </div>`;
  } catch (err) {
    buton.disabled = false;
    durum('Bir sorun oldu, tekrar dener misin? (' + err.message + ')', 'hata');
  }
}

// Teşekkür ekranından sonra modal gövdesini ilk haline döndür
const ilkGovde = $('uzdGovde').innerHTML;
function sifirlaGovde() {
  $('uzdGovde').innerHTML = ilkGovde;
  cizHepsi();
}

})();

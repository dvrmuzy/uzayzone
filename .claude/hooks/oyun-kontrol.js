#!/usr/bin/env node
// PostToolUse hook: bir oyun klasörünün index.html'i yazıldıktan sonra
// portal sözleşmesini denetler. Eksik varsa modele geri bildirir.
//
// stdin: { tool_name, tool_input: { file_path }, tool_response: { filePath } }
// Çıktı: sorun varsa {"decision":"block","reason":...}, temizse hiçbir şey.

const fs = require('fs');

// Oyun olmayan üst düzey klasörler
const OYUN_DEGIL = new Set(['admin', 'hediye', 'logo', '.claude', 'node_modules']);

function oku(stdin) {
  try { return JSON.parse(stdin); } catch { return null; }
}

function oyunDosyasiMi(p) {
  const yol = p.replace(/\\/g, '/');
  const i = yol.toLowerCase().lastIndexOf('/uzayzone/');
  if (i === -1) return null;
  const parcalar = yol.slice(i + '/uzayzone/'.length).split('/');
  // tam olarak <klasor>/index.html olmalı — kök index.html veya derin yollar değil
  if (parcalar.length !== 2) return null;
  if (parcalar[1].toLowerCase() !== 'index.html') return null;
  if (OYUN_DEGIL.has(parcalar[0])) return null;
  return parcalar[0];
}

// Bir id'nin bir yerde tanımlandığına dair kanıt: id="x", id='x', el.id = 'x', {id:'x'}
function idTanimliMi(html, id) {
  const q = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`id\\s*[=:]\\s*["'\`]?${q}["'\`]?`).test(html);
}

function denetle(html) {
  const sorunlar = [];

  if (!/<script[^>]+src=["']\.\.\/analytics\.js["']/i.test(html)) {
    sorunlar.push(
      'Google Analytics eksik. </head> öncesine ekle: <script src="../analytics.js"></script>'
    );
  }

  if (!/<a[^>]+href=["']\.\.\/?["']/i.test(html)) {
    sorunlar.push(
      'Ana Sayfa dönüş butonu yok (href="../"). references/portal-entegrasyon.md bölüm 2.'
    );
  }

  if (!/<html[^>]+lang=["']tr["']/i.test(html)) {
    sorunlar.push('<html> etiketinde lang="tr" yok.');
  }

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    sorunlar.push('viewport meta etiketi yok — mobilde bozuk görünür.');
  }

  // JS'in aradığı ama HTML'de hiç olmayan id'ler — yarım kalmış panelin gerçek belirtisi.
  // (Panel ID isimlerini dayatmıyoruz; oyunlar farklı şemalar kullanabiliyor.)
  const aranan = new Set();
  for (const m of html.matchAll(/getElementById\(\s*['"`]([A-Za-z0-9_-]+)['"`]\s*\)/g)) {
    aranan.add(m[1]);
  }
  for (const m of html.matchAll(/querySelector(?:All)?\(\s*['"`]#([A-Za-z0-9_-]+)['"`]\s*\)/g)) {
    aranan.add(m[1]);
  }
  const bagsiz = [...aranan].filter((id) => !idTanimliMi(html, id));
  if (bagsiz.length) {
    sorunlar.push(
      `JS şu id'leri arıyor ama hiçbir yerde tanımlı değil: ${bagsiz.join(', ')} — ` +
        'çalışma anında null hatası verir.'
    );
  }

  // Belgelenmiş tuzak: CSS'te display:none olan elemanı style.display='' ile açmaya çalışmak
  for (const m of html.matchAll(
    /getElementById\(\s*['"`]([A-Za-z0-9_-]+)['"`]\s*\)\s*\.style\.display\s*=\s*(?:''|"")/g
  )) {
    const id = m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`#${id}\\b[^{}]*\\{[^}]*display\\s*:\\s*none`, 'i').test(html)) {
      sorunlar.push(
        `#${m[1]} CSS'te display:none, ama style.display='' ile açılmaya çalışılıyor — ` +
          "inline stil silinince eleman gizli kalır. classList.toggle('on') + .on{display:flex} kullan."
      );
    }
  }

  return sorunlar;
}

let girdi = '';
process.stdin.on('data', (d) => (girdi += d));
process.stdin.on('end', () => {
  const veri = oku(girdi);
  if (!veri) process.exit(0);

  const yol =
    (veri.tool_response && veri.tool_response.filePath) ||
    (veri.tool_input && veri.tool_input.file_path);
  if (!yol) process.exit(0);

  const oyun = oyunDosyasiMi(yol);
  if (!oyun) process.exit(0);

  let html;
  try { html = fs.readFileSync(yol, 'utf8'); } catch { process.exit(0); }

  const sorunlar = denetle(html);
  if (!sorunlar.length) process.exit(0);

  const reason =
    `[${oyun}/index.html] portal kontrolü ${sorunlar.length} sorun buldu:\n` +
    sorunlar.map((s, i) => `${i + 1}. ${s}`).join('\n');

  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason,
      systemMessage: `⚠ ${oyun}/index.html: ${sorunlar.length} portal kontrolü uyarısı`,
    })
  );
  process.exit(0);
});

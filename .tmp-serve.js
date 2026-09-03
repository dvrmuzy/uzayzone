// Geçici yerel sunucu (ES modülleri file:// ile çalışmadığı için)
const http = require('http'), fs = require('fs'), path = require('path');
const TIP = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const dosya = path.join(process.cwd(), p);
  fs.readFile(dosya, (e, d) => {
    if (e) { res.writeHead(404); res.end('yok'); return; }
    res.writeHead(200, { 'Content-Type': TIP[path.extname(dosya)] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(4173, () => console.log('http://localhost:4173/'));

/* Hizli gorsel kontrol: oyunu acar, istenen asamaya atlar, ekran goruntusu alir.
 * Tam oynanis testi (oyna-test.mjs) 15 dakika suruyor; isik/doku ayari yaparken
 * o kadar beklenmez.
 *
 *   node blender/bak.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const KOK = path.resolve(import.meta.dirname, '..');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CIKTI = path.join(import.meta.dirname, 'test-ciktilari');
fs.mkdirSync(CIKTI, { recursive: true });

const KANCA = `
window.__b={
  get hazir(){return hazir;}, get asama(){return asama;}, get bitti(){return bitti;},
  basla(){document.getElementById('startBtn').click();},
  // butun parcalari aninda tak, kablo asamasina gec
  hepsiniTak(){
    vidalar.forEach(v=>{v.visible=false;v.userData.sokuldu=true;});
    if(KAPAK)KAPAK.visible=false;
    kapakAciliyor=false;
    PARCALAR.forEach(p=>{const k=parcaKayit[p.id];
      k.mesh.visible=true;k.toz.visible=false;k.durum='takildi';
      k.mesh.position.set(p.pos[0],p.pos[1],p.pos[2]);
      k.yuva.visible=false;k.etiket.visible=false;});
    takilan=PARCALAR.length;sira=PARCALAR.length-1;ilerleme();
    asamaKablo();
  },
  kablolariBagla(){ // kablolari ciz, calistir asamasina gec
    KABLOLAR.forEach(K=>{
      const e=new THREE.CatmullRomCurve3(K.yol.map(v=>new THREE.Vector3(...v)));
      const t=new THREE.Mesh(new THREE.TubeGeometry(e,40,K.r,9,false),
        new THREE.MeshStandardMaterial({color:K.renk,roughness:.55,metalness:.12}));
      scene.add(t);kabloNesneleri.push(t);
    });
    if(kabloHedefi){isaretciSil(kabloHedefi);kabloHedefi=null;}
    kabloSira=KABLOLAR.length;asamaCalistir();
  },
  calistir(){ calistir(); },
  ekranTani(){return JSON.stringify({ekranVar:!!EKRAN, ad:EKRAN&&EKRAN.name, matEsit:EKRAN&&EKRAN.material===ekranMat, mod:monitorMod, parlak:monitorParlak, emis:ekranMat.emissiveIntensity, renk:ekranMat.color.getHex(), gorunur:EKRAN&&EKRAN.visible, dunyaZ:EKRAN&&EKRAN.getWorldPosition(new THREE.Vector3()).z, kamZ:camera.position.z, kamY:camera.position.y});},
  // tek bir parcayi hazirlik noktasina getir (temizleme ekrani)
  parcaGoster(i){ asamaParca(i); },
  kilavuzTest(){ const k=parcaKayit['ekran']; k.mesh.position.set(-2.2,SURUKLE_Y,1.4); kilavuzGoster(-2.2,1.4,k.def.pos[1],false); k.yuva.visible=true; },
  kameraKoy(px,py,pz,tx,ty,tz){camera.position.set(px,py,pz);controls.target.set(tx,ty,tz);controls.update();}
};
`;
const html = fs.readFileSync(path.join(KOK, 'index.html'), 'utf8');
const i = html.lastIndexOf('</script>');
fs.writeFileSync(path.join(KOK, '_bak.html'), html.slice(0, i) + KANCA + html.slice(i));

const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'uzedge-'));
const edge = spawn(EDGE, [
  '--headless=new', '--remote-debugging-port=9334', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--mute-audio',
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=1200,780', `--user-data-dir=${profil}`, 'about:blank'
], { stdio: 'ignore' });

const bekle = ms => new Promise(r => setTimeout(r, ms));
const hatalar = [];
let ws, sayac = 0;
const bekleyen = new Map();
const cdp = (method, params = {}) => {
  const id = ++sayac;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => bekleyen.set(id, { res, rej }));
};
async function ev(e) {
  const r = await cdp('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval');
  return r.result.value;
}
async function bekleKosul(e, ad, sn = 180) {
  for (let n = 0; n < sn * 10; n++) { if (await ev(e)) return; await bekle(100); }
  throw new Error('zaman asimi: ' + ad);
}
async function ss(ad) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(CIKTI, ad + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  -> ' + ad + '.png');
}

try {
  let t;
  for (let n = 0; n < 60 && !t; n++) {
    try { t = (await (await fetch('http://127.0.0.1:9334/json/list')).json()).find(x => x.type === 'page'); } catch {}
    if (!t) await bekle(500);
  }
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  ws.onmessage = e2 => {
    const m = JSON.parse(e2.data);
    if (m.id && bekleyen.has(m.id)) { const p = bekleyen.get(m.id); bekleyen.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') hatalar.push('HATA: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
      hatalar.push(m.params.type + ': ' + m.params.args.map(a => a.description || a.value).join(' '));
  };
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Page.navigate', { url: 'http://127.0.0.1:4177/bilgisayar-toplama/_bak.html' });
  await bekleKosul('!!(window.__b && __b.hazir)', 'modeller');
  await bekle(2500);
  await ss('b1-giris');

  await ev('__b.basla()');
  await bekle(4000);
  await ss('b2-vidalar');

  await ev('__b.hepsiniTak()');
  await bekle(5000);
  await ss('b3-hepsi-takili');

  await ev('__b.parcaGoster(6)');   // ekran karti temizleme ekrani
  await bekle(20000);
  await ss('b4-temizleme');

  await ev('__b.kilavuzTest()');
  await bekle(4000);
  await ss('b4b-kilavuz');

  await ev('__b.hepsiniTak();__b.kablolariBagla()');
  await bekle(5000);
  await ss('b5-kablolu');

  await ev('__b.calistir()');
  await bekle(46000);
  console.log('EKRAN:', await ev('__b.ekranTani()'));
  await ss('b6-monitor');
  await bekle(30000);
  console.log('mini oyun acildi:', await ev('!!document.getElementById("uzay-ov")'));
  await ss('b7-mini-oyun');

  console.log('konsol hatalari:', hatalar.length);
  hatalar.slice(0, 10).forEach(h => console.log('  ! ' + h));
} catch (e) {
  console.log('KIRILDI:', e.message);
  hatalar.slice(0, 10).forEach(h => console.log('  ! ' + h));
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch {}
  edge.kill();
  fs.rmSync(path.join(KOK, '_bak.html'), { force: true });
}

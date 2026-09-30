/* Bilgisayar Toplama — uctan uca otomatik oynama testi.
 *
 * Tarayici eklentisi olmadan 3B oyunu dogrulamanin yolu: Edge'i headless
 * baslatip CDP ile gercek fare olaylari gonderiyoruz. index.html'in bir
 * KOPYASINA kucuk bir test kancasi enjekte ediliyor (asil dosyaya degil).
 *
 *   node blender/oyna-test.mjs          (sunucu :4177'de acik olmali)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const KOK = path.resolve(import.meta.dirname, '..');
const PORT = 4177;
const TABAN = `http://127.0.0.1:${PORT}/bilgisayar-toplama`;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CIKTI = path.join(import.meta.dirname, 'test-ciktilari');
fs.mkdirSync(CIKTI, { recursive: true });

// ---------------------------------------------------------------- test kopyasi
const KANCA = `
window.__t={
  get asama(){return asama;}, get takilan(){return takilan;}, get hazir(){return hazir;},
  get bitti(){return bitti;}, get sira(){return sira;}, get kabloSira(){return kabloSira;},
  get parcaId(){return PARCALAR[sira]&&PARCALAR[sira].id;},
  get durum(){const k=parcaKayit[PARCALAR[sira]&&PARCALAR[sira].id];return k&&k.durum;},
  get toz(){const k=parcaKayit[PARCALAR[sira]&&PARCALAR[sira].id];return k&&k.tozSeviye;},
  get vidaKalan(){return vidalar.filter(v=>!v.userData.sokuldu).length;},
  get vidaAnim(){return !!vidaAnim;},
  tani(){const m=macunIsaret;if(!m)return "isaretci YOK";const pp=m.isaret.position;const e=this.proj(pp.x,pp.y,pp.z);
    const r=new THREE.Raycaster();const v=new THREE.Vector2((e.x/innerWidth)*2-1,-(e.y/innerHeight)*2+1);
    r.setFromCamera(v,camera);
    return JSON.stringify({dunya:[pp.x,pp.y,pp.z],ekran:e,vp:[innerWidth,innerHeight],vurusSayisi:r.intersectObject(m.isaret,true).length,gorunur:m.isaret.visible,mesafe:new THREE.Ray(r.ray.origin,r.ray.direction).distanceToPoint(pp),ilkVurus:(r.intersectObject(scene,true)[0]||{}).object&&r.intersectObject(scene,true)[0].object.name,kameraGuncel:camera.matrixWorldAutoUpdate});},
  durumu(){return JSON.stringify({asama,sira,takilan,kapakAciliyor,kapakT,vidaSokulen,parcaSayisi:Object.keys(parcaKayit).length,kapakVar:!!KAPAK,tikAkiyor:window.__tik});},
  basla(){document.getElementById('startBtn').click();},
  proj(x,y,z){const v=new THREE.Vector3(x,y,z).project(camera);
    return {x:(v.x*0.5+0.5)*innerWidth,y:(-v.y*0.5+0.5)*innerHeight};},
  vidaNokta(i){const v=vidalar.find(v=>!v.userData.sokuldu);if(!v)return null;
    return this.proj(v.position.x,v.position.y+0.05,v.position.z);},
  // tutma noktasi: parcanin 3B kutu merkezi — dik duran karti da ıskalamaz
  parcaNokta(){const k=parcaKayit[PARCALAR[sira].id];
    const c=new THREE.Box3().setFromObject(k.mesh).getCenter(new THREE.Vector3());
    return this.proj(c.x,c.y,c.z);},
  // birakma noktasi: oyunun tutmaFarki hesabini birebir taklit eder
  birakNokta(sx,sy){const k=parcaKayit[PARCALAR[sira].id];
    const r=new THREE.Raycaster();
    r.setFromCamera(new THREE.Vector2((sx/innerWidth)*2-1,-(sy/innerHeight)*2+1),camera);
    const h=new THREE.Vector3();
    r.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-SURUKLE_Y),h);
    const fark=k.mesh.position.clone().sub(h);fark.y=0;
    const hedef=new THREE.Vector3(k.def.pos[0],SURUKLE_Y,k.def.pos[2]).sub(fark);
    return this.proj(hedef.x,SURUKLE_Y,hedef.z);},
  cpuNokta(){if(!macunIsaret)return null;const p=macunIsaret.isaret.position;return this.proj(p.x,p.y,p.z);},
  kabloNokta(){if(!kabloHedefi)return null;const p=kabloHedefi.isaret.position;
    return this.proj(p.x,p.y,p.z);},
  gucNokta(){const b=new THREE.Box3().setFromObject(GUC_DUGMESI);
    const c=b.getCenter(new THREE.Vector3());return this.proj(c.x,c.y,c.z+0.2);}
};
`;
const html = fs.readFileSync(path.join(KOK, 'index.html'), 'utf8');
const i = html.lastIndexOf('</script>');
fs.writeFileSync(path.join(KOK, '_test.html'), html.slice(0, i) + KANCA + html.slice(i));

// ---------------------------------------------------------------- CDP istemcisi
const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'uzedge-'));
const edge = spawn(EDGE, [
  '--headless=new', '--remote-debugging-port=9333', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--mute-audio',
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--window-size=960,640', `--user-data-dir=${profil}`, 'about:blank'
], { stdio: 'ignore' });

const bekle = ms => new Promise(r => setTimeout(r, ms));

async function hedefBul() {
  for (let n = 0; n < 60; n++) {
    try {
      const r = await fetch('http://127.0.0.1:9333/json/list');
      const t = (await r.json()).find(x => x.type === 'page');
      if (t) return t;
    } catch {}
    await bekle(500);
  }
  throw new Error('Edge CDP acilmadi');
}

const hatalar = [];
let ws, sayac = 0;
const bekleyen = new Map();
function cdp(method, params = {}) {
  const id = ++sayac;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => bekleyen.set(id, { res, rej }));
}

async function baglan(t) {
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && bekleyen.has(m.id)) {
      const p = bekleyen.get(m.id); bekleyen.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      hatalar.push('HATA: ' + (d.exception?.description || d.text));
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      hatalar.push(m.params.type.toUpperCase() + ': ' +
        m.params.args.map(a => a.description || a.value).join(' '));
    }
  };
  await cdp('Runtime.enable');
  await cdp('Page.enable');
}

async function ev(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval hatasi');
  return r.result.value;
}
async function bekleKosul(expr, ad, sn = 150) {
  for (let n = 0; n < sn * 10; n++) {
    if (await ev(expr)) return true;
    await bekle(100);
  }
  throw new Error('zaman asimi: ' + ad + '  (' + expr + ')');
}
async function fare(tip, x, y) {
  await cdp('Input.dispatchMouseEvent', {
    type: tip, x: Math.round(x), y: Math.round(y),
    button: 'left', buttons: tip === 'mouseReleased' ? 0 : 1, clickCount: 1,
    pointerType: 'mouse'
  });
}
async function tiklaTekrar(noktaFn, kosul, ad, deneme = 12) {
  for (let i = 0; i < deneme; i++) {
    const j = await ev('JSON.stringify(' + noktaFn + ')');
    if (j && j !== 'null') await tikla(JSON.parse(j));
    for (let w = 0; w < 25; w++) { if (await ev(kosul)) return; await bekle(100); }
  }
  throw new Error('tiklama tutmadi: ' + ad);
}
async function tikla(p) { await fare('mousePressed', p.x, p.y); await bekle(60); await fare('mouseReleased', p.x, p.y); }
async function ss(ad) {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(CIKTI, ad + '.png'), Buffer.from(r.data, 'base64'));
}

// ---------------------------------------------------------------- senaryo
const adimlar = [];
function not(s) { adimlar.push(s); console.log('  ' + s); }

try {
  const t = await hedefBul();
  await baglan(t);
  await cdp('Page.navigate', { url: TABAN + '/_test.html' });
  await bekle(1500);

  console.log('1) modeller yukleniyor...');
  await bekleKosul('!!(window.__t && __t.hazir)', 'modeller yuklendi', 90);
  not('modeller yuklendi, giris ekrani hazir');
  await ss('01-giris');

  await ev('__t.basla()');
  await bekleKosul("__t.asama==='vida'", 'vida asamasi');
  not('oyun basladi — vida asamasi');
  await ss('02-vidalar');

  console.log('2) 4 vida sokuluyor...');
  for (let v = 0; v < 4; v++) {
    const p = await ev('JSON.stringify(__t.vidaNokta())');
    if (!p) throw new Error('vida ekran noktasi yok');
    await tikla(JSON.parse(p));
    await bekleKosul(`__t.vidaKalan===${3 - v}`, 'vida ' + (v + 1));
    await bekleKosul('!__t.vidaAnim', 'vida animasyonu ' + (v + 1));
  }
  not('4 vida sokuldu');
  await bekleKosul("__t.asama==='parca'", 'kapak acildi', 200);
  not('kapak kalkti, parca asamasi basladi');
  await ss('03-kasa-acik');

  console.log('3) 12 parca temizlenip takiliyor...');
  for (let n = 0; n < 12; n++) {
    await bekleKosul("__t.durum==='kirli'", 'parca ' + n + ' geldi', 200);
    const id = await ev('__t.parcaId');

    // firçalama: parca uzerinde ileri-geri surt
    let p = JSON.parse(await ev('JSON.stringify(__t.parcaNokta())'));
    await fare('mousePressed', p.x, p.y);
    for (let s = 0; s < 220 && (await ev('__t.durum')) === 'kirli'; s++) {
      const dx = (s % 2 ? 1 : -1) * 55;
      await fare('mouseMoved', p.x + dx, p.y + (s % 4 < 2 ? 12 : -12));
    }
    await fare('mouseReleased', p.x, p.y);
    if ((await ev('__t.durum')) !== 'temiz') throw new Error(id + ' temizlenemedi (toz=' + await ev('__t.toz') + ')');

    // takma: parcayi tut, yuvasina goturup birak
    for (let deneme = 0; deneme < 8 && (await ev('__t.takilan')) === n; deneme++) {
      p = JSON.parse(await ev('JSON.stringify(__t.parcaNokta())'));
      const q = JSON.parse(await ev(`JSON.stringify(__t.birakNokta(${p.x},${p.y}))`));
      await fare('mousePressed', p.x, p.y);
      for (let s = 1; s <= 12; s++) await fare('mouseMoved', p.x + (q.x - p.x) * s / 12, p.y + (q.y - p.y) * s / 12);
      await bekle(80);
      await fare('mouseReleased', q.x, q.y);
      for (let w = 0; w < 30 && (await ev('__t.takilan')) === n; w++) await bekle(100);
    }
    await bekleKosul(`__t.takilan===${n + 1}`, id + ' takildi', 120);
    not('takildi: ' + id);
    if (n === 4) await ss('04-yarida');

    // isemciden sonra termal macun adimi
    if (id === 'cpu') {
      await bekleKosul("__t.asama==='macun'", 'macun asamasi');
      await tiklaTekrar('__t.cpuNokta()', "__t.asama==='parca'", 'macun');
      not('termal macun suruldu');
    }
  }
  await ss('05-parcalar-takili');

  console.log('4) kablolar baglaniyor...');
  await bekleKosul("__t.asama==='kablo'", 'kablo asamasi', 200);
  for (let k = 0; k < 3; k++) {
    await bekleKosul('!!__t.kabloNokta()', 'kablo ucu ' + k, 200);
    await tiklaTekrar('__t.kabloNokta()', `__t.kabloSira===${k + 1}`, 'kablo ' + (k + 1));
  }
  not('3 kablo baglandi');

  console.log('5) calistiriliyor...');
  await bekleKosul("__t.asama==='calistir'", 'calistir asamasi', 200);
  await ss('06-calistirmaya-hazir');
  await tiklaTekrar('__t.gucNokta()', '__t.bitti', 'guc dugmesi');
  not('bilgisayar calisti');
  await bekle(9000);
  await ss('07-acilis');
  await bekle(14000);
  await ss('08-mini-oyun');
  const oyunVar = await ev('!!document.getElementById("uzay-ov")');
  not('mini oyun acildi: ' + oyunVar);

  console.log('\n=== SONUC ===');
  console.log('adim sayisi:', adimlar.length);
  console.log('konsol hatalari:', hatalar.length);
  hatalar.slice(0, 15).forEach(h => console.log('  ! ' + h));
  console.log(hatalar.length === 0 && oyunVar ? '\nTEST GECTI' : '\nTEST SORUNLU');
} catch (e) {
  console.log('\n!!! TEST KIRILDI:', e.message);
  try { console.log('  oyun durumu:', await ev('__t.durumu()')); } catch (e2) { console.log('  durum okunamadi:', e2.message); }
  try { await ss('99-kirilma'); } catch {}
  hatalar.slice(0, 15).forEach(h => console.log('  ! ' + h));
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch {}
  edge.kill();
  fs.rmSync(path.join(KOK, '_test.html'), { force: true });
}

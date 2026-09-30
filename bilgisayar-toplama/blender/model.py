#!/usr/bin/env python3
"""Uzay Zone — "Bilgisayar Toplama" oyununun 3B modelleri.

Bu dosya oyunun assets/*.glb dosyalarinin KAYNAGIDIR. firebase-rules.json gibi:
modeli degistirmek icin bu script'i duzenle ve yeniden calistir, .glb'yi elle
duzenlemeye kalkma.

    blender --background --python blender/model.py
    blender --background --python blender/model.py -- --render   (onizleme PNG'leri)

Cikti:
    assets/parcalar.glb  — takilacak 12 parca (her biri P_<id> adli bir node)
    assets/sahne.glb     — kasa, kapak, masa, monitor, klavye, fare, aletler

Koordinat sistemi
-----------------
Oyun (three.js) Y-up calisir, Blender Z-up. glTF ihracati Blender'in Z'sini
glTF'in Y'sine cevirir. Bu yuzden her sey OYUN koordinatlarinda yazilir ve
GL()/GS() ile Blender'a cevrilir:  blender = (x, -z, y)

Oyun koordinatlarinda kasanin ic tabani y=0, ic hacim x:[-6.5,6.5] z:[-4.5,4.5].
Her parca kendi orijininde ALT-ORTA hizalidir (bottom-center), boylece oyun
parcayi dogrudan "yuvanin zemini" yuksekligine koyabiliyor.
"""

import os
import sys
import math
import random

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, "assets")
TMP = os.path.join(HERE, "tex")
os.makedirs(ASSETS, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DO_RENDER = "--render" in ARGS

random.seed(7)
np.random.seed(7)

TAU = math.pi * 2


# ---------------------------------------------------------------- sahne temizligi
def temizle():
    bpy.ops.wm.read_factory_settings(use_empty=True)


temizle()
SCENE = bpy.context.scene
COL_PARTS = bpy.data.collections.new("PARCALAR")
COL_SCENE = bpy.data.collections.new("SAHNE")
SCENE.collection.children.link(COL_PARTS)
SCENE.collection.children.link(COL_SCENE)
COL = COL_PARTS  # aktif hedef koleksiyon, part() degistirir


# ---------------------------------------------------------------- koordinat
def GL(x, y, z):
    """Oyun konumu -> Blender konumu."""
    return (x, -z, y)


def GS(x, y, z):
    """Oyun boyutu -> Blender boyutu."""
    return (x, z, y)


# ---------------------------------------------------------------- renk / materyal
def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex2lin(h):
    r = ((h >> 16) & 255) / 255.0
    g = ((h >> 8) & 255) / 255.0
    b = (h & 255) / 255.0
    return (srgb2lin(r), srgb2lin(g), srgb2lin(b))


_MATS = {}


def M(name, color, rough=0.5, metal=0.0, emit=None, emit_str=2.0, alpha=1.0):
    """Tek seferlik materyal (ad ile onbelleklenir)."""
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex2lin(color), 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit is not None:
        b.inputs["Emission Color"].default_value = (*hex2lin(emit), 1.0)
        b.inputs["Emission Strength"].default_value = emit_str
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        _blend(m)
    _MATS[name] = m
    return m


def _blend(m):
    for attr, val in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
        try:
            setattr(m, attr, val)
        except Exception:
            pass


# --- paleti tek yerde tut -------------------------------------------------
PCB = lambda: M("PCB", 0x0E5C33, 0.44, 0.06)
PCB_D = lambda: M("PCB_D", 0x0A3A22, 0.48, 0.06)
PCB_K = lambda: M("PCB_K", 0x141A18, 0.46, 0.06)
GOLD = lambda: M("GOLD", 0xD4A63C, 0.26, 1.0)
COPPER = lambda: M("COPPER", 0xB4672E, 0.28, 1.0)
ALU = lambda: M("ALU", 0xC6CBD1, 0.30, 1.0)
ALU_D = lambda: M("ALU_D", 0x8A9299, 0.40, 1.0)
STEEL = lambda: M("STEEL", 0xB4BAC2, 0.22, 1.0)
STEEL_D = lambda: M("STEEL_D", 0x6E767E, 0.34, 1.0)
PL_K = lambda: M("PL_K", 0x15181C, 0.44, 0.0)
PL_D = lambda: M("PL_D", 0x23272D, 0.52, 0.0)
PL_G = lambda: M("PL_G", 0x3B424A, 0.58, 0.0)
PL_W = lambda: M("PL_W", 0xE4E7EA, 0.38, 0.0)
IC = lambda: M("IC", 0x0B0C0F, 0.34, 0.0)
CAP = lambda: M("CAP", 0x1B1E22, 0.32, 0.55)
CAP_G = lambda: M("CAP_G", 0x8A6A1E, 0.36, 0.75)
RED = lambda: M("RED", 0xB4302A, 0.48, 0.1)
YELLOW = lambda: M("YELLOW", 0xE0B12A, 0.48, 0.1)
BLUE = lambda: M("BLUE", 0x2C63C0, 0.42, 0.2)
GREENC = lambda: M("GREENC", 0x2A9A5E, 0.48, 0.1)
ORANGE = lambda: M("ORANGE", 0xD9752A, 0.46, 0.1)
PURPLE = lambda: M("PURPLE", 0x7A4FC4, 0.42, 0.2)
WOOD = lambda: M("WOOD", 0x6A4A2C, 0.62, 0.02)
GLASS = lambda: M("GLASS", 0x0C1216, 0.06, 0.0, alpha=0.30)
RGB_C = lambda: M("RGB_C", 0x2BD9A0, 0.3, 0.0, emit=0x2BD9A0, emit_str=3.0)
RGB_B = lambda: M("RGB_B", 0x3DA8FF, 0.3, 0.0, emit=0x3DA8FF, emit_str=3.0)
RGB_P = lambda: M("RGB_P", 0xB05CFF, 0.3, 0.0, emit=0xB05CFF, emit_str=3.0)
LED_R = lambda: M("LED_R", 0xFF4040, 0.3, 0.0, emit=0xFF3030, emit_str=4.0)


# ---------------------------------------------------------------- dokular (numpy)
def _lin_arr(a):
    a = np.clip(a, 0.0, 1.0)
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def img_from(name, arr):
    """arr: (h,w,4) float sRGB 0..1  -> paketli Blender goruntusu."""
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True)
    out = arr.astype(np.float32).copy()
    out[..., :3] = _lin_arr(out[..., :3])
    img.pixels.foreach_set(np.flipud(out).ravel())
    img.filepath_raw = os.path.join(TMP, name + ".png")
    img.file_format = "PNG"
    img.save()
    return img


def _rgb(h):
    return np.array([((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255], np.float32)


def _rect(a, x0, y0, x1, y1, col, alpha=1.0):
    h, w = a.shape[:2]
    x0, x1 = max(0, int(x0)), min(w, int(x1))
    y0, y1 = max(0, int(y0)), min(h, int(y1))
    if x1 <= x0 or y1 <= y0:
        return
    a[y0:y1, x0:x1, :3] = a[y0:y1, x0:x1, :3] * (1 - alpha) + col * alpha


def _disc(a, cx, cy, r, col, alpha=1.0):
    h, w = a.shape[:2]
    x0, x1 = max(0, int(cx - r - 1)), min(w, int(cx + r + 2))
    y0, y1 = max(0, int(cy - r - 1)), min(h, int(cy + r + 2))
    if x1 <= x0 or y1 <= y0:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    m = ((xx - cx) ** 2 + (yy - cy) ** 2) <= r * r
    sub = a[y0:y1, x0:x1, :3]
    sub[m] = sub[m] * (1 - alpha) + col * alpha


def pcb_doku(name, w=1024, h=1024, taban=0x0E5C33, yogunluk=1.0, seed=3):
    """Yesil PCB: lehim maskesi + altin izler + via delikleri + beyaz baski."""
    rng = np.random.default_rng(seed)
    a = np.ones((h, w, 4), np.float32)
    base = _rgb(taban)
    a[..., :3] = base
    # lehim maskesi dokusu — SADECE blok gurultu: piksel basina gurultu PNG/JPEG
    # sikistirmasini oldurup dosyayi megabaytlara cikariyor.
    n = (rng.normal(0, 0.045, (h // 16, w // 16, 1))
         .repeat(16, 0).repeat(16, 1)).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] + n, 0, 1)
    gold = _rgb(0xC9A03A)
    dark = _rgb(0x07321C)
    white = _rgb(0xE8EEEA)
    # yatay/dusey izler
    for _ in range(int(220 * yogunluk)):
        yatay = rng.random() < 0.5
        t = rng.integers(2, 5)
        ln = rng.integers(w // 12, w // 2)
        x = rng.integers(0, w)
        y = rng.integers(0, h)
        col = gold * rng.uniform(0.75, 1.05)
        if yatay:
            _rect(a, x, y, x + ln, y + t, col, 0.85)
        else:
            _rect(a, x, y, x + t, y + ln, col, 0.85)
    # via delikleri
    for _ in range(int(900 * yogunluk)):
        cx, cy = rng.integers(0, w), rng.integers(0, h)
        r = rng.uniform(2.5, 5.0)
        _disc(a, cx, cy, r, gold, 0.9)
        _disc(a, cx, cy, r * 0.45, dark, 0.95)
    # SMD pad dizileri (parca ayak izleri)
    for _ in range(int(60 * yogunluk)):
        cx, cy = rng.integers(20, w - 60), rng.integers(20, h - 60)
        say = rng.integers(3, 9)
        adim = rng.integers(7, 13)
        pw, ph = rng.integers(3, 6), rng.integers(8, 16)
        for i in range(say):
            _rect(a, cx + i * adim, cy, cx + i * adim + pw, cy + ph, gold, 0.95)
    # beyaz silkscreen cerceveler ve cizgiler
    for _ in range(int(70 * yogunluk)):
        x, y = rng.integers(0, w - 90), rng.integers(0, h - 70)
        bw, bh = rng.integers(26, 90), rng.integers(18, 70)
        t = 2
        _rect(a, x, y, x + bw, y + t, white, 0.8)
        _rect(a, x, y + bh, x + bw, y + bh + t, white, 0.8)
        _rect(a, x, y, x + t, y + bh, white, 0.8)
        _rect(a, x + bw, y, x + bw + t, y + bh, white, 0.8)
    for _ in range(int(40 * yogunluk)):
        x, y = rng.integers(0, w), rng.integers(0, h)
        _rect(a, x, y, x + rng.integers(8, 26), y + 3, white, 0.7)
    return img_from(name, a)


def pad_doku(name, n=40, px=16):
    """LGA soket: koyu zemin uzerinde altin pin izgarasi."""
    w = h = n * px
    a = np.ones((h, w, 4), np.float32)
    a[..., :3] = _rgb(0x1A1D21)
    gold = _rgb(0xD8AE46)
    for i in range(n):
        for j in range(n):
            if (i in (0, n - 1)) or (j in (0, n - 1)):
                continue
            if n // 2 - 3 < i < n // 2 + 3 and n // 2 - 3 < j < n // 2 + 3:
                continue
            cx, cy = j * px + px / 2, i * px + px / 2
            _disc(a, cx, cy, px * 0.26, gold, 1.0)
    return img_from(name, a)


def etiket_doku(name, w, h, arka, cizgi=0xD8DCE0, seed=5, barkod=True):
    """Disk/PSU etiketi: kagit zemin + ince yazi cizgileri + barkod."""
    rng = np.random.default_rng(seed)
    a = np.ones((h, w, 4), np.float32)
    a[..., :3] = _rgb(arka)
    ink = _rgb(0x1E2226)
    for i in range(14):
        y = int(h * (0.30 + i * 0.045))
        ln = int(w * rng.uniform(0.22, 0.62))
        _rect(a, int(w * 0.07), y, int(w * 0.07) + ln, y + max(2, h // 190), ink, 0.72)
    _rect(a, 0, 0, w, max(3, h // 90), _rgb(cizgi), 0.9)
    if barkod:
        x = int(w * 0.58)
        y0, y1 = int(h * 0.60), int(h * 0.90)
        while x < w * 0.95:
            bw = int(rng.integers(2, 7))
            _rect(a, x, y0, x + bw, y1, ink, 0.95)
            x += bw + int(rng.integers(3, 8))
    return img_from(name, a)


def ekran_doku(name, w=64, h=64):
    a = np.zeros((h, w, 4), np.float32)
    a[..., 3] = 1
    return img_from(name, a)


def M_tex(name, img, rough=0.45, metal=0.0, emit_img=False, emit_str=1.0):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img
    t.location = (-460, 180)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit_img:
        nt.links.new(t.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emit_str
    _MATS[name] = m
    return m


# ---------------------------------------------------------------- geometri yigini
class Batch:
    """Ayni materyalli yuzlerce kutu/silindiri TEK mesh'e yigar.

    Dosya boyutu ve draw-call sayisi icin sart: anakart tek basina 400+
    parcacik iceriyor, hepsi ayri obje olsa oyun kasilir.
    """

    def __init__(self, name, mat, bevel=0.0, seg=1):
        self.name = name
        self.mat = mat
        self.bevel = bevel
        self.seg = seg
        self.v = []
        self.f = []
        self.smooth = set()

    # -- ham ekleme
    def _add(self, verts, faces, smooth_idx=()):
        o = len(self.v)
        self.v.extend(verts)
        for fc in faces:
            self.f.append(tuple(i + o for i in fc))
        for i in smooth_idx:
            self.smooth.add(len(self.f) - len(faces) + i)

    # -- kutu (blender koordinati, merkez + boyut)
    def box(self, c, s, rot=None):
        sx, sy, sz = s[0] / 2, s[1] / 2, s[2] / 2
        p = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
             (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
        if rot:
            import mathutils
            e = mathutils.Euler(rot, "XYZ")
            p = [tuple(mathutils.Vector(q) @ e.to_matrix().transposed()) for q in p]
        p = [(q[0] + c[0], q[1] + c[1], q[2] + c[2]) for q in p]
        self._add(p, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                      (2, 3, 7, 6), (0, 4, 7, 3), (1, 2, 6, 5)])
        return self

    def gbox(self, gc, gs):
        return self.box(GL(*gc), GS(*gs))

    # -- silindir / koni
    def cyl(self, c, r, h, axis="z", n=20, r2=None, caps=True, a0=0.0, a1=TAU):
        r2 = r if r2 is None else r2
        tam = abs(a1 - a0) >= TAU - 1e-6
        m = n if tam else n + 1
        def P(rr, u, ang):
            x, y = rr * math.cos(ang), rr * math.sin(ang)
            if axis == "z":
                v = (x, y, u)
            elif axis == "y":
                v = (x, u, -y)
            else:
                v = (u, x, y)
            return (v[0] + c[0], v[1] + c[1], v[2] + c[2])
        alt, ust = [], []
        for i in range(m):
            ang = a0 + (a1 - a0) * (i / n if tam else i / n)
            alt.append(P(r, -h / 2, ang))
            ust.append(P(r2, h / 2, ang))
        base = len(self.v)
        self.v.extend(alt)
        self.v.extend(ust)
        say = len(alt)
        side0 = len(self.f)
        lim = say if tam else say - 1
        for i in range(lim):
            j = (i + 1) % say
            self.f.append((base + i, base + j, base + say + j, base + say + i))
        for k in range(side0, len(self.f)):
            self.smooth.add(k)
        if caps:
            # kapaklar AYRI vertekslerle: yumusak yan yuzeyler kapak normalini emmesin
            b2 = len(self.v)
            self.v.extend(alt)
            self.v.extend(ust)
            self.f.append(tuple(b2 + i for i in range(say - 1, -1, -1)))
            self.f.append(tuple(b2 + say + i for i in range(say)))
        return self

    def gcyl(self, gc, r, h, gaxis="y", **kw):
        ax = {"x": "x", "y": "z", "z": "y"}[gaxis]
        return self.cyl(GL(*gc), r, h, ax, **kw)

    # -- halka (fan cercevesi, izgara teli, o-ring)
    def ring(self, c, r_out, r_in, h, axis="z", n=28):
        def P(rr, u, ang):
            x, y = rr * math.cos(ang), rr * math.sin(ang)
            if axis == "z":
                v = (x, y, u)
            elif axis == "y":
                v = (x, u, -y)
            else:
                v = (u, x, y)
            return (v[0] + c[0], v[1] + c[1], v[2] + c[2])
        b = len(self.v)
        for i in range(n):
            ang = i / n * TAU
            self.v.extend([P(r_out, -h / 2, ang), P(r_out, h / 2, ang),
                           P(r_in, h / 2, ang), P(r_in, -h / 2, ang)])
        for i in range(n):
            a = b + i * 4
            c2 = b + ((i + 1) % n) * 4
            self.f.append((a + 0, c2 + 0, c2 + 1, a + 1))   # dis
            self.f.append((a + 1, c2 + 1, c2 + 2, a + 2))   # ust
            self.f.append((a + 2, c2 + 2, c2 + 3, a + 3))   # ic
            self.f.append((a + 3, c2 + 3, c2 + 0, a + 0))   # alt
        return self

    def gring(self, gc, r_out, r_in, h, gaxis="y", n=28):
        ax = {"x": "x", "y": "z", "z": "y"}[gaxis]
        return self.ring(GL(*gc), r_out, r_in, h, ax, n)

    # -- egri boru (kablo, heatpipe)
    def tube(self, pts, r, n=9, kapak=True):
        pts = [Vector(p) for p in pts]
        rings = []
        for i, p in enumerate(pts):
            if i == 0:
                t = (pts[1] - p)
            elif i == len(pts) - 1:
                t = (p - pts[-2])
            else:
                t = (pts[i + 1] - pts[i - 1])
            t.normalize()
            up = Vector((0, 0, 1))
            if abs(t.dot(up)) > 0.95:
                up = Vector((1, 0, 0))
            a = t.cross(up).normalized()
            b = t.cross(a).normalized()
            rings.append([p + a * (r * math.cos(k / n * TAU)) + b * (r * math.sin(k / n * TAU))
                          for k in range(n)])
        base = len(self.v)
        for rg in rings:
            self.v.extend([tuple(q) for q in rg])
        f0 = len(self.f)
        for i in range(len(rings) - 1):
            for k in range(n):
                k2 = (k + 1) % n
                self.f.append((base + i * n + k, base + i * n + k2,
                               base + (i + 1) * n + k2, base + (i + 1) * n + k))
        for k in range(f0, len(self.f)):
            self.smooth.add(k)
        if kapak:
            b2 = len(self.v)
            self.v.extend([tuple(q) for q in rings[0]])
            self.v.extend([tuple(q) for q in rings[-1]])
            self.f.append(tuple(b2 + i for i in range(n - 1, -1, -1)))
            self.f.append(tuple(b2 + n + i for i in range(n)))
        return self

    def gtube(self, gpts, r, n=9, kapak=True):
        return self.tube([GL(*p) for p in gpts], r, n, kapak)

    # -- kanatcik dizisi (heatsink fin stack)
    def fins(self, gc, gs, adet, eksen="x", bosluk=None):
        """adet kadar ince plakayi eksen boyunca dizer. gs: TEK plakanin boyutu."""
        i0 = {"x": 0, "y": 1, "z": 2}[eksen]
        span = bosluk if bosluk is not None else gs[i0] * adet * 2.1
        for i in range(adet):
            t = (i / max(1, adet - 1) - 0.5) * span if adet > 1 else 0.0
            c = list(gc)
            c[i0] += t
            self.gbox(tuple(c), gs)
        return self

    # -- objeye cevir
    def finish(self, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), name=None, col=None):
        if not self.f:
            return None
        me = bpy.data.meshes.new(name or self.name)
        me.from_pydata(self.v, [], self.f)
        me.validate(verbose=False)
        if self.mat:
            me.materials.append(self.mat)
        if self.smooth:
            for i in self.smooth:
                if i < len(me.polygons):
                    me.polygons[i].use_smooth = True
        ob = bpy.data.objects.new(name or self.name, me)
        (col or COL).objects.link(ob)
        ob.location = loc
        ob.rotation_euler = rot
        if self.bevel > 0:
            mod = ob.modifiers.new("bev", "BEVEL")
            mod.width = self.bevel
            mod.segments = self.seg
            mod.limit_method = "ANGLE"
            mod.angle_limit = math.radians(40)
            mod.harden_normals = False
        if parent is not None:
            ob.parent = parent
        return ob


def uv_quad(name, gcorners, mat, parent=None, uv=((0, 0), (1, 0), (1, 1), (0, 1)), col=None):
    """UV'li tek dortgen — doku tasiyan yuzeyler icin (PCB ustu, etiket, ekran)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([GL(*c) for c in gcorners], [], [(0, 1, 2, 3)])
    me.validate()
    lay = me.uv_layers.new(name="UVMap")
    for i, co in enumerate(uv):
        lay.data[i].uv = co
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    (col or COL).objects.link(ob)
    if parent is not None:
        ob.parent = parent
    return ob


def yazi(body, boy, mat, gloc, grot=(0, 0, 0), kalinlik=0.012, parent=None, bold=True, col=None):
    """3B kabartma yazi — etiket/logo icin (silkscreen hissi)."""
    cu = bpy.data.curves.new("f_" + body[:10], "FONT")
    cu.body = body
    cu.size = boy
    cu.extrude = kalinlik
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    if bold:
        cu.offset = boy * 0.012
    tmp = bpy.data.objects.new("tmp_" + body[:10], cu)
    SCENE.collection.objects.link(tmp)
    tmp.data.materials.append(mat)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    if not me.polygons:
        bpy.data.meshes.remove(me)
        return None
    ob = bpy.data.objects.new("Y_" + body[:10], me)
    (col or COL).objects.link(ob)
    ob.location = GL(*gloc)
    ob.rotation_euler = grot
    if parent is not None:
        ob.parent = parent
    return ob


# Yazi yonleri. Blender metni varsayilan olarak +Z'ye bakar, ust yonu +Y'dir.
# Oyunda +Y yukari oldugu icin (Blender +Z), duz/ustten okunan etiketler
# donmeden dogru okunur; dikey yuzeylerdekiler cevrilmeli.
DUZ_UST = (0, 0, 0)                          # yatay yuzey, ustten okunur
YUZ_ARTI_X = (math.pi / 2, 0, math.pi / 2)   # oyun +X'e bakan dikey yuzey
YUZ_ARTI_Z = (math.pi / 2, 0, 0)             # oyun +Z'ye (kameraya) bakan yuzey


def part(pid):
    """P_<id> adli bos node — oyun bunu isimle bulup sahneye tasiyor."""
    e = bpy.data.objects.new("P_" + pid, None)
    e.empty_display_size = 0.4
    COL_PARTS.objects.link(e)
    return e


def fan_govde(name, parent, gloc, grot, r, kanat, mat, kalinlik=0.055, egim=0.42, hub_h=0.24):
    """Donen pervane. Blender'da donme ekseni LOCAL Z; oyun rotateY() ile cevirir."""
    b = Batch(name, mat, bevel=0.006)
    b.cyl((0, 0, 0), r * 0.30, hub_h, "z", 20)
    b.cyl((0, 0, hub_h / 2), r * 0.26, 0.03, "z", 18)
    for i in range(kanat):
        a = i / kanat * TAU
        # Kanat = kokten uca 3 dilim. Dilimler cok kaydirilirsa kanatlar
        # ust uste binip pervane "sarmal kabuk" gibi gorunuyor; kaydirma
        # kucuk, genislik artisi az tutuluyor.
        for k in range(3):
            fr = 0.30 + k * 0.235
            uz = r * 0.245
            rr = r * (fr + 0.115)
            genis = r * (0.36 + k * 0.05)
            ang = a + k * 0.09
            b.box((math.cos(ang) * rr, math.sin(ang) * rr, (k - 1) * kalinlik * 1.1),
                  (uz, genis, kalinlik),
                  rot=(0, egim, ang))
    ob = b.finish(parent=parent, loc=GL(*gloc), rot=grot, name=name)
    return ob


# ================================================================ DOKULAR
IMG_PCB = pcb_doku("uz_pcb_mobo", 1024, 1024, 0x0E5C33, 1.0, 3)
IMG_PCB_D = pcb_doku("uz_pcb_koyu", 512, 512, 0x0B2E1B, 0.45, 11)
IMG_PAD = pad_doku("uz_lga", 40, 14)
IMG_LBL_HDD = etiket_doku("uz_etiket_hdd", 384, 264, 0xD7DBDF, 0x2BD9A0, 21)
IMG_LBL_PSU = etiket_doku("uz_etiket_psu", 384, 240, 0x1A1E23, 0xFFD24A, 31, barkod=False)
IMG_LBL_SSD = etiket_doku("uz_etiket_ssd", 384, 240, 0x123026, 0x2BD9A0, 41)

MAT_PCB_TEX = M_tex("PCB_TEX", IMG_PCB, 0.42, 0.10)
MAT_PCB_TEX_D = M_tex("PCB_TEX_D", IMG_PCB_D, 0.46, 0.10)
MAT_PAD = M_tex("PAD_TEX", IMG_PAD, 0.28, 0.85)
MAT_LBL_HDD = M_tex("LBL_HDD", IMG_LBL_HDD, 0.52)
MAT_LBL_PSU = M_tex("LBL_PSU", IMG_LBL_PSU, 0.55)
MAT_LBL_SSD = M_tex("LBL_SSD", IMG_LBL_SSD, 0.48)


# ================================================================ PARCALAR
# Oyun icindeki mantiksal boyut (X, Y, Z) ve takilacagi konum yorumlarda.

# ---------------------------------------------------------------- 1) ANAKART
def yap_anakart():
    p = part("anakart")
    W, D = 7.1, 5.7          # PCB olculeri (ATX ~305x244mm)
    T = 0.075                 # PCB kalinligi
    Z0 = 0.12                 # standoff yuksekligi -> PCB alti
    TOP = Z0 + T              # PCB ust yuzeyi (0.195)

    # -- standoff'lar (parca kendi ayaklariyla gelsin, y=0 zemine otursun)
    st = Batch("mb_standoff", STEEL_D(), bevel=0.01)
    for sx in (-W / 2 + 0.35, 0.0, W / 2 - 0.35):
        for sz in (-D / 2 + 0.35, 0.0, D / 2 - 0.35):
            st.gcyl((sx, Z0 / 2, sz), 0.13, Z0, "y", n=12)
    st.finish(parent=p)

    # -- PCB gövdesi + üst yüzey dokusu + alt yüzey dokusu
    pcb = Batch("mb_pcb", PCB(), bevel=0.012)
    pcb.gbox((0, Z0 + T / 2, 0), (W, T, D))
    pcb.finish(parent=p)
    uv_quad("mb_pcb_ust", [(-W / 2, TOP + 0.002, D / 2), (W / 2, TOP + 0.002, D / 2),
                           (W / 2, TOP + 0.002, -D / 2), (-W / 2, TOP + 0.002, -D / 2)],
             MAT_PCB_TEX, parent=p)
    uv_quad("mb_pcb_alt", [(-W / 2, Z0 - 0.002, -D / 2), (W / 2, Z0 - 0.002, -D / 2),
                           (W / 2, Z0 - 0.002, D / 2), (-W / 2, Z0 - 0.002, D / 2)],
             MAT_PCB_TEX_D, parent=p)

    # -- CPU soketi (LGA): cerceve + pin yuzeyi + tutma kolu
    SX, SZ = -1.85, -1.55     # soket merkezi (PCB yereli)
    sk = Batch("mb_soket", PL_K(), bevel=0.01)
    for dx, dz, w2, d2 in ((0, -0.72, 1.5, 0.12), (0, 0.72, 1.5, 0.12),
                           (-0.72, 0, 0.12, 1.5), (0.72, 0, 0.12, 1.5)):
        sk.gbox((SX + dx, TOP + 0.075, SZ + dz), (w2, 0.15, d2))
    sk.gbox((SX, TOP + 0.02, SZ), (1.36, 0.04, 1.36))
    sk.finish(parent=p)
    uv_quad("mb_lga", [(SX - 0.6, TOP + 0.045, SZ + 0.6), (SX + 0.6, TOP + 0.045, SZ + 0.6),
                       (SX + 0.6, TOP + 0.045, SZ - 0.6), (SX - 0.6, TOP + 0.045, SZ - 0.6)],
             MAT_PAD, parent=p)
    kol = Batch("mb_kol", STEEL(), bevel=0.008)
    kol.gcyl((SX + 0.86, TOP + 0.17, SZ), 0.035, 1.5, "z", n=10)
    kol.gcyl((SX + 0.86, TOP + 0.17, SZ - 0.75), 0.035, 0.34, "x", n=10)
    kol.gcyl((SX + 0.7, TOP + 0.17, SZ - 0.9), 0.035, 0.3, "z", n=10)
    kol.gbox((SX, TOP + 0.21, SZ - 0.82), (1.3, 0.06, 0.1))
    kol.finish(parent=p)
    # soket vida delikleri (backplate)
    dl = Batch("mb_delik", PL_D())
    for dx in (-1.0, 1.0):
        for dz in (-1.0, 1.0):
            dl.gring((SX + dx, TOP + 0.01, SZ + dz), 0.13, 0.07, 0.03, "y", n=12)
    dl.finish(parent=p)

    # -- VRM sogutucular (soketin solu ve ustu)
    vrm = Batch("mb_vrm", ALU_D(), bevel=0.008)
    vrm.fins((SX - 1.35, TOP + 0.34, SZ), (0.05, 0.62, 1.35), 9, "x", bosluk=0.55)
    vrm.gbox((SX - 1.35, TOP + 0.05, SZ), (0.62, 0.1, 1.4))
    vrm.fins((SX + 0.1, TOP + 0.3, SZ - 1.15), (1.5, 0.54, 0.05), 8, "z", bosluk=0.45)
    vrm.gbox((SX + 0.1, TOP + 0.05, SZ - 1.15), (1.55, 0.1, 0.5))
    vrm.finish(parent=p)

    # -- RAM yuvalari (2 adet, oyun RAM'i x=-2.2 ve -1.75 dunyasina takiyor)
    # PCB yereli: dunya x + 2.75  ->  0.55 ve 1.0 ; z: -2.6 + 1.35 = -1.25
    slot = Batch("mb_ram_slot", PL_K(), bevel=0.006)
    kilit = Batch("mb_ram_kilit", PL_W(), bevel=0.006)
    alt = Batch("mb_ram_alt", GOLD())
    for sx in (0.55, 1.0):
        slot.gbox((sx, TOP + 0.09, -1.25), (0.26, 0.18, 3.05))
        slot.gbox((sx, TOP + 0.2, -1.25), (0.1, 0.06, 2.9))
        alt.gbox((sx, TOP + 0.05, -1.25), (0.09, 0.03, 2.8))
        for sz in (-2.86, 0.36):
            kilit.gbox((sx, TOP + 0.2, sz), (0.24, 0.3, 0.22))
    slot.finish(parent=p)
    kilit.finish(parent=p)
    alt.finish(parent=p)

    # -- PCIe yuvalari  (x16: dunya z=-0.3 -> yerel 1.05 ; x1: dunya z=0.9 -> 2.25)
    pci = Batch("mb_pci", PL_K(), bevel=0.006)
    pcig = Batch("mb_pci_gold", GOLD())
    # x16
    pci.gbox((-2.0, TOP + 0.09, 1.05), (2.07, 0.18, 0.28))
    pci.gbox((-2.0, TOP + 0.2, 1.05), (1.95, 0.06, 0.12))
    pcig.gbox((-2.0, TOP + 0.05, 1.05), (1.9, 0.03, 0.1))
    pci.gbox((-0.86, TOP + 0.14, 1.05), (0.22, 0.28, 0.3))   # kilit dili
    # x1 — yeri ses kartinin altin parmaklarina gore ayarli:
    # kart dunyada x=-4.35'e takiliyor, parmaklari dunya -5.05..-4.38 arasinda.
    pci.gbox((-1.96, TOP + 0.09, 2.25), (0.72, 0.18, 0.28))
    pcig.gbox((-1.96, TOP + 0.05, 2.25), (0.6, 0.03, 0.1))
    pci.finish(parent=p)
    pcig.finish(parent=p)

    # -- yonga seti (chipset) sogutucusu + M.2 kalkani
    cs = Batch("mb_chipset", PL_D(), bevel=0.01)
    cs.gbox((1.1, TOP + 0.13, 1.7), (1.35, 0.26, 1.35))
    cs.gbox((1.1, TOP + 0.28, 1.7), (1.0, 0.06, 1.0))
    cs.gbox((-0.7, TOP + 0.09, 1.95), (2.1, 0.18, 0.5))      # M.2 kalkani
    cs.finish(parent=p)
    yazi("UZ", 0.42, M("LOGO", 0x2BD9A0, 0.35, 0.3, emit=0x1E7A5C, emit_str=1.2),
         (1.1, TOP + 0.315, 1.7), DUZ_UST, 0.02, parent=p)

    # -- arka I/O paneli (dunya x=-6.3 kenari -> yerel -3.55)
    io = Batch("mb_io", STEEL_D(), bevel=0.008)
    io.gbox((-3.45, TOP + 0.5, -1.0), (0.14, 1.0, 3.7))
    io.finish(parent=p)
    iop = Batch("mb_io_port", PL_K(), bevel=0.005)
    ioc = Batch("mb_io_kontak", GOLD())
    zz = -2.6
    for tur in ("usb", "usb", "hdmi", "dp", "usbc", "lan", "jack", "jack", "jack"):
        if tur == "usb":
            iop.gbox((-3.52, TOP + 0.62, zz), (0.12, 0.2, 0.42))
            ioc.gbox((-3.5, TOP + 0.57, zz), (0.1, 0.05, 0.34))
            zz += 0.5
        elif tur in ("hdmi", "dp"):
            iop.gbox((-3.52, TOP + 0.62, zz), (0.12, 0.22, 0.5))
            zz += 0.58
        elif tur == "usbc":
            iop.gbox((-3.52, TOP + 0.6, zz), (0.12, 0.14, 0.26))
            zz += 0.36
        elif tur == "lan":
            iop.gbox((-3.52, TOP + 0.68, zz), (0.12, 0.44, 0.5))
            iop.gbox((-3.5, TOP + 0.9, zz), (0.1, 0.1, 0.2))
            zz += 0.62
        else:
            iop.gcyl((-3.52, TOP + 0.4, zz), 0.14, 0.14, "x", n=12)
            zz += 0.34
    iop.finish(parent=p)
    ioc.finish(parent=p)

    # -- guc konnektorleri: 24 pin (dunya 0.35,-1.7 -> yerel 3.1,-0.35) ve 8 pin CPU
    gk = Batch("mb_guc", PL_W(), bevel=0.006)
    gkp = Batch("mb_guc_pin", STEEL_D())
    gk.gbox((3.1, TOP + 0.17, -0.35), (0.46, 0.34, 1.52))
    for i in range(12):
        for j in (-0.1, 0.1):
            gkp.gbox((3.1 + j, TOP + 0.3, -1.03 + i * 0.124), (0.05, 0.1, 0.05))
    gk.gbox((-1.0, TOP + 0.16, -2.55), (0.82, 0.32, 0.44))
    gk.finish(parent=p)
    gkp.finish(parent=p)

    # -- SATA portlari
    sata = Batch("mb_sata", PL_K(), bevel=0.005)
    satak = Batch("mb_sata_k", RED(), bevel=0.005)
    for i in range(4):
        satak.gbox((3.0, TOP + 0.1, 0.9 + i * 0.28), (0.5, 0.2, 0.22))
        sata.gbox((2.82, TOP + 0.1, 0.9 + i * 0.28), (0.16, 0.14, 0.18))
    sata.finish(parent=p)
    satak.finish(parent=p)

    # -- kondansatorler, yongalar, SMD dizileri, pil, fan basliklari
    cap = Batch("mb_cap", CAP(), bevel=0.01)
    capt = Batch("mb_cap_ust", PL_K())
    kondlar = [(SX - 0.05, SZ + 1.05), (SX + 0.3, SZ + 1.05), (SX + 0.65, SZ + 1.05),
               (SX - 0.4, SZ + 1.05), (2.4, -1.5), (2.4, -1.15), (2.75, -1.5),
               (-1.6, 1.4), (-1.3, 1.75), (0.2, 2.35), (0.55, 2.35)]
    for cx, cz in kondlar:
        h = 0.34
        cap.gcyl((cx, TOP + h / 2, cz), 0.12, h, "y", n=14)
        capt.gcyl((cx, TOP + h + 0.006, cz), 0.115, 0.012, "y", n=14)
    cap.finish(parent=p)
    capt.finish(parent=p)

    ic = Batch("mb_ic", IC(), bevel=0.006)
    for cx, cz, w2, d2, h in ((2.15, 0.1, 0.5, 0.5, 0.1), (-0.3, -0.5, 0.42, 0.42, 0.09),
                              (0.9, -1.9, 0.36, 0.22, 0.07), (-2.9, 1.7, 0.3, 0.3, 0.07),
                              (1.75, 2.1, 0.55, 0.3, 0.08), (-1.1, 2.3, 0.4, 0.26, 0.07),
                              (3.2, 1.9, 0.3, 0.3, 0.07), (0.1, 0.9, 0.34, 0.34, 0.08)):
        ic.gbox((cx, TOP + h / 2, cz), (w2, h, d2))
    ic.finish(parent=p)

    smd = Batch("mb_smd", PL_D())
    rng = random.Random(9)
    for _ in range(110):
        cx = rng.uniform(-3.3, 3.3)
        cz = rng.uniform(-2.65, 2.65)
        if abs(cx - SX) < 0.8 and abs(cz - SZ) < 0.8:
            continue
        w2 = rng.choice([0.06, 0.08, 0.1])
        smd.gbox((cx, TOP + 0.015, cz), (w2, 0.03, w2 * rng.uniform(0.5, 1.4)))
    smd.finish(parent=p)

    pil = Batch("mb_pil", STEEL(), bevel=0.006)
    pil.gcyl((2.3, TOP + 0.045, -1.95), 0.27, 0.09, "y", n=20)
    pil.finish(parent=p)

    hdr = Batch("mb_header", PL_W(), bevel=0.005)
    for cx, cz in ((-2.6, -2.5), (3.25, -2.3), (3.25, 2.4), (-0.2, 2.6)):
        hdr.gbox((cx, TOP + 0.09, cz), (0.24, 0.18, 0.34))
    hdr.finish(parent=p)

    # -- RGB seridi (ses bolumu ayirma cizgisi) — modern anakart hissi
    rgb = Batch("mb_rgb", RGB_P())
    rgb.gbox((-1.4, TOP + 0.012, 2.62), (3.6, 0.02, 0.06))
    rgb.finish(parent=p)
    return p


# ---------------------------------------------------------------- 2) CPU
def yap_cpu():
    p = part("cpu")
    sub = Batch("cpu_sub", PCB_K(), bevel=0.006)
    sub.gbox((0, 0.03, 0), (1.0, 0.06, 1.0))
    sub.finish(parent=p)
    pads = Batch("cpu_pad", GOLD())
    for i in range(18):
        for j in range(18):
            if 7 <= i <= 10 and 7 <= j <= 10:
                continue
            pads.gbox((-0.44 + i * 0.052, 0.002, -0.44 + j * 0.052), (0.028, 0.012, 0.028))
    pads.finish(parent=p)
    ihs = Batch("cpu_ihs", STEEL(), bevel=0.014, seg=2)
    ihs.gbox((0, 0.095, 0), (0.86, 0.075, 0.86))
    ihs.gbox((0, 0.125, 0), (0.62, 0.02, 0.62))
    # omuzlar (gercek IHS'in basamakli kenari)
    ihs.finish(parent=p)
    yazi("UZAY", 0.13, M("CPU_YAZI", 0x6E767E, 0.3, 0.9), (0, 0.137, -0.14),
         DUZ_UST, 0.008, parent=p)
    yazi("i9", 0.16, M("CPU_YAZI2", 0x5A6268, 0.3, 0.9), (0, 0.137, 0.13),
         DUZ_UST, 0.008, parent=p)
    tri = Batch("cpu_tri", GOLD())
    tri.gcyl((-0.4, 0.07, 0.4), 0.05, 0.015, "y", n=3)
    tri.finish(parent=p)
    return p


# ---------------------------------------------------------------- 3) CPU SOGUTUCU
def yap_sogutucu():
    p = part("sogutucu")
    # taban plakasi (bakir) + montaj koprusu
    tab = Batch("sg_taban", COPPER(), bevel=0.01)
    tab.gbox((0, 0.055, 0), (1.15, 0.11, 1.15))
    tab.finish(parent=p)
    kop = Batch("sg_kopru", STEEL_D(), bevel=0.008)
    kop.gbox((0, 0.15, 0), (2.3, 0.08, 0.18))
    for sx in (-1.05, 1.05):
        kop.gcyl((sx, 0.09, 0), 0.07, 0.18, "y", n=10)
    kop.finish(parent=p)
    # 4 bakir isi borusu: tabandan yukari kivrilir
    hp = Batch("sg_boru", COPPER(), bevel=0)
    for i, off in enumerate((-0.33, -0.11, 0.11, 0.33)):
        hp.gtube([(off, 0.1, -0.45), (off, 0.1, 0.0), (off, 0.14, 0.42),
                  (off, 0.45, 0.6), (off, 1.0, 0.62), (off, 2.0, 0.6),
                  (off, 2.9, 0.55), (off, 3.12, 0.3)], 0.065, n=9)
    hp.finish(parent=p)
    # alüminyum kanat yigini
    fin = Batch("sg_kanat", ALU())
    n = 30
    for i in range(n):
        y = 0.55 + i * 0.087
        fin.gbox((0, y, 0.55), (2.25, 0.018, 1.55))
    # kanatlarin yan destegi
    fin.gbox((-1.11, 1.85, 0.55), (0.04, 2.6, 1.5))
    fin.gbox((1.11, 1.85, 0.55), (0.04, 2.6, 1.5))
    fin.finish(parent=p)
    # ust kapak + logo
    kap = Batch("sg_kapak", PL_D(), bevel=0.012)
    kap.gbox((0, 3.2, 0.55), (2.35, 0.1, 1.65))
    kap.finish(parent=p)
    yazi("UZAY", 0.34, M("SG_LOGO", 0x2BD9A0, 0.35, 0.2, emit=0x1E7A5C, emit_str=1.5),
         (0, 3.26, 0.55), DUZ_UST, 0.018, parent=p)
    # fan + cerceve (kanat yiginin onune, -Z tarafina)
    cer = Batch("sg_fan_cer", PL_K(), bevel=0.01)
    cer.gbox((0, 1.85, -0.38), (2.4, 2.4, 0.16))
    cer.gring((0, 1.85, -0.38), 1.1, 1.02, 0.2, "z", n=28)
    cer.finish(parent=p)
    # cerceve ortasini bosalt: halka ici zaten bos, sadece kose dolgulari
    kose = Batch("sg_fan_kose", PL_K(), bevel=0.008)
    kose.finish(parent=p)
    fan_govde("FAN_sogutucu", p, (0, 1.85, -0.44), (math.pi / 2, 0, 0), 1.02, 9, PL_G())
    # fan ortasindaki RGB halka
    rgb = Batch("sg_rgb", RGB_C())
    rgb.gring((0, 1.85, -0.3), 1.12, 1.03, 0.05, "z", n=28)
    rgb.finish(parent=p)
    return p


# ---------------------------------------------------------------- 4) RAM
def yap_ram(pid, renk, logo_renk):
    p = part(pid)
    T = 0.16   # PCB kalinligi (X)
    L = 3.05   # uzunluk (Z)
    pcb = Batch("ram_pcb", PCB_D(), bevel=0.006)
    pcb.gbox((0, 0.42, 0), (T * 0.5, 0.84, L))
    pcb.finish(parent=p)
    gold = Batch("ram_gold", GOLD())
    for i in range(34):
        for sx in (-T * 0.26, T * 0.26):
            gold.gbox((sx, 0.05, -1.42 + i * 0.086), (0.02, 0.1, 0.05))
    gold.finish(parent=p)
    # cip sıraları
    cip = Batch("ram_cip", IC(), bevel=0.005)
    for i in range(8):
        for sx in (-T * 0.42, T * 0.42):
            cip.gbox((sx, 0.42, -1.25 + i * 0.36), (0.05, 0.4, 0.28))
    cip.finish(parent=p)
    # isi yayici (delikli, kanatli ust)
    hs = Batch("ram_hs", M("RAM_HS_" + pid, renk, 0.32, 0.85), bevel=0.01)
    for sx in (-T * 0.62, T * 0.62):
        hs.gbox((sx, 0.5, 0), (0.06, 0.86, L * 0.99))
        # yan yuzde hafif kabartma bantlar (disari tasan tarak degil —
        # tarak yapinca cubuk uzaktan firca gibi gorunuyordu)
        for i in range(4):
            hs.gbox((sx * 1.16, 0.62, -1.05 + i * 0.7), (0.03, 0.42, 0.34))
    hs.gbox((0, 0.95, 0), (T * 1.5, 0.08, L * 0.99))
    for i in range(14):
        hs.gbox((0, 1.02, -1.35 + i * 0.208), (T * 1.2, 0.08, 0.1))
    hs.finish(parent=p)
    # ust difuzor (RGB)
    dif = Batch("ram_dif", M("RAM_RGB_" + pid, logo_renk, 0.25, 0.0,
                             emit=logo_renk, emit_str=3.0))
    dif.gbox((0, 1.11, 0), (T * 0.9, 0.06, L * 0.9))
    dif.finish(parent=p)
    yazi("DDR5", 0.2, M("RAM_YAZI", 0xF0F2F4, 0.4, 0.1),
         (T * 0.66, 0.52, 0), YUZ_ARTI_X, 0.01, parent=p)
    return p


# ---------------------------------------------------------------- 5) EKRAN KARTI
def yap_ekran():
    p = part("ekran")
    L, H, T = 6.2, 2.6, 0.92          # uzunluk X, yukseklik Y, kalinlik Z
    # PCB (dikey plaka)
    pcb = Batch("gpu_pcb", PCB_K(), bevel=0.008)
    pcb.gbox((0.35, H * 0.5 + 0.06, 0), (L - 0.7, H - 0.5, 0.07))
    pcb.finish(parent=p)
    uv_quad("gpu_pcb_tex", [(-2.4, 0.4, 0.04), (3.4, 0.4, 0.04), (3.4, 2.3, 0.04), (-2.4, 2.3, 0.04)],
            MAT_PCB_TEX_D, parent=p)
    # PCIe altin parmaklar (alt kenar, yuvaya girer)
    gold = Batch("gpu_gold", GOLD())
    for i in range(22):
        gold.gbox((-2.0 + i * 0.075, 0.08, 0.0), (0.05, 0.16, 0.1))
    gold.gbox((-0.35, 0.08, 0), (0.06, 0.18, 0.12))
    gold.finish(parent=p)
    # sogutucu blogu: taban + kanatlar + heatpipe
    blok = Batch("gpu_blok", ALU_D(), bevel=0.008)
    blok.gbox((0.4, 1.1, 0.34), (5.0, 1.1, 0.42))
    blok.finish(parent=p)
    fin = Batch("gpu_kanat", ALU())
    for i in range(32):
        fin.gbox((-1.9 + i * 0.151, 1.75, 0.34), (0.035, 1.2, 0.5))
    fin.finish(parent=p)
    hp = Batch("gpu_boru", COPPER())
    for dy in (0.9, 1.25):
        hp.gtube([(-2.2, dy, 0.55), (-1.0, dy, 0.6), (1.0, dy, 0.6), (2.3, dy, 0.55)], 0.06)
    hp.finish(parent=p)
    # shroud (plastik kapak) — ust ve yan cerceve, fanlar icin delikli
    sh = Batch("gpu_shroud", PL_D(), bevel=0.014, seg=2)
    sh.gbox((0.4, 2.45, 0.3), (5.5, 0.14, 0.86))              # ust
    sh.gbox((-2.4, 1.3, 0.34), (0.12, 2.4, 0.84))             # sol
    sh.gbox((3.2, 1.3, 0.34), (0.12, 2.4, 0.84))              # sag
    # On yuz DOLU bir plaka olamaz: fanlarin ustunu ortuyor. Iki fan
    # acikligi birakan cerceve olarak kuruluyor (ust/alt bant + 3 dikme).
    sh.gbox((0.4, 2.35, 0.72), (5.5, 0.2, 0.1))
    sh.gbox((0.4, 0.22, 0.72), (5.5, 0.24, 0.1))
    for px, pw in ((-2.35, 0.22), (0.42, 0.42), (3.15, 0.22)):
        sh.gbox((px, 1.3, 0.72), (pw, 2.3, 0.1))
    sh.finish(parent=p)
    # fan acikliklari: on yuzde iki daire kesmek yerine halka cerceve + pervane
    for fx in (-1.05, 1.9):
        cer = Batch("gpu_fan_cer", PL_K(), bevel=0.008)
        cer.gring((fx, 1.3, 0.72), 1.1, 0.98, 0.14, "z", n=26)
        cer.finish(parent=p)
        fan_govde("FAN_gpu_%d" % (1 if fx < 0 else 2), p, (fx, 1.3, 0.62),
                  (math.pi / 2, 0, 0), 0.96, 11, PL_G(), kalinlik=0.05)
    # arka plaka (backplate)
    bp = Batch("gpu_bp", STEEL_D(), bevel=0.01)
    bp.gbox((0.4, 1.3, -0.16), (5.5, 2.3, 0.06))
    for i in range(7):
        bp.gring((-1.6 + i * 0.7, 1.9, -0.16), 0.2, 0.13, 0.08, "z", n=14)
    bp.finish(parent=p)
    # I/O bracket (kasa arkasina bakan metal dil) — parcanin -X ucu
    br = Batch("gpu_bracket", STEEL(), bevel=0.006)
    br.gbox((-2.95, 1.3, 0.2), (0.1, 2.5, 0.9))
    br.gbox((-2.95, 2.62, 0.2), (0.1, 0.2, 1.3))
    for i in range(16):
        br.gbox((-2.95, 2.1, -0.15 + i * 0.075), (0.12, 0.7, 0.04))
    br.finish(parent=p)
    port = Batch("gpu_port", PL_K(), bevel=0.005)
    for i, dz in enumerate((-0.05, 0.28, 0.6)):
        port.gbox((-3.0, 0.75, dz), (0.14, 0.24, 0.26))
    port.finish(parent=p)
    # 8-pin guc girisi (ust kenar)
    pw = Batch("gpu_pw", PL_K(), bevel=0.006)
    pw.gbox((2.3, 2.56, 0.3), (0.8, 0.26, 0.4))
    pw.finish(parent=p)
    # logo + RGB serit
    yazi("UZAY", 0.42, M("GPU_LOGO", 0xE8ECEF, 0.35, 0.3),
         (0.4, 2.54, 0.3), (0, 0, 0), 0.02, parent=p)
    rgb = Batch("gpu_rgb", RGB_B())
    rgb.gbox((0.4, 2.36, 0.74), (4.6, 0.07, 0.04))
    rgb.gbox((-2.42, 1.3, 0.74), (0.05, 2.1, 0.04))
    rgb.finish(parent=p)
    return p


# ---------------------------------------------------------------- 6) SES KARTI
def yap_ses():
    p = part("ses")
    L, H = 3.9, 1.35
    pcb = Batch("ses_pcb", PCB(), bevel=0.006)
    pcb.gbox((0.2, H * 0.5 + 0.1, 0), (L - 0.5, H - 0.2, 0.06))
    pcb.finish(parent=p)
    uv_quad("ses_pcb_tex", [(-1.55, 0.3, 0.035), (1.95, 0.3, 0.035),
                            (1.95, 1.3, 0.035), (-1.55, 1.3, 0.035)],
            MAT_PCB_TEX, parent=p)
    gold = Batch("ses_gold", GOLD())
    for i in range(9):
        gold.gbox((-0.7 + i * 0.075, 0.08, 0), (0.05, 0.16, 0.08))
    gold.finish(parent=p)
    # EMI kalkani + kondansatorler
    sh = Batch("ses_kalkan", STEEL(), bevel=0.008)
    sh.gbox((0.55, 0.62, 0.09), (1.1, 0.7, 0.12))
    sh.finish(parent=p)
    cap = Batch("ses_cap", CAP_G(), bevel=0.008)
    for cx, cy in ((-0.6, 0.55), (-0.3, 0.75), (1.5, 0.5), (1.72, 0.72)):
        cap.gcyl((cx, cy, 0.19), 0.13, 0.32, "z", n=14)
    cap.finish(parent=p)
    op = Batch("ses_op", IC(), bevel=0.005)
    for cx, cy in ((1.2, 0.95), (0.0, 1.05), (1.7, 1.1)):
        op.gbox((cx, cy, 0.08), (0.26, 0.22, 0.1))
    op.finish(parent=p)
    # bracket + renkli jaklar
    br = Batch("ses_bracket", STEEL(), bevel=0.006)
    br.gbox((-1.88, 0.68, 0.16), (0.1, 1.3, 0.85))
    br.gbox((-1.88, 1.36, 0.16), (0.1, 0.16, 1.2))
    br.finish(parent=p)
    for col, dy in ((GREENC(), 0.35), (PL_K(), 0.62), (BLUE(), 0.89), (ORANGE(), 1.14)):
        j = Batch("ses_jak", col, bevel=0.005)
        j.gcyl((-1.93, dy, 0.16), 0.115, 0.14, "x", n=14)
        j.finish(parent=p)
    rgb = Batch("ses_rgb", RGB_C())
    rgb.gbox((0.4, 1.28, 0.04), (2.6, 0.05, 0.05))
    rgb.finish(parent=p)
    return p


# ---------------------------------------------------------------- 7) SSD
def yap_ssd():
    p = part("ssd")
    W, D, H = 2.3, 1.6, 0.17
    body = Batch("ssd_body", M("SSD_AL", 0x2A3038, 0.34, 0.8), bevel=0.02, seg=2)
    body.gbox((0, H / 2, 0), (W, H, D))
    body.finish(parent=p)
    uv_quad("ssd_lbl", [(-W / 2 + 0.12, H + 0.003, D / 2 - 0.1), (W / 2 - 0.12, H + 0.003, D / 2 - 0.1),
                        (W / 2 - 0.12, H + 0.003, -D / 2 + 0.1), (-W / 2 + 0.12, H + 0.003, -D / 2 + 0.1)],
            MAT_LBL_SSD, parent=p)
    yazi("UZAY SSD", 0.19, M("SSD_YAZI", 0xE8F6F0, 0.4),
         (-0.15, H + 0.01, 0.32), DUZ_UST, 0.008, parent=p)
    yazi("1 TB", 0.15, M("SSD_YAZI2", 0x2BD9A0, 0.4, 0.1, emit=0x2BD9A0, emit_str=1.0),
         (-0.55, H + 0.01, -0.3), DUZ_UST, 0.008, parent=p)
    # SATA veri + guc konnektoru (arka kenar)
    sc = Batch("ssd_sata", PL_K(), bevel=0.005)
    sg = Batch("ssd_sata_g", GOLD())
    sc.gbox((-0.42, 0.075, -D / 2 - 0.02), (0.52, 0.11, 0.08))
    sg.gbox((-0.42, 0.075, -D / 2 - 0.04), (0.42, 0.05, 0.04))
    sc.gbox((0.35, 0.075, -D / 2 - 0.02), (0.72, 0.11, 0.08))
    sg.gbox((0.35, 0.075, -D / 2 - 0.04), (0.62, 0.05, 0.04))
    sc.finish(parent=p)
    sg.finish(parent=p)
    vd = Batch("ssd_vida", STEEL_D())
    for sx in (-W / 2 + 0.2, W / 2 - 0.2):
        for sz in (-D / 2 + 0.18, D / 2 - 0.18):
            vd.gcyl((sx, H - 0.01, sz), 0.07, 0.04, "y", n=10)
    vd.finish(parent=p)
    return p


# ---------------------------------------------------------------- 8) GUC KAYNAGI
def yap_guc():
    p = part("guc")
    W, D, H = 3.5, 3.3, 2.0
    kasa = Batch("psu_kasa", M("PSU_METAL", 0x2E343B, 0.38, 0.85), bevel=0.03, seg=2)
    kasa.gbox((0, H / 2, 0), (W, H, D))
    kasa.finish(parent=p)
    # ust fan izgarasi + pervane
    izg = Batch("psu_izgara", PL_K(), bevel=0.006)
    for i in range(7):
        izg.gring((0, H + 0.005, 0), 1.35 - i * 0.19, 1.31 - i * 0.19, 0.03, "y", n=26)
    for a in range(6):
        ang = a / 6 * math.pi
        izg.gbox((0, H + 0.005, 0), (2.7 * math.cos(ang) + 0.05, 0.03, 0.05),)
    izg.finish(parent=p)
    fan_govde("FAN_guc", p, (0, H - 0.22, 0), (0, 0, 0), 1.3, 9, PL_G(), kalinlik=0.06)
    # arka: 230V girisi, anahtar, petek delikler
    ark = Batch("psu_arka", PL_K(), bevel=0.006)
    ark.gbox((-W / 2 - 0.02, 0.42, -0.85), (0.1, 0.62, 0.72))
    ark.gbox((-W / 2 - 0.02, 0.42, -0.1), (0.1, 0.34, 0.44))
    ark.finish(parent=p)
    pet = Batch("psu_petek", STEEL_D())
    for i in range(7):
        for j in range(5):
            x = -W / 2 - 0.01
            pet.gcyl((x, 0.35 + j * 0.3, 0.45 + i * 0.2), 0.075, 0.04, "x", n=6)
    pet.finish(parent=p)
    # etiket (yan yuz)
    uv_quad("psu_lbl", [(W / 2 + 0.005, 1.72, -1.35), (W / 2 + 0.005, 1.72, 1.35),
                        (W / 2 + 0.005, 0.28, 1.35), (W / 2 + 0.005, 0.28, -1.35)],
            MAT_LBL_PSU, parent=p)
    yazi("750W", 0.36, M("PSU_YAZI", 0xFFD24A, 0.4, 0.1, emit=0xFFD24A, emit_str=0.8),
         (W / 2 + 0.02, 1.4, 0.55), YUZ_ARTI_X, 0.012, parent=p)
    yazi("UZAY ZONE", 0.2, M("PSU_YAZI2", 0xE8ECEF, 0.45),
         (W / 2 + 0.02, 1.05, 0.55), YUZ_ARTI_X, 0.01, parent=p)
    # modüler kablo yuvalari (on yuz)
    mod = Batch("psu_mod", PL_K(), bevel=0.006)
    mod.gbox((0.0, 1.1, D / 2 + 0.01), (2.6, 1.5, 0.1))
    for cx, cy, w2, h2 in ((-0.85, 1.55, 0.85, 0.3), (0.35, 1.55, 0.55, 0.3),
                           (1.05, 1.55, 0.35, 0.3), (-0.85, 1.05, 0.85, 0.3),
                           (0.35, 1.05, 0.55, 0.3), (1.05, 1.05, 0.35, 0.3),
                           (-0.5, 0.58, 1.55, 0.3)):
        mod.gbox((cx, cy, D / 2 + 0.05), (w2, h2, 0.14))
    mod.finish(parent=p)
    modg = Batch("psu_mod_g", GOLD())
    for cx, cy, w2 in ((-0.85, 1.55, 0.75), (0.35, 1.55, 0.45), (1.05, 1.55, 0.25),
                       (-0.85, 1.05, 0.75), (0.35, 1.05, 0.45), (1.05, 1.05, 0.25),
                       (-0.5, 0.58, 1.45)):
        modg.gbox((cx, cy, D / 2 + 0.1), (w2, 0.06, 0.06))
    modg.finish(parent=p)
    # ayak lastikleri
    ay = Batch("psu_ayak", PL_K(), bevel=0.01)
    for sx in (-1.35, 1.35):
        for sz in (-1.25, 1.25):
            ay.gbox((sx, 0.02, sz), (0.35, 0.05, 0.35))
    ay.finish(parent=p)
    return p


# ---------------------------------------------------------------- 9) SABIT DISK
def yap_disk():
    p = part("disk")
    W, D, H = 3.4, 2.35, 0.62
    gov = Batch("hdd_gov", M("HDD_AL", 0x8E959C, 0.3, 0.92), bevel=0.02, seg=2)
    gov.gbox((0, H / 2, 0), (W, H, D))
    gov.finish(parent=p)
    # ust kapak: vidalar + havalandirma deligi + etiket
    uv_quad("hdd_lbl", [(-1.45, H + 0.004, 0.95), (1.45, H + 0.004, 0.95),
                        (1.45, H + 0.004, -0.95), (-1.45, H + 0.004, -0.95)],
            MAT_LBL_HDD, parent=p)
    yazi("UZAY", 0.24, M("HDD_YAZI", 0x1D2226, 0.45),
         (-0.55, H + 0.012, 0.55), DUZ_UST, 0.008, parent=p)
    yazi("1 TB HDD", 0.17, M("HDD_YAZI2", 0x2A6E58, 0.45),
         (-0.45, H + 0.012, 0.22), DUZ_UST, 0.008, parent=p)
    vd = Batch("hdd_vida", STEEL_D(), bevel=0.004)
    for sx in (-1.5, 0.0, 1.5):
        for sz in (-1.0, 1.0):
            vd.gcyl((sx, H - 0.015, sz), 0.085, 0.05, "y", n=10)
            vd.gbox((sx, H + 0.012, sz), (0.1, 0.02, 0.03))
    vd.gcyl((1.1, H - 0.01, 0.0), 0.05, 0.04, "y", n=10)   # breather hole
    vd.finish(parent=p)
    # alt: PCB + SATA
    pcb = Batch("hdd_pcb", PCB_D(), bevel=0.006)
    pcb.gbox((0, 0.02, 0), (2.9, 0.06, 1.9))
    pcb.finish(parent=p)
    ic = Batch("hdd_ic", IC(), bevel=0.005)
    ic.gbox((0.3, -0.005, 0.2), (0.6, 0.08, 0.6))
    ic.gbox((-0.8, -0.005, -0.4), (0.4, 0.06, 0.3))
    ic.finish(parent=p)
    sc = Batch("hdd_sata", PL_K(), bevel=0.005)
    sg = Batch("hdd_sata_g", GOLD())
    sc.gbox((-0.55, 0.13, -D / 2 - 0.03), (0.55, 0.16, 0.1))
    sg.gbox((-0.55, 0.13, -D / 2 - 0.06), (0.45, 0.07, 0.05))
    sc.gbox((0.35, 0.13, -D / 2 - 0.03), (0.78, 0.16, 0.1))
    sg.gbox((0.35, 0.13, -D / 2 - 0.06), (0.66, 0.07, 0.05))
    sc.finish(parent=p)
    sg.finish(parent=p)
    # yan montaj vidalari
    ym = Batch("hdd_yan", STEEL_D())
    for sx in (-1.1, 0.3, 1.3):
        for sz in (-D / 2, D / 2):
            ym.gcyl((sx, 0.3, sz), 0.07, 0.04, "z", n=10)
    ym.finish(parent=p)
    return p


# ---------------------------------------------------------------- 10) KASA FANI
def yap_fan():
    p = part("fan")
    S = 2.8       # 120mm cerceve (Y x Z duzlemi, X ince)
    T = 0.55
    cer = Batch("fan_cerceve", PL_D(), bevel=0.02, seg=2)
    # dort kenar cubugu
    cer.gbox((0, S / 2, -S / 2 + 0.16), (T, S, 0.32))
    cer.gbox((0, S / 2, S / 2 - 0.16), (T, S, 0.32))
    cer.gbox((0, 0.16, 0), (T, 0.32, S))
    cer.gbox((0, S - 0.16, 0), (T, 0.32, S))
    cer.gring((0, S / 2, 0), 1.42, 1.3, T, "x", n=30)
    cer.finish(parent=p)
    # kose vida delikleri + lastik tamponlar
    vd = Batch("fan_vida", PL_K(), bevel=0.006)
    for dy in (0.3, S - 0.3):
        for dz in (-S / 2 + 0.3, S / 2 - 0.3):
            vd.gring((0, dy, dz), 0.14, 0.075, T + 0.02, "x", n=12)
    vd.finish(parent=p)
    # arka kafes teli
    kaf = Batch("fan_kafes", STEEL_D())
    for i in range(4):
        kaf.gring((-T / 2 - 0.03, S / 2, 0), 1.28 - i * 0.3, 1.24 - i * 0.3, 0.05, "x", n=24)
    for a in range(5):
        ang = a / 5 * math.pi
        kaf.gbox((-T / 2 - 0.03, S / 2, 0), (0.05, 2.56 * abs(math.sin(ang)) + 0.05,
                                             2.56 * abs(math.cos(ang)) + 0.05))
    kaf.finish(parent=p)
    fan_govde("FAN_kasa", p, (0.06, S / 2, 0), (0, math.pi / 2, 0), 1.26, 9, PL_G(), kalinlik=0.07)
    # RGB halka + kablo
    rgb = Batch("fan_rgb", RGB_B())
    rgb.gring((T / 2 - 0.02, S / 2, 0), 1.4, 1.3, 0.06, "x", n=30)
    rgb.finish(parent=p)
    kab = Batch("fan_kablo", PL_K())
    kab.gtube([(0, 0.2, S / 2 - 0.1), (0, 0.15, S / 2 + 0.35), (-0.3, 0.1, S / 2 + 0.8)], 0.055)
    kab.finish(parent=p)
    return p


# ---------------------------------------------------------------- 11) KABLOLAR
def yap_kablo():
    p = part("kablo")
    # 24-pin ATX fisi + ondan cikan renkli demet
    fis = Batch("kb_fis", PL_W(), bevel=0.01)
    fis.gbox((0, 0.19, 0), (0.5, 0.38, 1.55))
    fis.gbox((0.16, 0.42, 0), (0.12, 0.12, 1.3))      # kilit tirnagi
    fis.finish(parent=p)
    pin = Batch("kb_pin", STEEL_D())
    for i in range(12):
        for j in (-0.1, 0.1):
            pin.gbox((j, 0.05, -0.66 + i * 0.12), (0.05, 0.1, 0.05))
    pin.finish(parent=p)
    renkler = [0x181B1F, 0xE0B12A, 0xB4302A, 0x2C63C0, 0x2A9A5E, 0xE4E7EA,
               0xD9752A, 0x7A4FC4, 0x181B1F, 0xE0B12A]
    for i, c in enumerate(renkler):
        z = -0.62 + i * 0.138
        b = Batch("kb_tel_%d" % i, M("KB_%06X" % c, c, 0.52, 0.05))
        b.gtube([(0.0, 0.38, z), (-0.35, 0.62, z * 0.8), (-0.75, 0.82, z * 0.5),
                 (-0.95, 0.62, z * 0.3), (-0.8, 0.3, z * 0.2)], 0.05, n=7)
        b.finish(parent=p)
    # demeti toplayan kelepce
    kel = Batch("kb_kelepce", PL_K(), bevel=0.008)
    kel.gbox((-0.85, 0.6, 0), (0.12, 0.6, 0.85))
    kel.finish(parent=p)
    return p


PART_YAPICILAR = [yap_anakart, yap_cpu, yap_sogutucu,
                  lambda: yap_ram("ram", 0x2F6FD0, 0x3DA8FF),
                  lambda: yap_ram("ram2", 0xB4392F, 0xFF6A4A),
                  yap_ekran, yap_ses, yap_ssd, yap_guc, yap_disk, yap_fan, yap_kablo]


# ================================================================ SAHNE
def root(name, col=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.6
    (col or COL_SCENE).objects.link(e)
    return e


def yap_kasa():
    """KASA: alt tabla + arka/on/yan paneller. Ic hacim x[-6.5,6.5] z[-4.5,4.5] h4.6."""
    global COL
    COL = COL_SCENE
    p = root("KASA")
    X, Z, H, T = 6.5, 4.5, 4.6, 0.3
    met = M("KASA_METAL", 0x262B31, 0.36, 0.8)
    # ic zemin kasa govdesinden acik: parcalar siyah uzerinde siyah kalmasin
    ic = M("KASA_IC", 0x2A3038, 0.52, 0.5)

    # alt tabla (uzerinde standoff delikleri)
    b = Batch("kasa_taban", ic, bevel=0.02)
    b.gbox((0, -T / 2, 0), (X * 2 + T * 2, T, Z * 2 + T * 2))
    b.finish(parent=p)
    dl = Batch("kasa_standoff", STEEL_D())
    for sx in (-6.1, -2.75, 0.6):
        for sz in (-3.7, -1.35, 1.0):
            dl.gring((sx, 0.01, sz), 0.16, 0.09, 0.03, "y", n=12)
    dl.finish(parent=p)

    # arka panel (-X): I/O acikligi, PCI kapaklari, fan yuvasi
    ar = Batch("kasa_arka", met, bevel=0.02)
    ar.gbox((-X - T / 2, H / 2, -Z - T / 2), (T, H, T))          # kose direk
    ar.gbox((-X - T / 2, H / 2, Z + T / 2), (T, H, T))
    ar.gbox((-X - T / 2, H - 0.3, 0), (T, 0.6, Z * 2 + T * 2))   # ust bant
    ar.gbox((-X - T / 2, 0.35, -2.6), (T, 0.7, 3.5))             # alt bant (PSU alti)
    ar.gbox((-X - T / 2, 2.4, -4.0), (T, 4.0, 0.9))              # sol dolgu
    ar.gbox((-X - T / 2, 1.9, 1.05), (T, 3.0, 0.4))
    ar.gbox((-X - T / 2, 0.5, 3.0), (T, 1.0, 2.8))
    ar.gbox((-X - T / 2, 3.6, 3.0), (T, 1.4, 2.8))
    ar.finish(parent=p)
    # PCI slot kapaklari (GPU/ses karti bunlarin yerine gecer)
    pk = Batch("kasa_pci_kapak", STEEL_D(), bevel=0.008)
    for i in range(5):
        z = 1.7 + i * 0.5
        if z > 3.6:
            break
        pk.gbox((-X - 0.02, 1.35, z), (0.08, 2.1, 0.42))
    pk.finish(parent=p)
    # arka fan izgarasi (fan bunun ic tarafina takilir)
    fg = Batch("kasa_fan_izgara", STEEL_D())
    for i in range(6):
        fg.gring((-X - T - 0.02, 1.9, 3.0), 1.35 - i * 0.22, 1.31 - i * 0.22, 0.04, "x", n=24)
    fg.finish(parent=p)

    # on panel (+Z): mesh + guc dugmesi + USB
    on = Batch("kasa_on", met, bevel=0.02)
    on.gbox((0, H / 2, Z + T / 2), (X * 2 + T * 2, H, T))
    on.finish(parent=p)
    mesh = Batch("kasa_mesh", PL_K())
    for i in range(22):
        for j in range(9):
            mesh.gcyl((-4.6 + i * 0.42, 0.7 + j * 0.42, Z + T + 0.01), 0.15, 0.06, "z", n=6)
    mesh.finish(parent=p)
    on2 = Batch("kasa_on_io", PL_D(), bevel=0.01)
    on2.gbox((4.6, 3.9, Z + T + 0.02), (2.6, 0.7, 0.08))
    for i in range(2):
        on2.gbox((4.0 + i * 0.6, 3.9, Z + T + 0.06), (0.4, 0.22, 0.06))
    on2.gcyl((5.5, 3.9, Z + T + 0.06), 0.11, 0.06, "z", n=12)
    on2.finish(parent=p)

    # yan paneller: sag (+X) sabit, sol/ust = KAPAK
    yn = Batch("kasa_yan", met, bevel=0.02)
    yn.gbox((X + T / 2, H / 2, 0), (T, H, Z * 2 + T * 2))
    yn.gbox((0, H / 2, -Z - T / 2), (X * 2 + T * 2, H, T))
    yn.finish(parent=p)
    # ic kablo yonlendirme delikleri (sag panelde)
    kd = Batch("kasa_kablo_delik", PL_K(), bevel=0.01)
    for cz, ch in ((-1.0, 1.6), (2.2, 1.2)):
        kd.gbox((X + 0.02, 1.8, cz), (0.1, ch, 0.7))
    kd.finish(parent=p)
    # drive kafesi (SSD/HDD bolgesinin altina raylar)
    ry = Batch("kasa_ray", STEEL_D(), bevel=0.008)
    for cz in (1.0, 3.3):
        ry.gbox((4.3, 0.04, cz), (3.6, 0.08, 0.2))
    ry.finish(parent=p)
    # PSU bolmesi ayirici
    ay = Batch("kasa_psu_ayirici", ic, bevel=0.01)
    ay.gbox((4.3, 0.03, -2.6), (3.7, 0.06, 3.5))
    ay.finish(parent=p)
    # guc dugmesi (oyun bunu bulup parlatir)
    gd = Batch("GUC_DUGMESI", M("GUC_DUGME", 0x1E2429, 0.35, 0.5), bevel=0.01)
    gd.gcyl((0, 0, 0), 0.42, 0.22, "y", n=22)
    gd.gcyl((0, 0.12, 0), 0.3, 0.06, "y", n=20)
    gd.finish(parent=p, loc=GL(2.6, 4.0, Z + T + 0.05), rot=(math.pi / 2, 0, 0),
              name="GUC_DUGMESI")
    gdi = Batch("GUC_ISIK", M("GUC_ISIK_M", 0x2BD9A0, 0.3, 0.0, emit=0x2BD9A0, emit_str=0.0))
    gdi.gring((0, 0, 0), 0.4, 0.3, 0.05, "y", n=22)
    gdi.finish(parent=p, loc=GL(2.6, 4.0, Z + T + 0.14), rot=(math.pi / 2, 0, 0), name="GUC_ISIK")
    return p


def yap_kapak():
    """KAPAK: sol/ust panel — temperli cam pencereli, 4 vidali."""
    global COL
    COL = COL_SCENE
    p = root("KAPAK")
    X, Z, H = 6.5, 4.5, 4.6
    met = M("KAPAK_METAL", 0x2E343B, 0.3, 0.85)
    b = Batch("kapak_cerceve", met, bevel=0.02, seg=2)
    W, D = X * 2 + 0.6, Z * 2 + 0.6
    b.gbox((0, H + 0.11, -D / 2 + 0.35), (W, 0.14, 0.7))
    b.gbox((0, H + 0.11, D / 2 - 0.35), (W, 0.14, 0.7))
    b.gbox((-W / 2 + 0.35, H + 0.11, 0), (0.7, 0.14, D))
    b.gbox((W / 2 - 0.35, H + 0.11, 0), (0.7, 0.14, D))
    # kenar kivrimi (panelin kasaya oturan dudagi)
    b.gbox((-W / 2 + 0.05, H - 0.1, 0), (0.1, 0.42, D))
    b.gbox((W / 2 - 0.05, H - 0.1, 0), (0.1, 0.42, D))
    b.finish(parent=p)
    cam = Batch("kapak_cam", GLASS())
    cam.gbox((0, H + 0.1, 0), (W - 1.3, 0.06, D - 1.3))
    cam.finish(parent=p)
    yazi("UZAY ZONE", 0.55, M("KAPAK_LOGO", 0x2BD9A0, 0.3, 0.2, emit=0x2BD9A0, emit_str=1.2),
         (0, H + 0.2, 3.4), DUZ_UST, 0.02, parent=p)
    return p


def yap_vida():
    """VIDA: tek basparmak vidasi — oyun 4 kopya alir."""
    global COL
    COL = COL_SCENE
    b = Batch("VIDA", M("VIDA_M", 0xC2C8CE, 0.22, 0.95), bevel=0.01)
    b.cyl((0, 0, 0.0), 0.26, 0.12, "z", n=18)          # tirtilli bas
    for i in range(16):
        a = i / 16 * TAU
        b.box((math.cos(a) * 0.25, math.sin(a) * 0.25, 0.0), (0.06, 0.06, 0.12), rot=(0, 0, a))
    b.cyl((0, 0, 0.09), 0.2, 0.06, "z", n=16)
    b.cyl((0, 0, -0.16), 0.11, 0.2, "z", n=12)          # govde
    b.box((0, 0, 0.055), (0.34, 0.05, 0.03))            # duz kanal
    ob = b.finish(name="VIDA")
    return ob


def yap_masa():
    global COL
    COL = COL_SCENE
    p = root("MASA")
    b = Batch("masa_ust", WOOD(), bevel=0.04, seg=2)
    b.gbox((0, -0.62, 0), (32, 0.55, 24))
    b.finish(parent=p)
    kn = Batch("masa_kenar", M("MASA_KENAR", 0x4A331E, 0.55), bevel=0.02)
    kn.gbox((0, -0.62, 12.0), (32, 0.58, 0.12))
    kn.finish(parent=p)
    bc = Batch("masa_bacak", M("MASA_BACAK", 0x1E2227, 0.42, 0.6), bevel=0.02)
    for sx in (-14.6, 14.6):
        for sz in (-10.4, 10.4):
            bc.gcyl((sx, -3.4, sz), 0.28, 5.1, "y", n=12)
            bc.gbox((sx, -5.9, sz), (1.2, 0.18, 1.2))
    for sx in (-14.6, 14.6):
        bc.gbox((sx, -5.6, 0), (0.5, 0.5, 20.4))
    bc.finish(parent=p)
    # mousepad
    mp = Batch("masa_pad", M("PAD", 0x14181C, 0.72), bevel=0.01)
    mp.gbox((11.0, -0.33, 9.4), (7.0, 0.05, 5.0))
    mp.finish(parent=p)
    rgbp = Batch("masa_pad_rgb", RGB_P())
    for sx, sz, w2, d2 in ((11.0, 6.92, 7.0, 0.08), (11.0, 11.88, 7.0, 0.08),
                           (7.54, 9.4, 0.08, 5.0), (14.46, 9.4, 0.08, 5.0)):
        rgbp.gbox((sx, -0.33, sz), (w2, 0.06, d2))
    rgbp.finish(parent=p)
    return p


def yap_monitor():
    global COL
    COL = COL_SCENE
    p = root("MONITOR")
    darkp = M("MON_PL", 0x14171B, 0.44, 0.35)
    # ayak
    b = Batch("mon_ayak", darkp, bevel=0.03, seg=2)
    b.gbox((0, -0.24, -9.0), (5.4, 0.22, 1.1))
    b.gbox((0, -0.24, -8.2), (1.6, 0.22, 2.2))
    b.gbox((0, 1.4, -9.2), (0.75, 3.4, 0.4))
    b.gbox((0, 3.1, -9.05), (1.6, 1.0, 0.5))
    b.finish(parent=p)
    # panel govdesi: ince cerceve
    bz = Batch("mon_cerceve", darkp, bevel=0.02, seg=2)
    bz.gbox((0, 4.35, -8.85), (11.6, 6.9, 0.28))
    bz.gbox((0, 4.35, -8.68), (11.75, 7.05, 0.08))
    bz.gbox((0, 0.82, -8.8), (11.6, 0.26, 0.32))
    bz.finish(parent=p)
    # arka RGB parlama
    rb = Batch("mon_rgb", RGB_B())
    rb.gring((0, 4.35, -9.02), 1.9, 1.7, 0.05, "z", n=26)
    rb.finish(parent=p)
    # EKRAN: oyun bu yuzeyin materyalini canvas dokusuyla degistirir.
    # Kose sirasi ALT-SOL'dan baslar: ters sirada normal oyunun -Z'sine
    # (monitorun arkasina) bakiyor ve tek yuzlu materyalde ekran siyah kaliyor.
    # z=-8.60: on cerceve plakasi -8.72..-8.64 arasini kapliyor, ekran
    # -8.66'da kalirsa plakanin ICINDE gomulu olup simsiyah gorunuyor.
    scr = uv_quad("EKRAN", [(-5.45, 1.1, -8.60), (5.45, 1.1, -8.60),
                            (5.45, 7.62, -8.60), (-5.45, 7.62, -8.60)],
                  M("EKRAN_MAT", 0x05070A, 0.14, 0.0), parent=p,
                  # kose sirasi ters dondugu icin UV de iki eksende cevrildi,
                  # yoksa BIOS yazisi aynada okunmus gibi cikiyor
                  uv=((0, 1), (1, 1), (1, 0), (0, 0)))
    # guc LED'i
    led = Batch("MON_LED", M("MON_LED_M", 0x1A2A38, 0.3, 0.0, emit=0x2BD9A0, emit_str=0.0))
    led.gcyl((4.9, 0.95, -8.56), 0.09, 0.05, "z", n=12)
    led.finish(parent=p, name="MON_LED")
    yazi("UZAY ZONE", 0.3, M("MON_YAZI", 0x6A7278, 0.5),
         (0, 0.82, -8.56), YUZ_ARTI_Z, 0.008, parent=p)
    return p


def yap_klavye():
    global COL
    COL = COL_SCENE
    p = root("KLAVYE")
    gov = Batch("kl_gov", M("KL_GOV", 0x1B1F24, 0.44, 0.3), bevel=0.02, seg=2)
    gov.gbox((0.0, -0.12, 10.0), (11.0, 0.42, 3.9))
    gov.finish(parent=p)
    tus = Batch("kl_tus", M("KL_TUS", 0x2A3037, 0.62), bevel=0.012)
    rng = random.Random(4)
    for r in range(5):
        z = 8.55 + r * 0.7
        x = -5.25
        if r == 0:
            genisler = [0.56] * 14
        elif r == 4:
            genisler = [0.8, 0.7, 0.9, 4.2, 0.9, 0.7, 0.7, 0.7]
        else:
            genisler = [0.56] * 11 + [1.2]
        for g in genisler:
            if x + g > 5.4:
                break
            tus.gbox((x + g / 2, 0.14, z), (g - 0.09, 0.2, 0.6), )
            x += g
    tus.finish(parent=p)
    rgbk = Batch("kl_rgb", RGB_P())
    rgbk.gbox((0.0, -0.3, 10.0), (10.8, 0.06, 3.7))
    rgbk.finish(parent=p)
    return p


def yap_fare():
    global COL
    COL = COL_SCENE
    p = root("FARE")
    b = Batch("fare_gov", M("FARE", 0x1D2228, 0.42, 0.3), bevel=0.08, seg=3)
    b.gbox((11.0, 0.06, 9.2), (1.5, 0.52, 2.5))
    b.gbox((11.0, 0.3, 9.7), (1.3, 0.3, 1.3))
    b.finish(parent=p)
    t = Batch("fare_tus", M("FARE_T", 0x262C33, 0.5), bevel=0.02)
    t.gbox((10.66, 0.34, 8.4), (0.62, 0.1, 1.1))
    t.gbox((11.34, 0.34, 8.4), (0.62, 0.1, 1.1))
    t.finish(parent=p)
    w = Batch("fare_teker", RGB_C())
    w.gcyl((11.0, 0.42, 8.3), 0.16, 0.12, "x", n=14)
    w.finish(parent=p)
    return p


def yap_tornavida():
    """TORNAVIDA: oyun bunu vidalarin ustune goturur (local +Y uc yonu)."""
    global COL
    COL = COL_SCENE
    sap = Batch("tv_sap", M("TV_SAP", 0xC0392B, 0.4, 0.15), bevel=0.02, seg=2)
    for i in range(8):
        a = i / 8 * TAU
        sap.cyl((math.cos(a) * 0.26, math.sin(a) * 0.26, -1.5), 0.1, 1.7, "z", n=8)
    sap.cyl((0, 0, -1.5), 0.3, 1.75, "z", n=20)
    sap.cyl((0, 0, -2.4), 0.24, 0.12, "z", n=20)
    sap.cyl((0, 0, -0.6), 0.16, 0.2, "z", n=16)
    ob1 = sap.finish(name="TORNAVIDA")
    mil = Batch("tv_mil", STEEL())
    mil.cyl((0, 0, 0.35), 0.075, 2.0, "z", n=14)
    mil.box((0, 0, 1.32), (0.2, 0.05, 0.2))
    mil.box((0, 0, 1.32), (0.05, 0.2, 0.2))
    ob2 = mil.finish(name="tv_mil")
    ob2.parent = ob1
    return ob1


def yap_firca():
    """FIRCA: temizlik aleti."""
    global COL
    COL = COL_SCENE
    sap = Batch("fr_sap", M("FR_SAP", 0x2BD9A0, 0.42, 0.1), bevel=0.02, seg=2)
    sap.cyl((0, 0, -1.2), 0.22, 1.9, "z", n=18)
    sap.box((0, 0, 0.1), (0.7, 0.3, 0.85))
    ob = sap.finish(name="FIRCA")
    kil = Batch("fr_kil", M("FR_KIL", 0x3A3026, 0.85))
    rng = random.Random(6)
    for i in range(80):
        x = rng.uniform(-0.3, 0.3)
        y = rng.uniform(-0.12, 0.12)
        kil.box((x, y, 0.75), (0.035, 0.035, 0.5), rot=(rng.uniform(-.15, .15),
                                                        rng.uniform(-.15, .15), 0))
    k = kil.finish(name="fr_kil")
    k.parent = ob
    return ob


def yap_macun():
    """MACUN: termal macun tupu."""
    global COL
    COL = COL_SCENE
    b = Batch("MACUN", M("MACUN_M", 0xE8EAEC, 0.35, 0.1), bevel=0.02, seg=2)
    b.cyl((0, 0, -0.5), 0.2, 1.3, "z", n=16)
    b.cyl((0, 0, 0.2), 0.2, 0.16, "z", n=16, r2=0.09)
    b.cyl((0, 0, 0.36), 0.09, 0.2, "z", n=12)
    ob = b.finish(name="MACUN")
    kp = Batch("macun_kapak", M("MACUN_K", 0x2BD9A0, 0.4))
    kp.cyl((0, 0, 0.48), 0.12, 0.3, "z", n=14)
    kp.finish(name="macun_kapak").parent = ob
    # not: tup govdesi ham Blender yereli kuruluyor (gcyl degil cyl), bu yuzden
    # buraya oyun koordinatli yazi() koyulmuyor — serit cikartma yetiyor.
    st = Batch("macun_serit", M("MACUN_S", 0x2BD9A0, 0.4))
    st.cyl((0, 0, -0.75), 0.205, 0.16, "z", n=16)
    st.finish(name="macun_serit").parent = ob
    return ob


# ================================================================ INSA
print("[uzayzone] parcalar insa ediliyor...")
COL = COL_PARTS
for f in PART_YAPICILAR:
    ob = f()
    print("   +", ob.name)

print("[uzayzone] sahne insa ediliyor...")
SAHNE_KOKLER = [yap_kasa(), yap_kapak(), yap_vida(), yap_masa(), yap_monitor(),
                yap_klavye(), yap_fare(), yap_tornavida(), yap_firca(), yap_macun()]
for ob in SAHNE_KOKLER:
    print("   +", ob.name)


# ================================================================ IHRACAT
def sec(objeler):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objeler:
        ob.select_set(True)
    if objeler:
        bpy.context.view_layer.objects.active = objeler[0]


def tum(col):
    out = []
    for ob in col.objects:
        out.append(ob)
    return out


def ihrac(col, dosya):
    sec(tum(col))
    yol = os.path.join(ASSETS, dosya)
    bpy.ops.export_scene.gltf(
        filepath=yol,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        # JPEG sart: uretilen PCB/etiket dokulari gurultulu, PNG olarak
        # gomulunce parcalar.glb 5 MB'i asiyor.
        export_image_format="JPEG",
        export_jpeg_quality=78,
        export_texture_dir="",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_extras=False,
    )
    kb = os.path.getsize(yol) / 1024
    print("[uzayzone] %s  ->  %.0f KB" % (dosya, kb))


tri = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
print("[uzayzone] toplam yuz sayisi (bevel oncesi): %d" % tri)

ihrac(COL_PARTS, "parcalar.glb")
ihrac(COL_SCENE, "sahne.glb")


# ================================================================ ONIZLEME
def _kok(ob):
    while ob.parent:
        ob = ob.parent
    return ob


def _sahnede(ob):
    return _kok(ob).name in {o.name for o in SAHNE_KOKLER}


def onizleme():
    print("[uzayzone] onizleme render'i...")
    world = bpy.data.worlds.new("W")
    SCENE.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.05, 0.07, 0.09, 1)
    bg.inputs[1].default_value = 1.2

    def isik(name, loc, energy, size=6.0, col=(1, 1, 1)):
        d = bpy.data.lights.new(name, "AREA")
        d.energy = energy
        d.size = size
        d.color = col
        o = bpy.data.objects.new(name, d)
        SCENE.collection.objects.link(o)
        o.location = loc
        o.rotation_mode = "QUATERNION"
        o.rotation_quaternion = (Vector((0, 0, -1)).rotation_difference(
            Vector((0, 0, 0)) - Vector(loc)))
        return o

    isik("key", (10, -16, 22), 9000, 12)
    isik("fill", (-16, -8, 10), 2500, 14, (0.6, 0.8, 1.0))
    isik("rim", (-4, 14, 12), 3000, 10, (0.5, 1.0, 0.85))

    cam_d = bpy.data.cameras.new("C")
    cam_d.lens = 50
    cam = bpy.data.objects.new("C", cam_d)
    SCENE.collection.objects.link(cam)
    SCENE.camera = cam

    SCENE.render.engine = "CYCLES"
    SCENE.cycles.samples = 40
    SCENE.cycles.use_denoising = True
    SCENE.render.resolution_x = 1100
    SCENE.render.resolution_y = 760
    SCENE.render.film_transparent = False
    SCENE.view_settings.view_transform = "AgX"

    def bak(cam, hedef, mesafe, yukseklik, aci=0.0):
        h = Vector(hedef)
        cam.location = h + Vector((math.sin(aci) * mesafe, -math.cos(aci) * mesafe, yukseklik))
        d = h - cam.location
        cam.rotation_mode = "QUATERNION"
        cam.rotation_quaternion = d.to_track_quat("-Z", "Y")

    def cek(dosya):
        SCENE.render.filepath = os.path.join(HERE, dosya)
        bpy.ops.render.render(write_still=True)
        print("   ->", dosya)

    # 1) parcalari izgaraya yay
    yerler = {"anakart": (-6.5, -1), "sogutucu": (1.5, -2), "ekran": (-5.5, 4.5),
              "guc": (3.5, 3.5), "disk": (-7.5, 9), "fan": (7.5, -1),
              "ses": (-3.0, 8.5), "ssd": (1.0, 9.5), "cpu": (4.2, -0.5),
              "ram": (5.6, -0.5), "ram2": (6.3, -0.5), "kablo": (4.5, 8.5)}
    for ob in tum(COL_PARTS):
        if ob.parent:
            continue
        ob.location = GL(*(yerler.get(ob.name[2:], (0, 0))[0],
                           0, yerler.get(ob.name[2:], (0, 0))[1]))
    for ob in bpy.data.objects:          # empty'yi gizlemek cocuklari gizlemez
        if ob.type == "MESH" and _sahnede(ob):
            ob.hide_render = True
    zem = Batch("zemin", M("ZEM", 0x14181C, 0.7))
    zem.gbox((0, -0.1, 4), (40, 0.2, 40))
    zem.finish(col=SCENE.collection)
    bak(cam, GL(0, 1.2, 5), 20, 14)
    cek("onizleme-parcalar.png")

    # 2) sahne: kasa + masa + monitor, parcalar yerlerinde
    for ob in bpy.data.objects:
        if _sahnede(ob):
            ob.hide_render = _kok(ob).name == "KAPAK"
    KONUM = {"anakart": (-2.75, 0.0, -1.35), "cpu": (-4.6, 0.24, -2.9),
             "sogutucu": (-4.6, 0.37, -2.9), "ram": (-2.2, 0.25, -2.6),
             "ram2": (-1.75, 0.25, -2.6), "ekran": (-3.2, 0.25, -0.3),
             "ses": (-4.35, 0.25, 0.9), "ssd": (4.3, 0.0, 3.3),
             "guc": (4.3, 0.0, -2.6), "disk": (4.3, 0.0, 1.0),
             "fan": (-6.2, 0.6, 3.0), "kablo": (0.6, 0.25, -1.7)}
    for ob in tum(COL_PARTS):
        if ob.parent:
            continue
        pid = ob.name[2:]
        if pid in KONUM:
            ob.location = GL(*KONUM[pid])
    for ob in bpy.data.objects:
        if ob.name in ("TORNAVIDA", "FIRCA", "MACUN"):
            ob.location = GL(9.0 + 1.6 * ("FIRCA" in ob.name) + 3.2 * ("MACUN" in ob.name),
                             -0.1, 2.0)
            ob.rotation_euler = (math.pi / 2, 0, 0.4)
    bak(cam, GL(0, 1.0, -0.5), 21, 15)
    cek("onizleme-sahne.png")
    bak(cam, GL(-3.0, 1.2, -1.0), 11, 8, aci=0.7)
    cek("onizleme-yakin.png")


if DO_RENDER:
    onizleme()

print("[uzayzone] bitti.")

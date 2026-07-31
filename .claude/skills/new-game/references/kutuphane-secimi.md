# Kütüphane Seçimi

Oyun türüne göre **en uygun aracı** seç. Tek bir CDN `<script>` etiketiyle ekle — npm/build adımı yok, hepsi browser-ready. Birden fazla kütüphane gerekirse birleştirebilirsin (örn. PixiJS + Matter.js).

| Tür | Önerilen | Neden |
|---|---|---|
| Basit 2D bulmaca, kart, sıra-tabanlı, kullanıcı arayüzü ağırlıklı | **Vanilla JS + Canvas/DOM** | Küçük, hızlı, bağımlılık yok |
| 2D arcade / platformer / shooter / RPG (sprite, fizik, sahne yönetimi) | **Phaser 3** | Hazır sahne, sprite, tween, arcade/matter fizik, input |
| 2D yüksek performans grafik (binlerce parçacık, shader efektleri) | **PixiJS** | WebGL renderer — Phaser daha framework, Pixi daha grafik |
| 2D fizik bulmaca (sapan, blok yığma, ragdoll, kumaş) | **Matter.js** (Canvas veya Pixi ile) | Saf 2D rigid body fizik motoru |
| 3D oyun / voxel editör / düşük poligon dünya / atış | **Three.js** | En geniş ekosistem, hızlı sahne kurulumu |
| 3D ileri (PBR, fizik, post-process, hazır kamera/giriş) | **Babylon.js** | Built-in fizik, ışık & kameralar, sahne inspector |

## CDN URL'leri

Script tag olarak ekle, `</head>`'den önce veya `</body>`'den hemen önce:

```html
<!-- Three.js -->
<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
<!-- Three.js GLTFLoader (3D model yüklemek için) -->
<script src="https://unpkg.com/three@0.160.0/examples/js/loaders/GLTFLoader.js"></script>

<!-- Babylon.js (çekirdek + loaders) -->
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>

<!-- Phaser 3 -->
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>

<!-- PixiJS v8 -->
<script src="https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.js"></script>

<!-- Matter.js -->
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
```

CDN her zaman erişilebilir olmayabilir — basit oyunlarda kütüphane gereksizse Vanilla JS'i tercih et.

**Sınır:** Bir oyunda en fazla **1-2 kütüphane** kullan; gereksizse vanilla kal.

// ═══════════════════════════════════════════════════════════
//  Ortak Firebase başlatma — Uzay Zone
//
//  Firebase varsayılan uygulaması yalnızca BİR kez kurulabilir.
//  Hem multiplayer.js hem hesap.js kendi initializeApp'ini çağırsaydı
//  ikincisi hata verirdi; ikisi de bu modülü import eder.
// ═══════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase }   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const db  = getDatabase(app);

/* অফলাইনে চালানোর জন্য সার্ভিস ওয়ার্কার: অ্যাপের ফাইল এই ডিভাইসে জমিয়ে রাখে।
 * অনলাইনে থাকলে সবসময় নতুন ভার্সন নেয়; নেট না থাকলে (বা খুব ধীর হলে) জমানো ভার্সন খোলে।
 * ডাটা আলাদাভাবে ব্রাউজারের লোকাল স্টোরেজে সেভ থাকে। */
const VERSION = 'bankcalc-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // একটি ফাইল না থাকলেও বাকিগুলো জমা হবে
    await Promise.all(CORE.map(async u => {
      try { const r = await fetch(u, { cache: 'reload' }); if (r && r.ok) await c.put(u, r); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, er => { clearTimeout(t); reject(er); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // Google Apps Script ইত্যাদি সরাসরি যাবে

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const r = await withTimeout(fetch(req), 5000);   // ধীর নেটে ৫ সেকেন্ডের বেশি অপেক্ষা নয়
        if (r && r.ok) cache.put('./index.html', r.clone());
        return r;
      } catch (_) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const r = await fetch(req);
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    } catch (_) {
      return (await cache.match(req, { ignoreSearch: true })) || Response.error();
    }
  })());
});

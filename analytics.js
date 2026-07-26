// ─── Google Analytics (GA4) ───
// Tüm Uzay Zone sayfaları bu dosyayı yükler. Ölçüm Kimliğini (Measurement ID)
// değiştirmek istersen sadece aşağıdaki GA_ID değerini güncelle.
(function () {
  var GA_ID = 'G-FGEGV2TGQZ';

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
})();

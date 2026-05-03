/**
 * Service Worker registration.
 * 失敗してもアプリ自体は動作する設計（コンソール出力も控えめに）。
 */
(function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* 登録失敗時はオフライン動作のみ無効になる。アプリ機能には影響しない。 */
    });
  });
})();

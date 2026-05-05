/**
 * Service Worker registration.
 * 失敗してもアプリ自体は動作する設計（コンソール出力も控えめに）。
 *
 * 新しい SW (キャッシュ名バンプ後) が activate されたタイミングで
 * 1 度だけページを reload し、ユーザー側で「古い CSS/JS が残ったまま」
 * になる事故を防ぐ。
 */
(function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* 登録失敗時はオフライン動作のみ無効になる。アプリ機能には影響しない。 */
    });
  });
})();

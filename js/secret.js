/**
 * Secret zones controller.
 * 観客から見えない隠しタップ領域（A/B/C）の入力を捕捉し、
 * フォース制御に流す。
 *
 * - ZONE_A: 左上タップ → フォースON、ターゲット = force.targetA
 * - ZONE_B: 右上タップ → フォースON、ターゲット = force.targetB
 * - ZONE_C: タブバー「世界時計」長押し（800ms）→ 設定モーダル
 */

const LONG_PRESS_MS = 800;
const VIBRATION_MS = 10;

function safeVibrate(ms) {
  try {
    if (navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch (_e) {
    /* 無視 */
  }
}

/**
 * シークレット領域を初期化する。
 *
 * @param {object} deps
 * @param {ForceController} deps.force - フォース制御
 * @param {() => void} deps.openSettings - 設定モーダルを開く関数
 */
function initSecretZones({ force, openSettings }) {
  const zoneA = document.getElementById('zoneA');
  const zoneB = document.getElementById('zoneB');
  const zoneC = document.getElementById('zoneC');

  const stopAll = (e) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  };

  if (zoneA) {
    const handler = (e) => {
      stopAll(e);
      force.enable(force.targetA);
      safeVibrate(VIBRATION_MS);
    };
    zoneA.addEventListener('touchstart', handler, { passive: false });
    zoneA.addEventListener('pointerdown', handler);
  }

  if (zoneB) {
    const handler = (e) => {
      stopAll(e);
      force.enable(force.targetB);
      safeVibrate(VIBRATION_MS);
    };
    zoneB.addEventListener('touchstart', handler, { passive: false });
    zoneB.addEventListener('pointerdown', handler);
  }

  if (zoneC) {
    let timer = null;
    let triggered = false;

    const start = (e) => {
      stopAll(e);
      triggered = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        triggered = true;
        safeVibrate([VIBRATION_MS, 30, VIBRATION_MS]);
        openSettings();
      }, LONG_PRESS_MS);
    };

    const cancel = (e) => {
      if (e && e.cancelable) e.preventDefault();
      clearTimeout(timer);
      timer = null;
    };

    zoneC.addEventListener('touchstart', start, { passive: false });
    zoneC.addEventListener('touchend', cancel, { passive: false });
    zoneC.addEventListener('touchcancel', cancel, { passive: false });
    zoneC.addEventListener('touchmove', cancel, { passive: false });
    zoneC.addEventListener('pointerdown', start);
    zoneC.addEventListener('pointerup', cancel);
    zoneC.addEventListener('pointercancel', cancel);
    zoneC.addEventListener('pointerleave', cancel);

    /* 親（タブバーボタン）の click を抑制し、タブ遷移風の演出にも進まないようにする */
    const parentBtn = zoneC.closest('.tabbar-item');
    if (parentBtn) {
      parentBtn.addEventListener('click', (e) => {
        if (triggered) {
          e.preventDefault();
          e.stopPropagation();
          triggered = false;
        }
      });
    }
  }
}

export { initSecretZones };

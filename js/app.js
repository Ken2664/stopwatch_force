/**
 * App entry point.
 * 各モジュールを束ね、状態遷移とレンダリングループを駆動する。
 *
 * 状態遷移:
 *  IDLE
 *   ├─ start → RUNNING
 *  RUNNING
 *   ├─ stop  (force OFF) → STOPPED
 *   ├─ stop  (force ON)  → STOPPED_FORCED  (フォースフラグはここで自動 OFF)
 *   └─ lap                → RUNNING (ラップ追加)
 *  STOPPED / STOPPED_FORCED
 *   ├─ start → RUNNING (再開)
 *   └─ reset → IDLE   (フォースフラグも OFF)
 */

import { StopwatchEngine, STATE } from './stopwatch.js';
import { ForceController } from './force.js';
import { UIController } from './ui.js';
import { initSecretZones } from './secret.js';
import { SettingsModal } from './modal.js';

const engine = new StopwatchEngine();
const force = new ForceController();
const ui = new UIController();
const modal = new SettingsModal(force);

let rafId = 0;

function loop() {
  if (engine.isRunning) {
    const elapsed = engine.elapsed();
    ui.renderTime(elapsed);
    const laps = engine.laps;
    const lastTs = laps.length > 0 ? laps[laps.length - 1] : 0;
    /* 開始直後（laps.length === 0）でも「ラップ1」がライブで動くよう、毎フレーム更新する。
       _liveLapTimeEl が存在しないときは updateLiveLap 側で no-op になる。 */
    ui.updateLiveLap(Math.max(0, elapsed - lastTs));
    rafId = requestAnimationFrame(loop);
  } else {
    rafId = 0;
  }
}

function startLoop() {
  if (rafId === 0) {
    rafId = requestAnimationFrame(loop);
  }
}

function stopLoop() {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function handleStart() {
  engine.start();
  ui.setRightAsStop();
  ui.setLeftAsLap();
  /* 開始直後から「ラップ N+1」（初回開始時はラップ1）をライブ表示する。
     iOS純正と同じ挙動。 */
  ui.rebuildLapList(engine.elapsed(), engine.laps, true);
  startLoop();
}

function handleStop() {
  const realElapsed = engine.elapsed();
  let displayMs;

  if (force.enabled) {
    displayMs = force.resolveDisplay(realElapsed);
    engine.stopWithDisplay(displayMs);
    /* 仕様: スナップストップ後は次回演技に備えてフラグはここでは消さず、
       「リセット」操作時に自動 OFF になる。これは観客の二度目疑い対策が
       「リセット押下後」に発生する想定のため。 */
  } else {
    engine.stop();
    displayMs = engine.elapsed();
  }

  stopLoop();
  ui.renderTime(displayMs);
  ui.setRightAsStart();
  ui.setLeftAsReset();
  /* 停止中もライブラップは最上段に残し、最後の値で凍結表示する。
     ラップ未押下の場合でも「ラップ1」を凍結表示。 */
  ui.rebuildLapList(displayMs, engine.laps, true);
}

function handleLap() {
  const idx = engine.lap();
  if (idx === null) return;
  /* ラップ押下後はリストを再構築（直前のライブラップが完了済みに昇格） */
  ui.rebuildLapList(engine.elapsed(), engine.laps, true);
}

function handleReset() {
  stopLoop();
  engine.reset();
  force.disable();
  ui.clearLaps();
  ui.renderTime(0);
  ui.setRightAsStart();
  ui.setLeftAsReset({ disabled: true });
}

/**
 * 右ボタン (start/stop) のハンドラ。
 * touchstart / pointerdown を最優先で受け、click 遅延を排除する。
 */
function bindRightButton() {
  const btn = ui.rightBtn;
  let consumed = false;

  const onPress = (e) => {
    if (e.cancelable) e.preventDefault();
    if (consumed) return;
    consumed = true;
    setTimeout(() => { consumed = false; }, 250);

    ui.flashPressed(btn);
    if (engine.state === STATE.RUNNING) {
      handleStop();
    } else {
      handleStart();
    }
  };

  btn.addEventListener('touchstart', onPress, { passive: false });
  btn.addEventListener('pointerdown', onPress);
  btn.addEventListener('click', (e) => e.preventDefault());
}

/**
 * 左ボタン (lap/reset) のハンドラ。
 */
function bindLeftButton() {
  const btn = ui.leftBtn;
  let consumed = false;

  const onPress = (e) => {
    if (btn.disabled) return;
    if (e.cancelable) e.preventDefault();
    if (consumed) return;
    consumed = true;
    setTimeout(() => { consumed = false; }, 250);

    ui.flashPressed(btn);
    if (engine.state === STATE.RUNNING) {
      handleLap();
    } else {
      handleReset();
    }
  };

  btn.addEventListener('touchstart', onPress, { passive: false });
  btn.addEventListener('pointerdown', onPress);
  btn.addEventListener('click', (e) => e.preventDefault());
}

/**
 * グローバルなジェスチャ抑制。
 * Webアプリだとバレる典型挙動を徹底的に殺す。
 */
function bindGlobalGuards() {
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());

  document.addEventListener('dblclick', (e) => e.preventDefault());

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('selectstart', (e) => e.preventDefault());

  document.addEventListener('touchmove', (e) => {
    /* モーダル内の入力フォーカス時を除き、画面全体のスクロールを抑制 */
    const target = e.target;
    const isInputInModal = target && target.closest && target.closest('.modal-overlay');
    if (!isInputInModal && e.cancelable) {
      e.preventDefault();
    }
  }, { passive: false });

  /* タブバーのダミータブ: 押下感だけ与え、何もしない */
  document.querySelectorAll('.tabbar-item').forEach((item) => {
    if (item.dataset.tab === 'stopwatch') return;
    item.addEventListener('click', (e) => e.preventDefault());
  });

  /* バックグラウンド/フォアグラウンド復帰時の精度補正 */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && engine.isRunning) {
      ui.renderTime(engine.elapsed());
      startLoop();
    }
  });
}

function bindAll() {
  bindRightButton();
  bindLeftButton();
  bindGlobalGuards();
  initSecretZones({
    force,
    openSettings: () => modal.open(),
  });
}

/**
 * iOS standalone PWA で `.app` の高さが visual viewport 下端まで
 * 届かないケースがあるため、window.innerHeight を CSS 変数に
 * 書き込んで `.app` の height として使えるようにする。
 *
 * - resize / orientationchange で再同期する
 * - visualViewport API があればそちらを優先（iOS で URL バー
 *   や仮想キーボードの出現でも正確な値が取れる）
 */
function syncAppViewportHeight() {
  const candidates = [
    window.visualViewport && window.visualViewport.height,
    window.innerHeight,
    document.documentElement.clientHeight,
    /* iOS standalone PWA (特に iOS 26+) で上記が visual viewport
       下端まで届かないケースの最終手段。standalone なら screen.height
       がデバイス画面の論理 px 高さとほぼ一致する。 */
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      ? window.screen && window.screen.height
      : null,
  ];
  let h = 0;
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v) && v > h) h = v;
  }
  if (h > 0) {
    document.documentElement.style.setProperty('--app-vh', `${h}px`);
  }
}

function bindViewportSync() {
  syncAppViewportHeight();
  window.addEventListener('resize', syncAppViewportHeight);
  window.addEventListener('orientationchange', () => {
    /* orientationchange 直後は寸法が安定しないので少し待ってから再計測 */
    setTimeout(syncAppViewportHeight, 100);
    setTimeout(syncAppViewportHeight, 400);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAppViewportHeight);
  }
}

function bootstrap() {
  bindViewportSync();
  ui.renderTime(0);
  ui.setRightAsStart();
  ui.setLeftAsReset({ disabled: true });
  bindAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}

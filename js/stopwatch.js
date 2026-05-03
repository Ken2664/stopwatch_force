/**
 * Stopwatch engine.
 * 高精度な performance.now() ベースの計測ロジックを提供する。
 * UI には依存せず、純粋なドメインロジックとしてテスト可能。
 */

const STATE = Object.freeze({
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  STOPPED_FORCED: 'STOPPED_FORCED',
});

/**
 * 経過時間 (ms) を MM:SS.cc 形式に整形する。
 * 99分を超えても 100:00.00 のように増えていく。
 *
 * @param {number} ms - 経過時間（ミリ秒、非負）
 * @returns {{ text: string, mm: string, ss: string, cs: string }}
 */
function format(ms) {
  const safe = ms < 0 ? 0 : Math.floor(ms);
  const totalCs = Math.floor(safe / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const mm = pad(min);
  const ss = pad(sec);
  const cc = pad(cs);
  return { text: `${mm}:${ss}.${cc}`, mm, ss, cs: cc };
}

class StopwatchEngine {
  constructor() {
    this._startTime = 0;
    this._accumulated = 0;
    this._running = false;
    this._state = STATE.IDLE;
    this._laps = [];
    this._frozenElapsed = 0;
  }

  get state() {
    return this._state;
  }

  get isRunning() {
    return this._running;
  }

  get laps() {
    return this._laps.slice();
  }

  /**
   * 現在の経過時間 (ms) を返す。
   * 停止中は最後に記録された値を返す。
   */
  elapsed() {
    if (this._running) {
      return this._accumulated + (performance.now() - this._startTime);
    }
    return this._frozenElapsed;
  }

  /**
   * 計測を開始する。
   * IDLE / STOPPED / STOPPED_FORCED いずれの状態からも RUNNING に遷移できる。
   */
  start() {
    if (this._running) return;
    this._startTime = performance.now();
    this._running = true;
    this._state = STATE.RUNNING;
  }

  /**
   * 通常停止。実時間をそのまま固定する。
   * @returns {number} 停止時の経過時間 (ms)
   */
  stop() {
    if (!this._running) return this._frozenElapsed;
    const now = performance.now();
    this._accumulated += now - this._startTime;
    this._running = false;
    this._frozenElapsed = this._accumulated;
    this._state = STATE.STOPPED;
    return this._frozenElapsed;
  }

  /**
   * 停止時に表示される値を任意の値で上書きして停止する。
   * （実時間の積算は通常停止と同じ。表示専用の値だけ別途保持する想定）
   *
   * @param {number} forcedElapsedMs - 表示として固定したい経過時間 (ms)
   * @returns {number} 表示用の固定値
   */
  stopWithDisplay(forcedElapsedMs) {
    if (this._running) {
      const now = performance.now();
      this._accumulated += now - this._startTime;
      this._running = false;
    }
    this._frozenElapsed = Math.max(0, Math.floor(forcedElapsedMs));
    this._state = STATE.STOPPED_FORCED;
    return this._frozenElapsed;
  }

  /**
   * リセット。すべての内部状態を初期化する。
   * 呼び出し側でフォースフラグの解除も行うこと（force.js 側で対応）。
   */
  reset() {
    this._startTime = 0;
    this._accumulated = 0;
    this._running = false;
    this._frozenElapsed = 0;
    this._laps = [];
    this._state = STATE.IDLE;
  }

  /**
   * ラップを記録する。RUNNING の時のみ有効。
   * @returns {number|null} 記録したラップのインデックス、無効なら null
   */
  lap() {
    if (!this._running) return null;
    const elapsed = this.elapsed();
    this._laps.push(elapsed);
    return this._laps.length - 1;
  }
}

export { StopwatchEngine, STATE, format };

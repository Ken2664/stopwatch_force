/**
 * Force logic.
 * フォースモードのフラグ管理、A/B 2系統のターゲット値の保持、
 * 表示値の算出を担う。
 *
 * 重要な仕様:
 *  - ミリ秒2桁 (centisec, 0..99) のみを書き換え、整数秒は実時間を保持する。
 *  - リセット時は enabled を自動で false に戻す（targetA/targetB は維持）。
 *  - targetA / targetB は内部的には centisec (0..99) として保持するが、
 *    UI上は 1..52 を入力。
 *  - 演技時は zoneA / zoneB を押した瞬間に「どちらのターゲットを
 *    使うか」が決定し、その値が _activeTarget に固定される。
 */

const STORAGE_KEY = 'magic_sw_settings_v2';
const DEFAULT_TARGET_A = 17;
const DEFAULT_TARGET_B = 34;
const MIN_TARGET = 1;
const MAX_TARGET = 52;

/**
 * 経過時間 (ms) のミリ秒2桁部分のみをターゲット値で上書きする。
 *
 * @param {number} elapsedMs - 実際の経過時間 (ms)
 * @param {number} target - centisec 値 (0..99)
 * @returns {number} 整数秒 + target * 10 ms
 */
function applyForce(elapsedMs, target) {
  const safeElapsed = Math.max(0, Math.floor(elapsedMs));
  const wholeSecMs = Math.floor(safeElapsed / 1000) * 1000;
  const forcedCs = Math.max(0, Math.min(99, Math.floor(target)));
  return wholeSecMs + forcedCs * 10;
}

/**
 * UI 入力 (1..52) を内部の centisec 値にクランプ・正規化する。
 */
function normalizeTarget(input, fallback = DEFAULT_TARGET_A) {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n)) return fallback;
  if (n < MIN_TARGET) return MIN_TARGET;
  if (n > MAX_TARGET) return MAX_TARGET;
  return n;
}

class ForceController {
  constructor() {
    this._enabled = false;
    this._targetA = DEFAULT_TARGET_A;
    this._targetB = DEFAULT_TARGET_B;
    /* 直近に zoneA / zoneB のどちらを押したかで決まる「実効ターゲット」。
       enable() に渡された値をそのまま採用する。 */
    this._activeTarget = DEFAULT_TARGET_A;
    this._load();
  }

  get enabled() {
    return this._enabled;
  }

  get targetA() {
    return this._targetA;
  }

  get targetB() {
    return this._targetB;
  }

  /**
   * フォースモードを ON にし、停止時に表示する数字を確定する。
   * @param {number} target - centisec 値 (1..52)。zoneA/zoneB のハンドラから
   *                         force.targetA / force.targetB を渡してもらう想定。
   */
  enable(target) {
    this._activeTarget = normalizeTarget(target, this._targetA);
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }

  setTargetA(value) {
    this._targetA = normalizeTarget(value, this._targetA);
    this._save();
  }

  setTargetB(value) {
    this._targetB = normalizeTarget(value, this._targetB);
    this._save();
  }

  /**
   * 実経過時間に対してフォースが必要なら適用した値を返す。
   * フォース無効時は実時間をそのまま返す。
   */
  resolveDisplay(elapsedMs) {
    if (!this._enabled) return Math.max(0, Math.floor(elapsedMs));
    return applyForce(elapsedMs, this._activeTarget);
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (typeof data.targetA === 'number') {
          this._targetA = normalizeTarget(data.targetA, DEFAULT_TARGET_A);
        }
        if (typeof data.targetB === 'number') {
          this._targetB = normalizeTarget(data.targetB, DEFAULT_TARGET_B);
        }
      }
    } catch (_e) {
      /* localStorage 不可環境では既定値で続行 */
    }
  }

  _save() {
    try {
      const payload = {
        targetA: this._targetA,
        targetB: this._targetB,
        last_updated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_e) {
      /* 失敗しても無視 */
    }
  }
}

export {
  ForceController,
  applyForce,
  normalizeTarget,
  DEFAULT_TARGET_A,
  DEFAULT_TARGET_B,
  MIN_TARGET,
  MAX_TARGET,
};

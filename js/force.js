/**
 * Force logic.
 * フォースモードのフラグ管理、ターゲット値の保持、表示値の算出を担う。
 *
 * 重要な仕様:
 *  - ミリ秒2桁 (centisec, 0..99) のみを書き換え、整数秒は実時間を保持する。
 *  - リセット時は enabled を自動で false に戻す（target は維持）。
 *  - target は内部的には centisec (0..99) として保持するが、UI上は 1..52 を入力。
 */

const STORAGE_KEY = 'magic_sw_settings_v1';
const DEFAULT_TARGET = 34;
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
function normalizeTarget(input) {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n)) return DEFAULT_TARGET;
  if (n < MIN_TARGET) return MIN_TARGET;
  if (n > MAX_TARGET) return MAX_TARGET;
  return n;
}

class ForceController {
  constructor() {
    this._enabled = false;
    this._target = DEFAULT_TARGET;
    this._load();
  }

  get enabled() {
    return this._enabled;
  }

  get target() {
    return this._target;
  }

  /**
   * フォースモードを ON/OFF する。
   * 任意で同時にターゲット値も更新する。
   */
  enable(target) {
    if (typeof target === 'number') {
      this._target = normalizeTarget(target);
    }
    this._enabled = true;
    this._save();
  }

  disable() {
    this._enabled = false;
    this._save();
  }

  toggle() {
    this._enabled = !this._enabled;
    this._save();
    return this._enabled;
  }

  setTarget(target) {
    this._target = normalizeTarget(target);
    this._save();
  }

  /**
   * 実経過時間に対してフォースが必要なら適用した値を返す。
   * フォース無効時は実時間をそのまま返す。
   */
  resolveDisplay(elapsedMs) {
    if (!this._enabled) return Math.max(0, Math.floor(elapsedMs));
    return applyForce(elapsedMs, this._target);
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (typeof data.target === 'number') {
          this._target = normalizeTarget(data.target);
        }
      }
    } catch (_e) {
      /* localStorage 不可環境では既定値で続行 */
    }
  }

  _save() {
    try {
      const payload = {
        target: this._target,
        last_updated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_e) {
      /* 失敗しても無視 */
    }
  }
}

export { ForceController, applyForce, normalizeTarget, DEFAULT_TARGET, MIN_TARGET, MAX_TARGET };

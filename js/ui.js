/**
 * UI controller.
 * DOM 要素の取得・更新・ボタン状態の切り替えを担う。
 *
 * ラップ表示は iOS 純正に倣い、以下の挙動とする:
 *  - 最上段は「現在計測中のラップ」（ライブ更新、ティック表示）
 *  - 下段は「完了済みラップ」を新しい順に並べる
 *  - 完了済みラップが2件以上で、最速/最遅が異なる場合のみ
 *    緑/赤でハイライトする
 *  - 各ラップの値は累積ではなく「ラップ間の差分（デルタ）」を表示
 */

import { format } from './stopwatch.js';

class UIController {
  constructor() {
    this.timeDisplay = document.getElementById('timeDisplay');
    this.leftBtn = document.getElementById('leftBtn');
    this.rightBtn = document.getElementById('rightBtn');
    this.lapList = document.getElementById('lapList');

    this._liveLapTimeEl = null;
  }

  renderTime(ms) {
    this.timeDisplay.textContent = format(ms).text;
  }

  setRightAsStart() {
    this.rightBtn.classList.remove('stop-btn');
    this.rightBtn.classList.add('start-btn');
    this.rightBtn.querySelector('.btn-label').textContent = '開始';
    this.rightBtn.dataset.action = 'start';
  }

  setRightAsStop() {
    this.rightBtn.classList.remove('start-btn');
    this.rightBtn.classList.add('stop-btn');
    this.rightBtn.querySelector('.btn-label').textContent = '停止';
    this.rightBtn.dataset.action = 'stop';
  }

  setLeftAsLap() {
    this.leftBtn.disabled = false;
    this.leftBtn.querySelector('.btn-label').textContent = 'ラップ';
    this.leftBtn.dataset.action = 'lap';
  }

  setLeftAsReset({ disabled = false } = {}) {
    this.leftBtn.disabled = disabled;
    this.leftBtn.querySelector('.btn-label').textContent = 'リセット';
    this.leftBtn.dataset.action = 'reset';
  }

  flashPressed(button) {
    if (!button) return;
    button.classList.add('is-pressed');
    setTimeout(() => button.classList.remove('is-pressed'), 100);
  }

  /**
   * ラップ表示を全消去する。
   */
  clearLaps() {
    this._liveLapTimeEl = null;
    while (this.lapList.firstChild) {
      this.lapList.removeChild(this.lapList.firstChild);
    }
  }

  /**
   * ラップリストをまるごと再構築する。
   * 呼び出しは「LAP/STOP/RESET/STARTで状態が変わった時」のみ。
   * 各フレーム更新は updateLiveLap() を使うこと。
   *
   * @param {number} elapsedMs - 現在の経過時間
   * @param {number[]} lapTimestamps - LAP押下時の累積ms配列
   * @param {boolean} hasLiveLap - ライブラップを最上段に表示するか
   */
  rebuildLapList(elapsedMs, lapTimestamps, hasLiveLap) {
    this._liveLapTimeEl = null;
    while (this.lapList.firstChild) {
      this.lapList.removeChild(this.lapList.firstChild);
    }

    /* 完了済みラップが0件でも、計測開始されていればライブラップ（ラップ1）を表示する。
       完全に何も表示しないのは「リセット直後（IDLE）」だけ。 */
    if (!hasLiveLap && lapTimestamps.length === 0) return;

    const completedDeltas = computeDeltas(lapTimestamps);
    const { fastestIdx, slowestIdx } = findFastestSlowest(completedDeltas);

    if (hasLiveLap) {
      const lastTs = lapTimestamps.length > 0
        ? lapTimestamps[lapTimestamps.length - 1]
        : 0;
      const liveDelta = Math.max(0, elapsedMs - lastTs);
      const liveNum = lapTimestamps.length + 1;
      const liveLi = createLapLi(liveNum, liveDelta, ['live']);
      this.lapList.appendChild(liveLi);
      this._liveLapTimeEl = liveLi.querySelector('.lap-time');
    }

    for (let i = completedDeltas.length - 1; i >= 0; i--) {
      const cls = [];
      if (i === fastestIdx) cls.push('fastest');
      if (i === slowestIdx) cls.push('slowest');
      const li = createLapLi(i + 1, completedDeltas[i], cls);
      this.lapList.appendChild(li);
    }
  }

  /**
   * ライブラップの時刻表示だけを更新する。毎フレーム呼ばれる軽量パス。
   */
  updateLiveLap(deltaMs) {
    if (!this._liveLapTimeEl) return;
    this._liveLapTimeEl.textContent = format(deltaMs).text;
  }
}

/**
 * 累積タイムスタンプ配列から、各ラップのデルタを算出する。
 */
function computeDeltas(lapTimestamps) {
  const deltas = [];
  for (let i = 0; i < lapTimestamps.length; i++) {
    const prev = i === 0 ? 0 : lapTimestamps[i - 1];
    deltas.push(Math.max(0, lapTimestamps[i] - prev));
  }
  return deltas;
}

/**
 * 完了済みラップのうち、最速/最遅のインデックスを返す。
 * 2件未満、または全て同値の場合は { fastestIdx: -1, slowestIdx: -1 } を返す。
 */
function findFastestSlowest(deltas) {
  if (deltas.length < 2) return { fastestIdx: -1, slowestIdx: -1 };
  let minIdx = 0;
  let maxIdx = 0;
  for (let i = 1; i < deltas.length; i++) {
    if (deltas[i] < deltas[minIdx]) minIdx = i;
    if (deltas[i] > deltas[maxIdx]) maxIdx = i;
  }
  if (deltas[minIdx] === deltas[maxIdx]) {
    return { fastestIdx: -1, slowestIdx: -1 };
  }
  return { fastestIdx: minIdx, slowestIdx: maxIdx };
}

function createLapLi(num, deltaMs, extraClasses = []) {
  const li = document.createElement('li');
  for (const c of extraClasses) {
    if (c) li.classList.add(c);
  }
  const name = document.createElement('span');
  name.className = 'lap-name';
  name.textContent = `ラップ ${num}`;
  const time = document.createElement('span');
  time.className = 'lap-time';
  time.textContent = format(deltaMs).text;
  li.appendChild(name);
  li.appendChild(time);
  return li;
}

export { UIController };

/**
 * Settings modal controller.
 * 現場で zoneA / zoneB に割り当てるターゲット数字 (1..52) を
 * 個別に変更するためのマジシャン専用UI。
 * 開閉・入力反映・永続化（force.js 経由）を担う。
 */

import { MIN_TARGET, MAX_TARGET, normalizeTarget } from './force.js';

class SettingsModal {
  /**
   * @param {ForceController} force
   */
  constructor(force) {
    this.force = force;
    this.overlay = document.getElementById('settingsModal');
    this.inputA = document.getElementById('targetAInput');
    this.inputB = document.getElementById('targetBInput');
    this.viewA = document.getElementById('currentTargetAView');
    this.viewB = document.getElementById('currentTargetBView');
    this.closeBtn = document.getElementById('modalCloseBtn');

    [this.inputA, this.inputB].forEach((input) => {
      if (!input) return;
      input.min = String(MIN_TARGET);
      input.max = String(MAX_TARGET);
    });

    this._bind();
  }

  open() {
    if (this.inputA) this.inputA.value = String(this.force.targetA);
    if (this.inputB) this.inputB.value = String(this.force.targetB);
    if (this.viewA) this.viewA.textContent = String(this.force.targetA);
    if (this.viewB) this.viewB.textContent = String(this.force.targetB);
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      if (this.inputA) this.inputA.focus({ preventScroll: true });
    }, 50);
  }

  close() {
    this._commit();
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }

  _commit() {
    if (this.inputA) {
      const a = normalizeTarget(this.inputA.value, this.force.targetA);
      this.force.setTargetA(a);
      this.inputA.value = String(a);
      if (this.viewA) this.viewA.textContent = String(a);
    }
    if (this.inputB) {
      const b = normalizeTarget(this.inputB.value, this.force.targetB);
      this.force.setTargetB(b);
      this.inputB.value = String(b);
      if (this.viewB) this.viewB.textContent = String(b);
    }
  }

  _bind() {
    if (this.inputA) {
      this.inputA.addEventListener('input', () => {
        const v = normalizeTarget(this.inputA.value, this.force.targetA);
        if (this.viewA) this.viewA.textContent = String(v);
      });
      this.inputA.addEventListener('blur', () => {
        this.inputA.value = String(normalizeTarget(this.inputA.value, this.force.targetA));
      });
    }
    if (this.inputB) {
      this.inputB.addEventListener('input', () => {
        const v = normalizeTarget(this.inputB.value, this.force.targetB);
        if (this.viewB) this.viewB.textContent = String(v);
      });
      this.inputB.addEventListener('blur', () => {
        this.inputB.value = String(normalizeTarget(this.inputB.value, this.force.targetB));
      });
    }

    this.closeBtn.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.close();
    }, { passive: false });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }
}

export { SettingsModal };

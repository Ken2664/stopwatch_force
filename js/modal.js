/**
 * Settings modal controller.
 * 現場でターゲット数字 (1..52) を変更するためのマジシャン専用UI。
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
    this.input = document.getElementById('targetInput');
    this.toggle = document.getElementById('forceToggle');
    this.currentView = document.getElementById('currentTargetView');
    this.closeBtn = document.getElementById('modalCloseBtn');

    this.input.min = String(MIN_TARGET);
    this.input.max = String(MAX_TARGET);

    this._bind();
  }

  open() {
    this.input.value = String(this.force.target);
    this.toggle.checked = this.force.enabled;
    this.currentView.textContent = String(this.force.target);
    this.overlay.hidden = false;
    this.overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => this.input.focus({ preventScroll: true }), 50);
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
    const v = normalizeTarget(this.input.value);
    this.force.setTarget(v);
    if (this.toggle.checked) {
      this.force.enable(v);
    } else {
      this.force.disable();
    }
    this.currentView.textContent = String(v);
    this.input.value = String(v);
  }

  _bind() {
    this.input.addEventListener('input', () => {
      const v = normalizeTarget(this.input.value);
      this.currentView.textContent = String(v);
    });
    this.input.addEventListener('blur', () => {
      this.input.value = String(normalizeTarget(this.input.value));
    });

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

// wheels.js — кастомные числовые пикеры с кнопками ↑/↓ и акселерацией удержания
// Совместимо с существующей разметкой .wheel[data-key][data-min][data-max][data-step][data-value]

export function initWheels() {
  // --- мост к реальным hidden/number инпутам в сайдбаре ---
  const inputBridge = {
    focus: document.getElementById('bFocus'),
    break: document.getElementById('bBreak'),
    cycles: document.getElementById('bCycles'),
  };

  // чтобы колёса подхватывали внешние изменения (например, из кода)
  const bridgeListeners = [];
  const onBridgeChange = (key, handler) => {
    const el = inputBridge[key];
    if (!el) return;
    const fn = () => handler(el.value);
    el.addEventListener('input', fn);
    el.addEventListener('change', fn);
    bridgeListeners.push(() => {
      el.removeEventListener('input', fn);
      el.removeEventListener('change', fn);
    });
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const toInt = (v, fb = 0) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fb;
  };

  const labelFrom = (el) => {
    if (el.dataset.label) return el.dataset.label;
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    const n = el.closest('.wheel-wrap')?.querySelector('.wheel-label');
    return n ? n.textContent.trim() : 'значение';
  };

  const valuedText = (key, v) => {
    // Чуть осмысленнее aria-valuetext
    if (key === 'cycles') return `${v} циклов`;
    return `${v} минут`;
  };

  const updateInput = (key, value) => {
    const input = inputBridge[key];
    if (!input) return;
    input.value = String(value);
    // отдаём событие наверх (sidebar.js слушает input/change)
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // --- инициализация одного пикера ---
  const initPicker = (element) => {
    // защита от двойной инициализации
    if (element.__wheelInited) return null;
    element.__wheelInited = true;

    const key = element.dataset.key || '';
    const min = toInt(element.dataset.min, 0);
    const max = toInt(element.dataset.max, 0);
    const stepBase = Math.max(1, toInt(element.dataset.step, 1));
    let currentValue = clamp(toInt(element.dataset.value, min), min, max);
    const label = labelFrom(element);

    // Разметка
    element.innerHTML = '';
    element.setAttribute('role', 'spinbutton');
    element.setAttribute('aria-valuemin', String(min));
    element.setAttribute('aria-valuemax', String(max));
    element.setAttribute('aria-label', label);
    element.tabIndex = -1;

    const mkArrow = (dir) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `wheel-arrow wheel-arrow--${dir}`;
      btn.setAttribute(
        'aria-label',
        `${dir === 'up' ? 'Увеличить' : 'Уменьшить'} ${label.toLowerCase()}`
      );
      const pts = dir === 'up' ? '6 15 12 9 18 15' : '6 9 12 15 18 9';
      btn.innerHTML = `
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      return btn;
    };

    const upBtn = mkArrow('up');
    const downBtn = mkArrow('down');

    const valueEl = document.createElement('input');
    valueEl.type = 'text';
    valueEl.inputMode = 'numeric';
    valueEl.autocomplete = 'off';
    valueEl.spellcheck = false;
    valueEl.pattern = '\\d*';
    valueEl.className = 'wheel-input';
    valueEl.setAttribute('aria-label', label);
    valueEl.setAttribute('maxlength', String(max).length);

    element.append(upBtn, valueEl, downBtn);

    // --- служебки для очистки ---
    const cleanup = [];
    const on = (t, ev, h, opt) => {
      t.addEventListener(ev, h, opt);
      cleanup.push(() => t.removeEventListener(ev, h, opt));
    };

    // --- применение значения ---
    const applyValue = (value, { force = false, emit = true } = {}) => {
      const next = clamp(toInt(value, currentValue), min, max);
      if (!force && next === currentValue) return;
      currentValue = next;

      element.dataset.value = String(currentValue);
      element.setAttribute('aria-valuenow', String(currentValue));
      element.setAttribute('aria-valuetext', valuedText(key, currentValue));
      valueEl.value = String(currentValue);

      if (emit) updateInput(key, currentValue);
    };

    const changeBy = (delta) => {
      if (!delta) return;
      applyValue(currentValue + delta);
    };

    // --- удержание (акселерация) ---
    const setupHold = (btn, dirStep) => {
      let skipNextClick = false;
      let tHold = null;
      let tRep = null;
      let repCount = 0;

      const clearTimers = () => {
        if (tHold) (clearTimeout(tHold), (tHold = null));
        if (tRep) (clearInterval(tRep), (tRep = null));
      };

      const accelTick = () => {
        // каждые ~10 тиков увеличиваем шаг и ускоряем интервал
        repCount += 1;
        const mult = repCount >= 30 ? 10 : repCount >= 15 ? 5 : repCount >= 7 ? 2 : 1;
        changeBy(dirStep * mult);
      };

      const startRepeat = () => {
        // начальный интервал
        let interval = 120;
        tRep = setInterval(accelTick, interval);

        // постепенное ускорение
        const speedUp = () => {
          if (!tRep) return;
          clearInterval(tRep);
          interval = Math.max(40, interval - 20);
          tRep = setInterval(accelTick, interval);
        };
        // ускоряем каждые 500 мс
        const booster = setInterval(speedUp, 500);
        cleanup.push(() => clearInterval(booster));
      };

      const stop = () => {
        clearTimers();
        repCount = 0;
        setTimeout(() => {
          skipNextClick = false;
        }, 0);
      };

      on(btn, 'pointerdown', (e) => {
        skipNextClick = true;
        e.preventDefault();
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {}
        // мгновенный шаг
        changeBy(dirStep);
        clearTimers();
        tHold = setTimeout(startRepeat, 350);
      });

      ['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
        on(btn, ev, stop)
      );

      on(btn, 'click', (e) => {
        if (skipNextClick) {
          e.preventDefault();
          skipNextClick = false;
          return;
        }
        changeBy(dirStep);
      });

      on(btn, 'keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          skipNextClick = true;
          changeBy(dirStep);
        }
      });

      cleanup.push(() => clearTimers());
    };

    setupHold(upBtn, +stepBase);
    setupHold(downBtn, -stepBase);

    // --- колесо мыши ---
    on(
      element,
      'wheel',
      (e) => {
        e.preventDefault();
        const d = Math.sign(e.deltaY || e.detail || 0);
        if (!d) return;
        changeBy(d > 0 ? -stepBase : stepBase);
      },
      { passive: false }
    );

    // --- ручной ввод ---
    const commitManual = () => {
      const digits = valueEl.value.replace(/\D+/g, '');
      valueEl.value = digits;
      if (!digits) {
        valueEl.value = String(currentValue);
        return;
      }
      const parsed = toInt(digits, currentValue);
      applyValue(parsed, { force: true });
    };

    on(valueEl, 'input', () => {
      const digits = valueEl.value.replace(/\D+/g, '');
      if (digits !== valueEl.value) valueEl.value = digits;
    });
    on(valueEl, 'change', commitManual);
    on(valueEl, 'blur', commitManual);

    // --- клавиатура ---
    on(valueEl, 'keydown', (e) => {
      // модификаторы шага
      const mult = e.ctrlKey || e.metaKey ? 10 : e.shiftKey ? 5 : 1;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          changeBy(stepBase * mult);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeBy(-stepBase * mult);
          break;
        case 'PageUp':
          e.preventDefault();
          changeBy(stepBase * 5 * mult);
          break;
        case 'PageDown':
          e.preventDefault();
          changeBy(-stepBase * 5 * mult);
          break;
        case 'Home':
          e.preventDefault();
          applyValue(min, { force: true });
          break;
        case 'End':
          e.preventDefault();
          applyValue(max, { force: true });
          break;
        case 'Enter':
          e.preventDefault();
          commitManual();
          valueEl.select();
          break;
        default:
          // прочее — по умолчанию
          break;
      }
    });

    // --- синк от внешнего инпута-моста ---
    if (key === 'focus' || key === 'break' || key === 'cycles') {
      onBridgeChange(key, (val) => {
        const parsed = toInt(val, currentValue);
        // подтягиваем без эмита в мост (во избежание цикла)
        applyValue(parsed, { force: true, emit: false });
      });
    }

    // старт
    applyValue(currentValue, { force: true, emit: true });

    // публичные методы одного колеса
    return {
      refreshFromBridge() {
        const v = toInt(inputBridge[key]?.value, currentValue);
        applyValue(v, { force: true, emit: false });
      },
      destroy() {
        cleanup.forEach((fn) => fn());
        element.__wheelInited = false;
      },
    };
  };

  // --- инициализация всех колёс на странице ---
  const controllers = [];
  document.querySelectorAll('.wheel').forEach((el) => {
    const ctrl = initPicker(el);
    if (ctrl) controllers.push(ctrl);
  });

  // Возвращаем API для внешнего контроля
  const api = {
    refresh() {
      controllers.forEach((c) => c.refreshFromBridge?.());
    },
    destroy() {
      controllers.forEach((c) => c.destroy?.());
      bridgeListeners.forEach((off) => off());
    },
  };

  // Удобство: положим ссылку на API в документ (не обязательно)
  document.__wheelsApi = api;
  return api;
}

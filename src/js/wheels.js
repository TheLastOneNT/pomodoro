// Кастомные числовые пикеры с кнопками вверх/вниз
export function initWheels() {
  const inputBridge = {
    focus: document.getElementById('bFocus'),
    break: document.getElementById('bBreak'),
    cycles: document.getElementById('bCycles'),
  };

  const updateInput = (key, value) => {
    const input = inputBridge[key];
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const getLabel = (element) => {
    if (element.dataset.label) return element.dataset.label;
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
    const labelNode = element.closest('.wheel-wrap')?.querySelector('.wheel-label');
    return labelNode ? labelNode.textContent.trim() : 'значение';
  };

  const initPicker = (element) => {
    const min = parseInt(element.dataset.min || '0', 10);
    const max = parseInt(element.dataset.max || '0', 10);
    const step = parseInt(element.dataset.step || '1', 10);
    const key = element.dataset.key;
    let currentValue = clamp(parseInt(element.dataset.value || String(min), 10), min, max);
    const label = getLabel(element);

    element.innerHTML = '';
    element.setAttribute('role', 'spinbutton');
    element.setAttribute('aria-valuemin', String(min));
    element.setAttribute('aria-valuemax', String(max));
    element.setAttribute('aria-label', label);
    element.tabIndex = -1;

    const createArrow = (direction) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `wheel-arrow wheel-arrow--${direction}`;
      button.setAttribute(
        'aria-label',
        `${direction === 'up' ? 'Увеличить' : 'Уменьшить'} ${label.toLowerCase()}`
      );
      const points = direction === 'up' ? '6 15 12 9 18 15' : '6 9 12 15 18 9';
      button.innerHTML = `
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <polyline
            points="${points}"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      `;
      return button;
    };

    const upBtn = createArrow('up');

    const valueEl = document.createElement('input');
    valueEl.type = 'text';
    valueEl.inputMode = 'numeric';
    valueEl.autocomplete = 'off';
    valueEl.spellcheck = false;
    valueEl.pattern = '\\d*';
    valueEl.className = 'wheel-input';
    valueEl.setAttribute('aria-label', label);
    valueEl.setAttribute('maxlength', String(max).length);

    const downBtn = createArrow('down');

    element.append(upBtn, valueEl, downBtn);

    const cleanup = [];
    const addListener = (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      cleanup.push(() => target.removeEventListener(event, handler, options));
    };

    const applyValue = (value, { force = false, emit = true } = {}) => {
      const next = clamp(value, min, max);
      if (!force && next === currentValue) return;
      currentValue = next;
      element.dataset.value = String(currentValue);
      element.setAttribute('aria-valuenow', String(currentValue));
      element.setAttribute('aria-valuetext', String(currentValue));
      valueEl.value = String(currentValue);
      if (emit) updateInput(key, currentValue);
    };

    const changeBy = (delta) => {
      if (!delta) return;
      applyValue(currentValue + delta);
    };

    const setupHold = (button, delta) => {
      let skipNextClick = false;
      let holdTimeout = null;
      let holdInterval = null;

      const clearTimers = () => {
        if (holdTimeout) {
          clearTimeout(holdTimeout);
          holdTimeout = null;
        }
        if (holdInterval) {
          clearInterval(holdInterval);
          holdInterval = null;
        }
      };

      const stop = () => {
        clearTimers();
        setTimeout(() => {
          skipNextClick = false;
        }, 0);
      };

      addListener(button, 'pointerdown', (event) => {
        skipNextClick = true;
        event.preventDefault();
        try {
          button.setPointerCapture(event.pointerId);
        } catch {}
        changeBy(delta);
        clearTimers();
        holdTimeout = window.setTimeout(() => {
          holdInterval = window.setInterval(() => changeBy(delta), 80);
        }, 350);
      });

      ['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture'].forEach((eventName) =>
        addListener(button, eventName, stop)
      );

      addListener(button, 'click', (event) => {
        if (skipNextClick) {
          event.preventDefault();
          skipNextClick = false;
          return;
        }
        changeBy(delta);
      });

      addListener(button, 'keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          skipNextClick = true;
          event.preventDefault();
          changeBy(delta);
        }
      });

      cleanup.push(() => clearTimers());
    };

    setupHold(upBtn, step);
    setupHold(downBtn, -step);

    // Прокрутка колёсиком (вниз = уменьшаем)
    addListener(
      element,
      'wheel',
      (event) => {
        event.preventDefault();
        const d = Math.sign(event.deltaY || event.detail || 0);
        if (!d) return;
        changeBy(d > 0 ? -step : step);
      },
      { passive: false }
    );

    // Клавиатура
    const commitManualValue = () => {
      const digits = valueEl.value.replace(/\D+/g, '');
      valueEl.value = digits;
      if (!digits) {
        valueEl.value = String(currentValue);
        return;
      }
      const parsed = parseInt(digits, 10);
      if (Number.isNaN(parsed)) {
        valueEl.value = String(currentValue);
        return;
      }
      applyValue(parsed, { force: true });
    };

    addListener(valueEl, 'input', () => {
      const digits = valueEl.value.replace(/\D+/g, '');
      if (digits !== valueEl.value) {
        valueEl.value = digits;
      }
    });

    addListener(valueEl, 'change', commitManualValue);
    addListener(valueEl, 'blur', commitManualValue);

    addListener(valueEl, 'keydown', (event) => {
      let delta = 0; // <-- объявляем локально

      switch (event.key) {
        case 'ArrowUp':
          delta = step;
          break;
        case 'ArrowDown':
          delta = -step;
          break;
        case 'PageUp':
          delta = step * 5;
          break;
        case 'PageDown':
          delta = -step * 5;
          break;
        case 'Home':
          applyValue(min);
          event.preventDefault();
          return;
        case 'End':
          applyValue(max);
          event.preventDefault();
          return;
        case 'Enter':
          event.preventDefault();
          commitManualValue();
          valueEl.select();
          return;
        default:
          return; // другие клавиши игнорируем
      }

      event.preventDefault();
      changeBy(delta);
    });

    // Стартовое значение
    applyValue(currentValue, { force: true, emit: true });

    return () => {
      cleanup.forEach((fn) => fn());
    };
  };

  const destroyers = [];
  document.querySelectorAll('.wheel').forEach((element) => {
    const destroy = initPicker(element);
    if (destroy) destroyers.push(destroy);
  });

  return () => {
    destroyers.forEach((fn) => fn());
  };
}

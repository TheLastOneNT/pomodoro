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
    element.tabIndex = 0;

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'wheel-btn wheel-btn--up';
    upBtn.setAttribute('aria-label', `Увеличить ${label.toLowerCase()}`);
    upBtn.innerHTML = '<span aria-hidden="true">▲</span>';

    const valueEl = document.createElement('div');
    valueEl.className = 'wheel-value';

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'wheel-btn wheel-btn--down';
    downBtn.setAttribute('aria-label', `Уменьшить ${label.toLowerCase()}`);
    downBtn.innerHTML = '<span aria-hidden="true">▼</span>';

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
      valueEl.textContent = String(currentValue);
      if (emit) updateInput(key, currentValue);
    };

    const changeBy = (delta) => {
      if (delta === 0) return;
      applyValue(currentValue + delta);
    };
    addListener(upBtn, 'click', () => changeBy(step));
    addListener(downBtn, 'click', () => changeBy(-step));
    addListener(
      element,
      'wheel',
      (event) => {
        event.preventDefault();
        const direction = Math.sign(event.deltaY || event.detail || 0);
        if (direction === 0) return;
        changeBy(direction > 0 ? -step : step);
      },
      { passive: false }
    );
    addListener(element, 'keydown', (event) => {
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
        default:
          return;
      }

      event.preventDefault();
      changeBy(delta);
    });
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

// src/js/wheels.js — iOS-like 3D picker
// Без изменения HTML: .wheel[data-key][data-min][data-max][data-value]
// «Мост» со скрытыми инпутами остаётся совместимым (bFocus/bBreak/bCycles).

export function initWheels() {
  const ROW_H = 36; // высота строки
  const RADIUS = 48; // «радиус» цилиндра для 3D
  const PAD = 3; // пустые строки сверху/снизу
  const SNAP_DELAY = 80; // debounce фиксации
  const MAX_TILT = 22; // макс. угол поворота строки (в градусах)

  const bridge = {
    focus: document.getElementById('bFocus'),
    break: document.getElementById('bBreak'),
    cycles: document.getElementById('bCycles'),
  };

  const makeList = (min, max) => {
    const ul = document.createElement('ul');
    // верхние пустые
    for (let i = 0; i < PAD; i++) ul.appendChild(document.createElement('li')).textContent = '';
    // значения
    for (let v = min; v <= max; v++) {
      const li = document.createElement('li');
      li.textContent = v;
      li.dataset.val = v;
      ul.appendChild(li);
    }
    // нижние пустые
    for (let i = 0; i < PAD; i++) ul.appendChild(document.createElement('li')).textContent = '';
    return ul;
  };

  const scrollToVal = (el, min, val, smooth = true) => {
    const top = ROW_H * PAD + (val - min) * ROW_H;
    el.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  };

  const nearestVal = (el, min, max) => {
    const idx = Math.round((el.scrollTop - ROW_H * PAD) / ROW_H);
    return Math.max(min, Math.min(max, min + idx));
  };

  const updateBridge = (key, val) => {
    const input = bridge[key];
    if (!input) return;
    input.value = String(val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const markActive = (el, min, max) => {
    const val = nearestVal(el, min, max);
    const items = el.querySelectorAll('li');
    items.forEach((li) => li.classList.remove('is-active'));
    const idx = val - min + PAD;
    if (items[idx]) items[idx].classList.add('is-active');
  };

  // 3D-обновление: поворот и прозрачность относительно центра
  const update3D = (el) => {
    const rect = el.getBoundingClientRect();
    const centerY = rect.height / 2; // центр окна
    const top = el.scrollTop;

    el.querySelectorAll('li').forEach((li) => {
      const y = li.offsetTop - top + ROW_H / 2; // центр строки в контейнере
      const dy = (y - centerY) / ROW_H; // расстояние в «строках»
      const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, -dy * (MAX_TILT / 1.2)));
      const depth = RADIUS;

      // Чем дальше от центра — тем бледнее
      const k = Math.min(1, Math.abs(dy) / 4);
      li.style.opacity = String(1 - k * 0.45);

      // Поворот по X вокруг виртуального цилиндра
      li.style.transform = `rotateX(${tilt}deg) translateZ(${depth}px)`;
    });
  };

  const snapAndNotify = (el, min, max, key) => {
    const val = nearestVal(el, min, max);
    scrollToVal(el, min, val);
    updateBridge(key, val);
    markActive(el, min, max);
  };

  document.querySelectorAll('.wheel').forEach((wheelEl) => {
    // доступность с клавиатуры
    wheelEl.setAttribute('tabindex', '0');
    wheelEl.setAttribute('role', 'listbox');

    const min = parseInt(wheelEl.dataset.min || '1', 10);
    const max = parseInt(wheelEl.dataset.max || '10', 10);
    const value = Math.min(max, Math.max(min, parseInt(wheelEl.dataset.value || String(min), 10)));
    const key = wheelEl.dataset.key;

    const ul = makeList(min, max);
    wheelEl.innerHTML = '';
    wheelEl.appendChild(ul);

    // начальная позиция
    scrollToVal(wheelEl, min, value, false);
    updateBridge(key, value);
    markActive(wheelEl, min, max);
    update3D(wheelEl);

    // прокрутка + фиксация
    let t;
    const onScroll = () => {
      update3D(wheelEl);
      clearTimeout(t);
      t = setTimeout(() => snapAndNotify(wheelEl, min, max, key), SNAP_DELAY);
    };
    wheelEl.addEventListener('scroll', onScroll, { passive: true });

    // клик по значению
    wheelEl.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-val]');
      if (!li) return;
      const val = parseInt(li.dataset.val, 10);
      scrollToVal(wheelEl, min, val);
      updateBridge(key, val);
      markActive(wheelEl, min, max);
      update3D(wheelEl);
    });

    // колесо мыши не пропускаем наружу
    wheelEl.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

    // плавная фиксация после касания/мыши
    const endEvents = ['pointerup', 'touchend'];
    endEvents.forEach((ev) =>
      wheelEl.addEventListener(
        ev,
        () => {
          snapAndNotify(wheelEl, min, max, key);
          update3D(wheelEl);
        },
        { passive: true }
      )
    );

    // клавиатура: ↑/↓/PgUp/PgDn/Home/End
    wheelEl.addEventListener('keydown', (e) => {
      let delta = 0;
      if (e.key === 'ArrowUp') delta = -1;
      else if (e.key === 'ArrowDown') delta = 1;
      else if (e.key === 'PageUp') delta = -5;
      else if (e.key === 'PageDown') delta = 5;
      else if (e.key === 'Home') {
        scrollToVal(wheelEl, min, min);
        updateBridge(key, min);
        markActive(wheelEl, min, max);
        update3D(wheelEl);
        e.preventDefault();
        return;
      } else if (e.key === 'End') {
        scrollToVal(wheelEl, min, max);
        updateBridge(key, max);
        markActive(wheelEl, min, max);
        update3D(wheelEl);
        e.preventDefault();
        return;
      } else return;

      const curr = nearestVal(wheelEl, min, max);
      const next = Math.max(min, Math.min(max, curr + delta));
      scrollToVal(wheelEl, min, next);
      updateBridge(key, next);
      markActive(wheelEl, min, max);
      update3D(wheelEl);
      e.preventDefault();
    });
  });
}

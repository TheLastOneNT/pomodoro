// iOS-like wheel без нативного скролла: drag/touch + снап + лёгкая инерция
export function initWheels() {
  const ROW_H = 40; // синхронизирован с CSS
  const VISIBLE = 5; // количество видимых строк (нечётное)
  const HALF = (VISIBLE - 1) / 2;

  const bridge = {
    focus: document.getElementById('bFocus'),
    break: document.getElementById('bBreak'),
    cycles: document.getElementById('bCycles'),
  };
  const setVal = (key, v) => {
    const el = bridge[key];
    if (!el) return;
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // Utils
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sign = (n) => (n < 0 ? -1 : 1);

  // Рендер видимого окна вокруг current
  const render = (wrap, min, max, current) => {
    const vp = wrap.querySelector('.wheel-viewport');
    vp.innerHTML = '';
    for (let i = -HALF; i <= HALF; i++) {
      const val = clamp(current + i, min, max);
      const div = document.createElement('div');
      div.className = 'wheel-item' + (i === 0 ? ' is-active' : '');
      div.dataset.val = String(val);
      div.textContent = val;
      vp.appendChild(div);
    }
  };

  // Анимация к целевому значению
  const animateTo = (state, target, cb) => {
    state.anim && cancelAnimationFrame(state.anim);
    const start = state.value;
    const dist = target - start;
    const dur = Math.min(300, Math.abs(dist) * 110); // 110ms на шаг
    const t0 = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = easeOut(p);
      const v = Math.round(start + dist * eased);
      if (v !== state.value) {
        state.value = v;
        render(state.wrap, state.min, state.max, state.value);
        cb(v);
      }
      if (p < 1) state.anim = requestAnimationFrame(tick);
      else state.anim = null;
    };
    state.anim = requestAnimationFrame(tick);
  };

  // Инициализация каждой .wheel
  document.querySelectorAll('.wheel').forEach((wrap) => {
    const min = parseInt(wrap.dataset.min || '1', 10);
    const max = parseInt(wrap.dataset.max || '10', 10);
    const key = wrap.dataset.key;
    const startVal = clamp(parseInt(wrap.dataset.value || String(min), 10), min, max);

    // DOM внутри колонки
    wrap.innerHTML = '<div class="wheel-viewport" aria-hidden="true"></div>';
    const state = {
      wrap,
      min,
      max,
      key,
      value: startVal,
      anim: null,
      drag: null,
      vel: 0,
    };
    render(wrap, min, max, state.value);
    setVal(key, state.value);

    // Click по строке
    wrap.addEventListener('click', (e) => {
      const it = e.target.closest('.wheel-item');
      if (!it) return;
      const v = parseInt(it.dataset.val, 10);
      if (v === state.value) return;
      animateTo(state, v, (nv) => setVal(key, nv));
    });

    // Клавиатура
    wrap.tabIndex = 0;
    wrap.addEventListener('keydown', (e) => {
      let d = 0;
      if (e.key === 'ArrowUp') d = -1;
      else if (e.key === 'ArrowDown') d = 1;
      else if (e.key === 'PageUp') d = -5;
      else if (e.key === 'PageDown') d = 5;
      else if (e.key === 'Home') return animateTo(state, min, (nv) => setVal(key, nv));
      else if (e.key === 'End') return animateTo(state, max, (nv) => setVal(key, nv));
      else return;
      const next = clamp(state.value + d, min, max);
      animateTo(state, next, (nv) => setVal(key, nv));
      e.preventDefault();
    });

    // Drag/Touch
    const onDown = (y0) => {
      state.drag = {
        lastY: y0,
        acc: 0,
        samples: [], // {dy, dt}
      };
      wrap.classList.add('grabbing');
    };
    const onMove = (y) => {
      if (!state.drag) return;
      const dy = y - state.drag.lastY;
      state.drag.lastY = y;
      state.drag.acc += dy;

      const now = performance.now();
      state.drag.samples.push({ dy, t: now });
      if (state.drag.samples.length > 8) state.drag.samples.shift();

      // каждые ROW_H «щёлкаем» значение
      while (Math.abs(state.drag.acc) >= ROW_H) {
        const step = -sign(state.drag.acc);
        state.drag.acc -= step * ROW_H;
        state.value = clamp(state.value + step, min, max);
        render(wrap, min, max, state.value);
        setVal(key, state.value);
      }
    };
    const onUp = () => {
      if (!state.drag) return;
      wrap.classList.remove('grabbing');

      // инерция: берём скорость последних 100–160 мс
      const samples = state.drag.samples;
      const endT = samples.length ? samples[samples.length - 1].t : performance.now();
      let dySum = 0,
        dtSum = 0;
      for (let i = samples.length - 1; i >= 0; i--) {
        dySum += samples[i].dy;
        dtSum = endT - samples[i].t;
        if (dtSum > 160) break;
      }
      const vpx = dtSum > 0 ? dySum / dtSum : 0; // px/ms
      const steps = clamp(Math.round(-vpx * 14), -5, 5); // коэффициент инерции
      const target = clamp(state.value + steps, min, max);

      // докручиваем к ближайшему числу + инерция
      animateTo(state, target, (nv) => setVal(key, nv));
      state.drag = null;
    };

    // Pointer events
    wrap.addEventListener('pointerdown', (e) => {
      wrap.setPointerCapture(e.pointerId);
      onDown(e.clientY);
    });
    wrap.addEventListener('pointermove', (e) => onMove(e.clientY));
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);

    // Touch fallback (iOS Safari старый)
    wrap.addEventListener('touchstart', (e) => onDown(e.changedTouches[0].clientY), {
      passive: true,
    });
    wrap.addEventListener('touchmove', (e) => onMove(e.changedTouches[0].clientY), {
      passive: true,
    });
    wrap.addEventListener('touchend', onUp, { passive: true });
  });
}

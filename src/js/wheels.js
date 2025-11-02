// iOS-подобные колёса с плавной прокруткой и инерцией
export function initWheels() {
  const ROW_HEIGHT = 40;
  const MOBILE_ROW_HEIGHT = 36;

  // Определяем высоту строки в зависимости от размера экрана
  const getRowHeight = () => (window.innerWidth <= 480 ? MOBILE_ROW_HEIGHT : ROW_HEIGHT);

  // Мост к скрытым input-полям
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

  // Утилиты
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // Создание списка значений
  const createList = (min, max) => {
    const ul = document.createElement('ul');
    for (let i = min; i <= max; i++) {
      const li = document.createElement('li');
      li.dataset.value = i;
      li.textContent = i;
      ul.appendChild(li);
    }
    return ul;
  };

  // Получение ближайшего значения к центру
  const getClosestValue = (wheel, min, max) => {
    const rowHeight = getRowHeight();
    const scrollTop = wheel.scrollTop;
    const index = Math.round(scrollTop / rowHeight);
    return clamp(min + index, min, max);
  };

  // Плавная прокрутка к значению
  const scrollToValue = (wheel, min, value, smooth = true) => {
    const rowHeight = getRowHeight();
    const targetScroll = (value - min) * rowHeight;
    wheel.scrollTo({
      top: targetScroll,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Обновление активного класса
  const updateActiveItem = (wheel, min, currentValue) => {
    const items = wheel.querySelectorAll('li');
    items.forEach((item, index) => {
      if (index === currentValue - min) {
        item.classList.add('is-active');
      } else {
        item.classList.remove('is-active');
      }
    });
  };

  // Инициализация одного колеса
  const initWheel = (wheelElement) => {
    const min = parseInt(wheelElement.dataset.min || '1', 10);
    const max = parseInt(wheelElement.dataset.max || '10', 10);
    const initialValue = clamp(parseInt(wheelElement.dataset.value || String(min), 10), min, max);
    const key = wheelElement.dataset.key;

    // Очищаем и создаём список
    wheelElement.innerHTML = '';
    const list = createList(min, max);
    wheelElement.appendChild(list);

    // Состояние
    let currentValue = initialValue;
    let scrollTimeout = null;
    let isScrolling = false;

    // Устанавливаем начальное положение
    scrollToValue(wheelElement, min, currentValue, false);
    updateActiveItem(wheelElement, min, currentValue);
    updateInput(key, currentValue);

    // Обработчик прокрутки с debounce
    const handleScroll = () => {
      isScrolling = true;

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        const newValue = getClosestValue(wheelElement, min, max);

        if (newValue !== currentValue) {
          currentValue = newValue;
          updateInput(key, currentValue);
          updateActiveItem(wheelElement, min, currentValue);
        }

        // Snap к ближайшему значению
        scrollToValue(wheelElement, min, currentValue, true);
        isScrolling = false;
      }, 50);
    };

    // Слушатель прокрутки
    wheelElement.addEventListener('scroll', handleScroll, { passive: true });

    // Клик по элементу списка
    wheelElement.addEventListener('click', (e) => {
      const item = e.target.closest('li[data-value]');
      if (!item || isScrolling) return;

      const clickedValue = parseInt(item.dataset.value, 10);
      if (clickedValue === currentValue) return;

      currentValue = clickedValue;
      scrollToValue(wheelElement, min, currentValue, true);
      updateActiveItem(wheelElement, min, currentValue);
      updateInput(key, currentValue);
    });

    // Клавиатурная навигация
    wheelElement.tabIndex = 0;
    wheelElement.addEventListener('keydown', (e) => {
      let delta = 0;

      switch (e.key) {
        case 'ArrowUp':
          delta = -1;
          break;
        case 'ArrowDown':
          delta = 1;
          break;
        case 'PageUp':
          delta = -5;
          break;
        case 'PageDown':
          delta = 5;
          break;
        case 'Home':
          delta = min - currentValue;
          break;
        case 'End':
          delta = max - currentValue;
          break;
        default:
          return;
      }

      e.preventDefault();
      const newValue = clamp(currentValue + delta, min, max);

      if (newValue !== currentValue) {
        currentValue = newValue;
        scrollToValue(wheelElement, min, currentValue, true);
        updateActiveItem(wheelElement, min, currentValue);
        updateInput(key, currentValue);
      }
    });

    // Обновление при изменении размера окна
    const handleResize = () => {
      scrollToValue(wheelElement, min, currentValue, false);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  };

  // Инициализация всех колёс
  const cleanup = [];
  document.querySelectorAll('.wheel').forEach((wheel) => {
    const cleanupFn = initWheel(wheel);
    cleanup.push(cleanupFn);
  });

  // Возвращаем функцию очистки
  return () => {
    cleanup.forEach((fn) => fn());
  };
}

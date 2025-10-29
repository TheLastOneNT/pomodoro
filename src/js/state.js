export const state = {
  phase: "idle", // 'idle' | 'focus' | 'break'
  running: false,
  durations: {
    // секунды
    focusSec: 25 * 60,
    breakSec: 5 * 60,
  },
  remaining: 25 * 60,

  // поведение
  auto: true,
  sound: true,
  theme: "night", // 'night' | 'day'

  // циклы (опционально): считаем ЦИКЛОМ завершение фокуса
  cyclesTarget: null, // number | null
  cyclesDone: 0,

  // внутреннее
  intervalId: null,
};

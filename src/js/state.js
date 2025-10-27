export const state = {
  phase: "idle", // 'idle' | 'focus' | 'break'
  running: false,
  durations: { focusSec: 25 * 60, breakSec: 5 * 60 },
  remaining: 25 * 60,
  auto: true,
  sound: true,
  theme: "night", // НОЧЬ по умолчанию
  intervalId: null,
};

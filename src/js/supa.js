// src/js/supa.js — безопасная инициализация без top-level await, с оффлайн-заглушкой.
// Добавлено: supabase.rpc в заглушке, флаги isReady/isReal, whenReady(fn),
// события 'supabase:ready' и 'supabase:error'.

const URL = import.meta?.env?.VITE_SUPABASE_URL;
const KEY = import.meta?.env?.VITE_SUPABASE_ANON_KEY;

// Флаг доступности по env (не зависит от загрузки SDK)
export let SUPA_ENABLED_FLAG = Boolean(URL && KEY);

// Служебные флаги состояния клиента
let _isReady = false; // true когда настоящий SDK подхвачен
let _isReal = false; // true если supabase указывает на реальный клиент (не заглушку)
const _readyWaiters = [];

// Публичные геттеры
export const supabaseState = {
  get isReady() {
    return _isReady;
  },
  get isReal() {
    return _isReal;
  },
};

// Позволяет подписаться на момент, когда реальный клиент станет доступен
export function whenReady(fn) {
  if (typeof fn !== 'function') return;
  if (_isReady) {
    try {
      fn();
    } catch {}
    return;
  }
  _readyWaiters.push(fn);
}

// ---- заглушка с совместимым интерфейсом ----
function makeStub() {
  const noop = async () => ({ data: null, error: null });
  const subscription = { unsubscribe: () => {} };

  // цепочки для from() с no-op методами
  function makeChain() {
    const self = {
      select: noop,
      insert: noop,
      update: noop,
      delete: noop,
      upsert: noop,
      eq: () => self,
      order: () => self,
      limit: () => self,
      single: () => self, // на всякий случай
    };
    return self;
  }

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: (_cb) => ({ data: { subscription } }),
      signInWithOAuth: async () => ({ data: null, error: new Error('Supabase disabled') }),
      signInWithPassword: async () => ({ data: null, error: new Error('Supabase disabled') }),
      signUp: async () => ({ data: null, error: new Error('Supabase disabled') }),
      signOut: async () => ({ error: null }),
    },
    from() {
      return makeChain();
    },
    rpc: async () => ({ data: null, error: new Error('Supabase disabled') }),
    storage: { from: () => ({ download: noop, upload: noop, remove: noop }) },
    functions: { invoke: noop },
  };
}

// Экспортируем «живой» объект, который позже заменим методами реального клиента
export const supabase = makeStub();
// Совместимый алиас
export const supa = supabase;

// ---- если есть ключи — асинхронно подгружаем SDK и «повышаем» заглушку ----
if (SUPA_ENABLED_FLAG) {
  // защита от двойной загрузки
  if (!window.__SUPA_LOADING__) {
    window.__SUPA_LOADING__ = true;

    import('https://esm.sh/@supabase/supabase-js@2')
      .then(({ createClient }) => {
        const real = createClient(URL, KEY, {
          auth: { persistSession: true, autoRefreshToken: true },
        });

        // «повышаем» заглушку: подменяем её поля на настоящие
        supabase.auth = real.auth;
        supabase.from = (...args) => real.from(...args);
        supabase.rpc = (...args) => real.rpc(...args);
        supabase.storage = real.storage;
        supabase.functions = real.functions;

        _isReal = true;
        _isReady = true;

        console.log('[supabase] Enabled');
        document.dispatchEvent(new CustomEvent('supabase:ready'));

        // разбудим отложенных подписчиков
        for (const fn of _readyWaiters.splice(0)) {
          try {
            fn();
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('[supabase] SDK load failed, fallback to stub:', err);
        SUPA_ENABLED_FLAG = false;
        _isReal = false;
        _isReady = true; // готовность есть, но это заглушка
        document.dispatchEvent(new CustomEvent('supabase:error', { detail: err }));
        for (const fn of _readyWaiters.splice(0)) {
          try {
            fn();
          } catch {}
        }
      });
  }
} else {
  console.warn(
    '[supabase] Supabase disabled: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not set. Offline mode.'
  );
  _isReal = false;
  _isReady = true; // сразу готовы к оффлайн-работе
  // коллбеки всё равно выполним, чтобы код не зависал
  queueMicrotask(() => {
    for (const fn of _readyWaiters.splice(0)) {
      try {
        fn();
      } catch {}
    }
  });
}

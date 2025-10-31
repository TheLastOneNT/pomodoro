// src/js/supa.js — безопасная инициализация без top-level await (совместимо с esbuild target)
// Работает даже без .env: экспортируется заглушка, UI не ломается.
// При наличии VITE_SUPABASE_URL/KEY загружаем SDK асинхронно и «повышаем» заглушку до реального клиента.

const URL = import.meta?.env?.VITE_SUPABASE_URL;
const KEY = import.meta?.env?.VITE_SUPABASE_ANON_KEY;

// Флаг доступности по env (не зависит от загрузки SDK)
export let SUPA_ENABLED_FLAG = Boolean(URL && KEY);

// ---- заглушка с совместимым интерфейсом ----
function makeStub() {
  const noop = async () => ({ data: null, error: null });
  const subscription = { unsubscribe: () => {} };

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
      // строим чейны методов и возвращаем себя же
      const self = {
        select: noop,
        insert: noop,
        update: noop,
        delete: noop,
        upsert: noop,
        eq: () => self,
        order: () => self,
        limit: () => self,
      };
      return self;
    },
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
  // без top-level await
  import('https://esm.sh/@supabase/supabase-js@2')
    .then(({ createClient }) => {
      const real = createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      });

      // «повышаем» заглушку: подменяем её поля на настоящие
      supabase.auth = real.auth;
      supabase.from = (...args) => real.from(...args);
      supabase.storage = real.storage;
      supabase.functions = real.functions;

      console.log('[supabase] Enabled');
      // для желающих можно кинуть событие готовности
      document.dispatchEvent(new CustomEvent('supabase:ready'));
    })
    .catch((err) => {
      console.warn('[supabase] SDK load failed, fallback to stub:', err);
      SUPA_ENABLED_FLAG = false;
    });
} else {
  console.warn(
    '[supabase] Supabase disabled: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not set. Offline mode.'
  );
}

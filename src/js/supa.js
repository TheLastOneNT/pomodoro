// src/js/supa.js — инициализация Supabase через Vite env
// Экспортирует И supabase, И supa (алиас) — для обратной совместимости.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn('[supabase] Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Проверь .env');
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Алиас для старого кода
export { supabase as supa };

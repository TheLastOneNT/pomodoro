// src/js/auth.js — авторизация с безопасными гардом под оффлайн (без Supabase)
import { supabase, SUPA_ENABLED_FLAG } from './supa.js';

const state = { user: null };
export const getUser = () => state.user;
export const isLoggedIn = () => !!state.user;

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg) {
  const el = $('authStatus');
  if (el) el.textContent = msg || '';
  console.log('[auth]', msg);
}

function setUIEnabled(enabled) {
  const form = $('authForm');
  const emailEl = $('authEmail');
  const passEl = $('authPass');
  const modeEl = $('authMode');
  const googleBtn = $('loginGoogle');
  const logoutBtn = $('logoutBtn');

  [form, emailEl, passEl, modeEl, googleBtn, logoutBtn].forEach((el) => {
    if (el && 'disabled' in el) el.disabled = !enabled;
  });

  // Если выключено — показываем причину в плейсхолдерах
  if (!enabled) {
    if (emailEl) emailEl.placeholder = 'Не доступно (оффлайн)';
    if (passEl) passEl.placeholder = 'Не доступно (оффлайн)';
  }
}

export function toggleAuth(show) {
  const modal = $('authModal');
  if (!modal) return;
  modal.classList.toggle('show', !!show);
  if (show) $('authEmail')?.focus();
}

function updateUI() {
  const email = state.user?.email || state.user?.user_metadata?.email;
  const btn = $('openAuth');

  if (email) {
    setStatus('В системе: ' + email);
    if (btn) btn.textContent = '👤';
  } else {
    setStatus(SUPA_ENABLED_FLAG ? 'Не вошли' : 'Оффлайн: вход недоступен');
    if (btn) btn.textContent = '🔐';
  }
  document.dispatchEvent(new CustomEvent('auth:change', { detail: state.user }));
}

export async function initAuth() {
  // 1) Если Supabase выключен — интерфейс живёт, но вход/регистрация отключены
  if (!SUPA_ENABLED_FLAG) {
    console.warn(
      '[auth] Supabase выключен (нет VITE_SUPABASE_URL/ANON_KEY). UI работает в оффлайн-режиме.'
    );
    setStatus('Оффлайн-режим: авторизация недоступна');
    setUIEnabled(false);

    // базовые клики: открытие/закрытие модалки пусть работают (для UX)
    $('openAuth')?.addEventListener('click', () => toggleAuth(true));
    $('authClose')?.addEventListener('click', () => toggleAuth(false));
    $('logoutBtn')?.addEventListener('click', () => alert('В оффлайн-режиме выхода не требуется'));
    return;
  }

  // 2) Нормальная ветка с Supabase
  setUIEnabled(true);
  setStatus('Проверяю сессию…');

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) console.warn('getUser error:', error);
    state.user = data?.user ?? null;
    updateUI();
  } catch (err) {
    console.error('[auth] getUser failed:', err);
    setStatus('Ошибка инициализации авторизации');
  }

  // слушатель изменений сессии
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[auth] onAuthStateChange:', event, session);
      state.user = session?.user ?? null;
      updateUI();
      if (state.user) toggleAuth(false);
    });
  } catch (err) {
    console.error('[auth] onAuthStateChange failed:', err);
  }

  // элементы
  const openBtn = $('openAuth');
  const closeBtn = $('authClose');
  const logoutBtn = $('logoutBtn');
  const form = $('authForm');
  const emailEl = $('authEmail');
  const passEl = $('authPass');
  const modeEl = $('authMode');
  const googleBtn = $('loginGoogle');

  openBtn?.addEventListener('click', () => toggleAuth(true));
  closeBtn?.addEventListener('click', () => toggleAuth(false));

  logoutBtn?.addEventListener('click', async () => {
    setStatus('Выход…');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert(error.message);
        setStatus('Ошибка выхода');
      } else {
        setStatus('Вышли из аккаунта');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Sign out error');
      setStatus('Ошибка выхода');
    }
  });

  // Email/Пароль
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (emailEl?.value || '').trim();
    const password = passEl?.value || '';

    try {
      if (modeEl?.value === 'signup') {
        setStatus('Регистрирую…');
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus('Регистрация прошла. Проверь почту (подтверждение).');
      } else {
        setStatus('Вход…');
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setStatus('Готово!');
        toggleAuth(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Auth error');
      setStatus('Ошибка: ' + (err.message || ''));
    }
  });

  // Google OAuth
  googleBtn?.addEventListener('click', async () => {
    try {
      setStatus('Редирект в Google…');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      // Дальше произойдёт редирект, после возврата сработает onAuthStateChange
    } catch (err) {
      console.error(err);
      alert(err.message || 'Google OAuth error');
      setStatus('Ошибка Google OAuth');
    }
  });
}

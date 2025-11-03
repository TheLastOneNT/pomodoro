// auth.js — авторизация (Supabase, при его наличии) + оффлайн фолбэк.
// Экспорты: initAuth, getUser, isLoggedIn, toggleAuth

import { supabase, SUPA_ENABLED_FLAG } from './supa.js';

const STATE = { user: null };
export const getUser = () => STATE.user;
export const isLoggedIn = () => Boolean(STATE.user);

const ONCE_FLAG = '__auth_bound_once__';

const dom = {
  modal: document.getElementById('authModal'),
  openButton: document.getElementById('sbAuthAction') || document.getElementById('openAuth'),
  closeButton: document.getElementById('authClose'),
  logoutButton: document.getElementById('logoutBtn'),
  form: document.getElementById('authForm'),
  email: document.getElementById('authEmail'),
  password: document.getElementById('authPass'),
  mode: document.getElementById('authMode'),
  google: document.getElementById('loginGoogle'),
};

export function toggleAuth(show) {
  if (!dom.modal) return;
  dom.modal.classList.toggle('show', !!show);
  if (show) dom.email?.focus();
}

function updateTriggerIcon() {
  if (!dom.openButton) return;
  const logged = Boolean(STATE.user);
  dom.openButton.textContent = logged ? '👤 Вы в системе' : '🔐 Войти в систему';
  dom.openButton.setAttribute('aria-label', logged ? 'Аккаунт' : 'Войти');
}

function updateUI() {
  updateTriggerIcon();
  document.dispatchEvent(new CustomEvent('auth:change', { detail: STATE.user }));
}

function bindCommon() {
  if (window[ONCE_FLAG]) return;
  window[ONCE_FLAG] = true;
  dom.openButton?.addEventListener('click', () => toggleAuth(true));
  dom.closeButton?.addEventListener('click', () => toggleAuth(false));
}

function disableAuthControls(disabled) {
  [dom.form, dom.email, dom.password, dom.mode, dom.google].forEach((el) => {
    if (!el) return;
    if ('disabled' in el) el.disabled = disabled;
  });
  if (disabled) {
    if (dom.email) dom.email.placeholder = 'Не доступно (оффлайн)';
    if (dom.password) dom.password.placeholder = 'Не доступно (оффлайн)';
  }
}

async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    alert('Вы вышли из аккаунта');
  } catch (err) {
    console.error(err);
    alert(err?.message || 'Sign out error');
  }
}

function bindOnline() {
  bindCommon();

  dom.logoutButton?.addEventListener('click', handleLogout);

  dom.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (dom.email?.value || '').trim();
    const password = dom.password?.value || '';

    try {
      if (dom.mode?.value === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Регистрация завершена. Проверьте почту.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toggleAuth(false);
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Auth error');
    }
  });

  dom.google?.addEventListener('click', async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Google OAuth error');
    }
  });
}

function bindOffline() {
  bindCommon();
  dom.logoutButton?.addEventListener('click', () => alert('В оффлайн-режиме выход не требуется'));
}

export async function initAuth() {
  if (!SUPA_ENABLED_FLAG) {
    console.warn('[auth] Supabase отключён. Работаем оффлайн.');
    disableAuthControls(true);
    bindOffline();
    updateUI();
    return;
  }

  disableAuthControls(false);
  bindOnline();

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) console.warn('getUser error:', error);
    STATE.user = data?.user ?? null;
    updateUI();
  } catch (err) {
    console.error('[auth] init failed:', err);
  }

  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      STATE.user = session?.user ?? null;
      updateUI();
      if (STATE.user) toggleAuth(false);
    });
  } catch (err) {
    console.error('[auth] onAuthStateChange failed:', err);
  }
}

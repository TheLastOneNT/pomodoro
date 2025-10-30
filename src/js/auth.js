// src/js/auth.js — с видимым статусом и логами
import { supabase } from "./supa.js";

const state = { user: null };
export const getUser = () => state.user;
export const isLoggedIn = () => !!state.user;

function setStatus(msg) {
  const el = document.getElementById("authStatus");
  if (el) el.textContent = msg || "";
  console.log("[auth]", msg);
}

export async function initAuth() {
  setStatus("Проверяю сессию…");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) console.warn("getUser error:", error);
  state.user = user ?? null;
  updateUI();

  // слушатель изменений сессии
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[auth] onAuthStateChange:", event, session);
    state.user = session?.user ?? null;
    updateUI();
    // Если получили сессию после редиректа Google — прячем модалку
    if (state.user) toggleAuth(false);
  });

  // элементы
  const openBtn = document.getElementById("openAuth");
  const closeBtn = document.getElementById("authClose");
  const logoutBtn = document.getElementById("logoutBtn");
  const form = document.getElementById("authForm");
  const emailEl = document.getElementById("authEmail");
  const passEl = document.getElementById("authPass");
  const modeEl = document.getElementById("authMode");
  const googleBtn = document.getElementById("loginGoogle");

  openBtn?.addEventListener("click", () => toggleAuth(true));
  closeBtn?.addEventListener("click", () => toggleAuth(false));

  logoutBtn?.addEventListener("click", async () => {
    setStatus("Выход…");
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
      setStatus("Ошибка выхода");
    } else {
      setStatus("Вышли из аккаунта");
    }
  });

  // Email/Пароль
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailEl.value.trim();
    const password = passEl.value;
    try {
      if (modeEl.value === "signup") {
        setStatus("Регистрирую…");
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus("Регистрация прошла. Проверь почту (подтверждение).");
      } else {
        setStatus("Вход…");
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setStatus("Готово!");
        toggleAuth(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Auth error");
      setStatus("Ошибка: " + (err.message || ""));
    }
  });

  // Google OAuth
  googleBtn?.addEventListener("click", async () => {
    try {
      setStatus("Редирект в Google…");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, // http(s)://host:port
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
      // дальше произойдёт редирект, логи увидишь в Network
    } catch (err) {
      console.error(err);
      alert(err.message || "Google OAuth error");
      setStatus("Ошибка Google OAuth");
    }
  });
}

export function toggleAuth(show) {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.classList.toggle("show", !!show);
  if (show) {
    const el = document.getElementById("authEmail");
    el?.focus();
  }
}

function updateUI() {
  const email = state.user?.email || state.user?.user_metadata?.email;
  if (email) {
    setStatus("В системе: " + email);
    // Можно ещё где-то в шапке показывать «👤 email» вместо «🔐»
    const btn = document.getElementById("openAuth");
    if (btn) btn.textContent = "👤";
  } else {
    setStatus("Не вошли");
    const btn = document.getElementById("openAuth");
    if (btn) btn.textContent = "🔐";
  }
  document.dispatchEvent(
    new CustomEvent("auth:change", { detail: state.user })
  );
}

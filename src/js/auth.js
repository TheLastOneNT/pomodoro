// src/js/auth.js — авторизация с безопасными гардом под оффлайн (без Supabase)
import { supabase, SUPA_ENABLED_FLAG } from "./supa.js";

const state = { user: null };
export const getUser = () => state.user;
export const isLoggedIn = () => Boolean(state.user);

const dom = {
  modal: document.getElementById("authModal"),
  openButton: document.getElementById("openAuth"),
  closeButton: document.getElementById("authClose"),
  logoutButton: document.getElementById("logoutBtn"),
  status: document.getElementById("authStatus"),
  form: document.getElementById("authForm"),
  email: document.getElementById("authEmail"),
  password: document.getElementById("authPass"),
  mode: document.getElementById("authMode"),
  google: document.getElementById("loginGoogle"),
};

function setStatus(message) {
  if (dom.status) dom.status.textContent = message ?? "";
  if (message) console.log("[auth]", message);
}

function setControlsDisabled(disabled) {
  [dom.form, dom.email, dom.password, dom.mode, dom.google].forEach((el) => {
    if (!el) return;
    if ("disabled" in el) el.disabled = disabled;
  });

  if (disabled) {
    if (dom.email) dom.email.placeholder = "Не доступно (оффлайн)";
    if (dom.password) dom.password.placeholder = "Не доступно (оффлайн)";
  }
}

export function toggleAuth(show) {
  if (!dom.modal) return;
  dom.modal.classList.toggle("show", Boolean(show));
  if (show) dom.email?.focus();
}

function updateTriggerIcon() {
  const email = state.user?.email || state.user?.user_metadata?.email;
  if (!dom.openButton) return;
  dom.openButton.textContent = email ? "👤" : "🔐";
}

function updateUI() {
  const email = state.user?.email || state.user?.user_metadata?.email;
  if (email) {
    setStatus(`В системе: ${email}`);
  } else {
    setStatus(SUPA_ENABLED_FLAG ? "Не вошли" : "Оффлайн: вход недоступен");
  }

  updateTriggerIcon();
  document.dispatchEvent(new CustomEvent("auth:change", { detail: state.user }));
}

function bindCommonButtons() {
  dom.openButton?.addEventListener("click", () => toggleAuth(true));
  dom.closeButton?.addEventListener("click", () => toggleAuth(false));
}

async function handleLogout() {
  setStatus("Выход…");
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
      setStatus("Ошибка выхода");
    } else {
      setStatus("Вышли из аккаунта");
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Sign out error");
    setStatus("Ошибка выхода");
  }
}

function bindOnlineHandlers() {
  bindCommonButtons();

  dom.logoutButton?.addEventListener("click", handleLogout);

  dom.form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = (dom.email?.value || "").trim();
    const password = dom.password?.value || "";

    try {
      if (dom.mode?.value === "signup") {
        setStatus("Регистрирую…");
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus("Регистрация прошла. Проверь почту (подтверждение).");
      } else {
        setStatus("Вход…");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatus("Готово!");
        toggleAuth(false);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Auth error");
      setStatus(`Ошибка: ${error.message || ""}`);
    }
  });

  dom.google?.addEventListener("click", async () => {
    try {
      setStatus("Редирект в Google…");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert(error.message || "Google OAuth error");
      setStatus("Ошибка Google OAuth");
    }
  });
}

function bindOfflineHandlers() {
  bindCommonButtons();
  dom.logoutButton?.addEventListener("click", () =>
    alert("В оффлайн-режиме выхода не требуется")
  );
}

export async function initAuth() {
  if (!SUPA_ENABLED_FLAG) {
    console.warn(
      "[auth] Supabase выключен (нет VITE_SUPABASE_URL/ANON_KEY). UI работает в оффлайн-режиме."
    );
    setStatus("Оффлайн-режим: авторизация недоступна");
    setControlsDisabled(true);
    bindOfflineHandlers();
    updateUI();
    return;
  }

  setControlsDisabled(false);
  bindOnlineHandlers();
  setStatus("Проверяю сессию…");

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) console.warn("getUser error:", error);
    state.user = data?.user ?? null;
    updateUI();
  } catch (error) {
    console.error("[auth] getUser failed:", error);
    setStatus("Ошибка инициализации авторизации");
  }

  try {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("[auth] onAuthStateChange:", event, session);
      state.user = session?.user ?? null;
      updateUI();
      if (state.user) toggleAuth(false);
    });
  } catch (error) {
    console.error("[auth] onAuthStateChange failed:", error);
  }
}

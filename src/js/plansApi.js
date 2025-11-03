// plansApi.js — планы: онлайн через Supabase, оффлайн через localStorage.
// Экспорты: fetchPlans, createPlan, updatePlan, deletePlan,
//           getDefaultPlanId, setDefaultPlan

import { supabase, SUPA_ENABLED_FLAG } from './supa.js';
import { isLoggedIn, getUser } from './auth.js';
import { makeStore } from './storage.js';

const LS_PLANS = makeStore('plans:all');
const LS_DEFAULT_PLAN = makeStore('plans:defaultId');

// ——— утилиты ———
function computeTotalMinutes({ focus, break: brk, cycles }) {
  const f = Number(focus) | 0;
  const b = Number(brk) | 0;
  const c = Number(cycles) | 0;
  if (f <= 0 || b <= 0 || c <= 0) return null;
  return c * (f + b);
}

function sanitizePlan(p) {
  // нормализуем и валидируем вход
  if (!p || typeof p !== 'object') throw new Error('Invalid plan');
  const name = String(p.name ?? '').trim() || 'План';
  const focus = Math.max(1, Number(p.focus) | 0);
  const brk = Math.max(1, Number(p.break ?? p.brk) | 0);
  const cycles = Math.max(1, Number(p.cycles) | 0);
  const total =
    p.total != null ? Number(p.total) | 0 : computeTotalMinutes({ focus, break: brk, cycles });

  return {
    id: p.id ?? null,
    name,
    focus,
    break: brk,
    cycles,
    total,
    type: p.type ?? 'custom',
  };
}

function sortPlans(arr) {
  // оффлайн сортируем по свежести добавления (как в .order("created_at", { descending: true }))
  return [...arr].sort((a, b) => {
    const ta = Number(a._ts ?? 0);
    const tb = Number(b._ts ?? 0);
    return tb - ta;
  });
}

// ——— оффлайн CRUD ———
function lsAll() {
  const raw = LS_PLANS.get([]);
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => sanitizePlan(x));
}
function lsWrite(list) {
  const normalized = list.map((p) => ({ ...sanitizePlan(p), _ts: p._ts ?? Date.now() }));
  LS_PLANS.set(normalized);
  return normalized;
}

// ——— публичный API ———
export async function fetchPlans() {
  if (!SUPA_ENABLED_FLAG || !isLoggedIn()) {
    return sortPlans(lsAll());
  }

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  // Санитизируем, сохраним total, чтобы UI всегда имел число
  return data.map((p) =>
    sanitizePlan({
      ...p,
      id: p.id,
      total: p.total ?? computeTotalMinutes({ focus: p.focus, break: p.break, cycles: p.cycles }),
    })
  );
}

export async function createPlan(payload) {
  const plan = sanitizePlan(payload);

  if (!SUPA_ENABLED_FLAG || !isLoggedIn()) {
    const list = lsAll();
    const item = {
      ...plan,
      id: crypto.randomUUID(),
      _ts: Date.now(),
    };
    const next = [item, ...list];
    lsWrite(next);
    return item;
  }

  const { id: user_id } = getUser();
  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id,
      name: plan.name,
      focus: plan.focus,
      break: plan.break,
      cycles: plan.cycles,
      total: plan.total,
    })
    .select()
    .single();

  if (error) throw error;
  return sanitizePlan(data);
}

export async function updatePlan(id, patch) {
  const partial = sanitizePlan({ id, ...patch });

  if (!SUPA_ENABLED_FLAG || !isLoggedIn()) {
    const list = lsAll();
    const idx = list.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return null;
    const updated = { ...list[idx], ...partial, _ts: Date.now() };
    const next = [...list];
    next[idx] = updated;
    lsWrite(next);
    return updated;
  }

  const { data, error } = await supabase
    .from('plans')
    .update({
      name: partial.name,
      focus: partial.focus,
      break: partial.break,
      cycles: partial.cycles,
      total: partial.total,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return sanitizePlan(data);
}

export async function deletePlan(id) {
  if (!SUPA_ENABLED_FLAG || !isLoggedIn()) {
    const next = lsAll().filter((p) => String(p.id) !== String(id));
    lsWrite(next);
    // если удалили дефолт — сбросим
    const currentDefault = LS_DEFAULT_PLAN.get(null);
    if (currentDefault && String(currentDefault) === String(id)) {
      LS_DEFAULT_PLAN.remove();
    }
    return;
  }
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) throw error;
}

// ——— дефолтный план ———
export async function getDefaultPlanId() {
  if (!SUPA_ENABLED_FLAG || !isLoggedIn()) {
    return LS_DEFAULT_PLAN.get(null);
  }
  const { data, error } = await supabase.from('user_prefs').select('default_plan_id').single();
  if (error && error.code !== 'PGRST116') throw error; // no rows
  return data?.default_plan_id ?? null;
}

export async function setDefaultPlan(planId) {
  if (!SUPA_ENABLED_FLAG || !isLoggedIn()) {
    if (planId == null) LS_DEFAULT_PLAN.remove();
    else LS_DEFAULT_PLAN.set(String(planId));
    return;
  }
  const { error } = await supabase.rpc('set_default_plan', { p_plan_id: planId });
  if (error) throw error;
}

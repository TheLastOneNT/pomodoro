// Единый API: если пользователь вошёл — используем Supabase,
// иначе — localStorage (фолбэк).
import { supabase } from "./supa.js";
import { isLoggedIn, getUser } from "./auth.js";

const KEY_PLANS = "pomodoro:plans:all";

function lsGet(def = []) {
  try {
    return JSON.parse(localStorage.getItem(KEY_PLANS)) ?? def;
  } catch {
    return def;
  }
}
function lsSet(v) {
  try {
    localStorage.setItem(KEY_PLANS, JSON.stringify(v));
  } catch {}
}

export async function fetchPlans() {
  if (!isLoggedIn()) return lsGet();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPlan({ name, focus, break: brk, cycles }) {
  if (!isLoggedIn()) {
    const arr = lsGet();
    const item = {
      id: crypto.randomUUID(),
      name,
      focus,
      break: brk,
      cycles,
      total: cycles * (focus + brk),
      type: "custom",
    };
    arr.unshift(item);
    lsSet(arr);
    return item;
  }
  const { id: user_id } = getUser();
  const { data, error } = await supabase
    .from("plans")
    .insert({ user_id, name, focus, break: brk, cycles })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlan(id, patch) {
  if (!isLoggedIn()) {
    const arr = lsGet();
    const i = arr.findIndex((p) => p.id === id);
    if (i >= 0) {
      arr[i] = { ...arr[i], ...patch };
      lsSet(arr);
      return arr[i];
    }
    return null;
  }
  const { data, error } = await supabase
    .from("plans")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlan(id) {
  if (!isLoggedIn()) {
    lsSet(lsGet().filter((p) => p.id !== id));
    return;
  }
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}

// user_prefs + RPC
export async function getDefaultPlanId() {
  if (!isLoggedIn()) return null;
  const { data, error } = await supabase
    .from("user_prefs")
    .select("default_plan_id")
    .single();
  if (error && error.code !== "PGRST116") throw error; // no rows
  return data?.default_plan_id ?? null;
}
export async function setDefaultPlan(planId) {
  if (!isLoggedIn()) return;
  const { error } = await supabase.rpc("set_default_plan", {
    p_plan_id: planId,
  });
  if (error) throw error;
}

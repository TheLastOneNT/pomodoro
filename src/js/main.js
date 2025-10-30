// src/js/main.js

import "./supa.js";
import "./state.js";
import "./storage.js";

import "./timer.js";
import "./ui.js";
import "./sidebar.js";
import "./sfx.js";
import "./app.js";

import { initAuth } from "./auth.js";
import { initWheels } from "./wheels.js";

function boot() {
  initWheels();
  initAuth();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

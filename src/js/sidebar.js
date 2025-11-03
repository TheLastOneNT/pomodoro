// sidebar.js — меню «План занятий»: Настроить / Выбрать, список планов.
// Фокус-ловушка, возврат фокуса, ESC при открытом сайдбаре, ARIA, async планы через plansApi.

import * as timer from './timer.js';
import { sync } from './ui.js';
import { state } from './state.js';
import { fetchPlans, createPlan, updatePlan, deletePlan } from './plansApi.js';

// -------------------- utils --------------------
const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v | 0));
const totalMinutes = (f, r, c) => c * (f + r);

function getFocusable(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')
  ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

function createFocusTrap(container) {
  let bound = false;
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const nodes = getFocusable(container);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !container.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };
  return {
    activate() {
      if (!container || bound) return;
      bound = true;
      container.addEventListener('keydown', onKey);
      getFocusable(container)[0]?.focus();
    },
    deactivate() {
      if (!container || !bound) return;
      bound = false;
      container.removeEventListener('keydown', onKey);
    },
  };
}

// -------------------- controller --------------------
class SidebarController {
  constructor() {
    this.dom = {
      // shell
      openButton: document.getElementById('openSettings'),
      closeButton: document.getElementById('sbClose'),
      sidebar: document.getElementById('sidebar'),
      backdrop: document.getElementById('sidebarBackdrop'),
      inner: document.querySelector('#sidebar .sb__inner'),

      // tabs
      tabBuild: document.getElementById('tab-build'),
      tabPick: document.getElementById('tab-pick'),
      panes: Array.from(document.querySelectorAll('.pane')),
      paneBuild: document.querySelector('.pane[data-pane="build"]'),
      panePick: document.querySelector('.pane[data-pane="pick"]'),

      // builder (мост)
      focusInput: document.getElementById('bFocus'),
      breakInput: document.getElementById('bBreak'),
      cyclesInput: document.getElementById('bCycles'),
      summary: document.getElementById('bMeta'),

      applyButton: document.getElementById('bApply'),
      saveToggle: document.getElementById('bSaveToggle'),
      saveBlock: document.getElementById('bSaveBlock'),
      planNameInput: document.getElementById('bName'),
      saveButton: document.getElementById('bSave'),
      editBadge: document.getElementById('bEditTag'),
      editName: document.getElementById('bEditName'),
      cancelEditButton: document.getElementById('bCancelEdit'),

      // options
      autoToggle: document.getElementById('bAuto'),
      soundToggle: document.getElementById('bSound'),

      // list
      plansList: document.getElementById('listPlans'),
    };

    // state
    this.focusTrap = createFocusTrap(this.dom.sidebar);
    this.lastActiveElement = null;
    this.editId = null;
    this.plans = [];

    // bind
    this.bindBase();
    this.bindTabs();
    this.bindBuilder();
    this.bindOptions();
    this.bindPlanList();

    // init
    this.openTab('build');
    this.syncOptionToggles();
    this.refreshPlans();
    this.updateBuilderSummary();
  }

  // -------- shell --------
  bindBase() {
    this.dom.openButton?.addEventListener('click', () => this.open());
    this.dom.closeButton?.addEventListener('click', () => this.close());
    this.dom.backdrop?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }
  isOpen() {
    return this.dom.sidebar?.classList.contains('show');
  }
  open() {
    this.lastActiveElement = document.activeElement;
    this.dom.sidebar?.classList.add('show');
    this.dom.backdrop?.classList.add('show');
    this.dom.sidebar?.setAttribute('aria-hidden', 'false');
    this.syncOptionToggles();
    this.focusTrap.activate();
  }
  close() {
    this.dom.sidebar?.classList.remove('show');
    this.dom.backdrop?.classList.remove('show');
    this.dom.sidebar?.setAttribute('aria-hidden', 'true');
    this.focusTrap.deactivate();
    // вернуть фокус
    if (this.lastActiveElement && typeof this.lastActiveElement.focus === 'function') {
      this.lastActiveElement.focus();
    } else {
      this.dom.openButton?.focus();
    }
  }

  // -------- tabs --------
  bindTabs() {
    // НЕ используем data-mode; определяем по id или aria-controls
    const btnToMode = (btn) => {
      if (!btn) return null;
      if (btn.id === 'tab-build') return 'build';
      if (btn.id === 'tab-pick') return 'pick';
      const ctrl = btn.getAttribute('aria-controls');
      if (ctrl?.includes('build')) return 'build';
      if (ctrl?.includes('pick')) return 'pick';
      return null;
    };

    const add = (btn) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        const mode = btnToMode(btn);
        if (mode) this.openTab(mode);
      });
    };

    add(this.dom.tabBuild);
    add(this.dom.tabPick);
  }

  openTab(mode /* 'build' | 'pick' */) {
    const isBuild = mode === 'build';

    // кнопки
    this.dom.tabBuild?.classList.toggle('is-active', isBuild);
    this.dom.tabBuild?.setAttribute('aria-selected', String(isBuild));
    this.dom.tabPick?.classList.toggle('is-active', !isBuild);
    this.dom.tabPick?.setAttribute('aria-selected', String(!isBuild));

    // панели
    this.dom.paneBuild?.classList.toggle('is-open', isBuild);
    this.dom.panePick?.classList.toggle('is-open', !isBuild);
  }

  // -------- builder --------
  bindBuilder() {
    const inputs = [this.dom.focusInput, this.dom.breakInput, this.dom.cyclesInput];
    inputs.forEach((input) => {
      ['input', 'change'].forEach((ev) =>
        input?.addEventListener(ev, () => this.updateBuilderSummary())
      );
    });

    this.dom.applyButton?.addEventListener('click', () => this.applyBuilderToTimer());

    this.dom.saveToggle?.addEventListener('click', () => {
      this.dom.saveBlock?.classList.toggle('hidden');
      if (!this.dom.saveBlock?.classList.contains('hidden')) {
        this.dom.planNameInput?.focus();
      }
    });

    this.dom.cancelEditButton?.addEventListener('click', () => this.resetEditState());
    this.dom.saveButton?.addEventListener('click', () => this.handleSavePlan());
  }

  readBuilderValues() {
    return {
      focus: clamp(this.dom.focusInput?.valueAsNumber || 25, 1, 180),
      relax: clamp(this.dom.breakInput?.valueAsNumber || 5, 1, 60),
      cycles: clamp(this.dom.cyclesInput?.valueAsNumber || 1, 1, 20),
    };
  }

  updateBuilderSummary() {
    const { focus, relax, cycles } = this.readBuilderValues();
    if (this.dom.summary) {
      this.dom.summary.textContent = `${focus}/${relax} ×${cycles} ≈ ${totalMinutes(
        focus,
        relax,
        cycles
      )} мин`;
    }
  }

  applyBuilderToTimer() {
    const { focus, relax, cycles } = this.readBuilderValues();
    timer.reset();
    timer.setPreset(focus, relax);
    timer.setCycles(cycles);
    sync();
  }

  toggleEditMode(enabled) {
    this.dom.editBadge?.classList.toggle('hidden', !enabled);
    this.dom.cancelEditButton?.classList.toggle('hidden', !enabled);
    this.dom.saveBlock?.classList.toggle('hidden', !enabled);
    if (this.dom.saveButton) {
      this.dom.saveButton.textContent = enabled ? 'Сохранить изменения' : 'Сохранить';
    }
  }

  resetEditState() {
    this.editId = null;
    this.toggleEditMode(false);
    if (this.dom.planNameInput) this.dom.planNameInput.value = '';
    if (this.dom.editName) this.dom.editName.textContent = '';
  }

  fillBuilderFromPlan(plan) {
    if (!plan) return;
    if (this.dom.focusInput) this.dom.focusInput.value = String(plan.focus);
    if (this.dom.breakInput) this.dom.breakInput.value = String(plan.break);
    if (this.dom.cyclesInput) this.dom.cyclesInput.value = String(plan.cycles);
    if (this.dom.planNameInput) this.dom.planNameInput.value = plan.name;
    if (this.dom.editName) this.dom.editName.textContent = plan.name;
    this.updateBuilderSummary();
  }

  // -------- options (auto/sound) --------
  bindOptions() {
    this.dom.autoToggle?.addEventListener('change', () => {
      const next = !!this.dom.autoToggle?.checked;
      timer.setAuto(next);
      state.auto = next;
      this.syncOptionToggles();
      sync();
    });
    this.dom.soundToggle?.addEventListener('change', () => {
      const next = !!this.dom.soundToggle?.checked;
      state.sound = next;
      this.syncOptionToggles();
      sync();
    });
  }
  syncOptionToggles() {
    if (this.dom.autoToggle) this.dom.autoToggle.checked = !!state.auto;
    if (this.dom.soundToggle) this.dom.soundToggle.checked = !!state.sound;
  }

  // -------- plans --------
  async handleSavePlan() {
    const { focus, relax, cycles } = this.readBuilderValues();
    const nameFromInput = (this.dom.planNameInput?.value || '').trim();
    const fallbackName = this.editId ? this.dom.editName?.textContent || 'План' : 'Мой план';
    const name = nameFromInput || fallbackName;

    if (this.editId) {
      await updatePlan(this.editId, {
        name,
        focus,
        break: relax,
        cycles,
        total: totalMinutes(focus, relax, cycles),
      });
      await this.refreshPlans();
      this.resetEditState();
      this.openTab('pick');
      return;
    }

    await createPlan({ name, focus, break: relax, cycles });
    await this.refreshPlans();
    this.resetEditState();
    this.openTab('pick');
  }

  async refreshPlans() {
    try {
      this.plans = await fetchPlans();
    } catch (err) {
      console.error('[sidebar] Не удалось загрузить планы', err);
      this.plans = [];
    }
    this.renderPlans();
  }

  renderPlans() {
    const list = this.dom.plansList;
    if (!list) return;

    list.replaceChildren();

    if (!Array.isArray(this.plans) || this.plans.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'item empty';
      empty.setAttribute('role', 'note');
      empty.textContent = 'Нет сохранённых планов — сохраните во вкладке «Настроить».';
      list.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    for (const plan of this.plans) {
      const row = document.createElement('div');
      row.className = 'item';

      const text = document.createElement('div');
      text.className = 'text';

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = plan.name;

      const meta = document.createElement('span');
      meta.className = 'meta';
      const total = plan.total ?? plan.cycles * (plan.focus + plan.break);
      meta.textContent = `• ${plan.focus}/${plan.break} ×${plan.cycles} · ≈ ${total} мин`;

      text.append(name, meta);

      const act = document.createElement('div');
      act.className = 'act';

      const run = document.createElement('button');
      run.className = 'icon';
      run.dataset.act = 'run';
      run.dataset.id = plan.id;
      run.setAttribute('aria-label', 'Запустить');
      run.textContent = '▶';

      const edit = document.createElement('button');
      edit.className = 'icon';
      edit.dataset.act = 'edit';
      edit.dataset.id = plan.id;
      edit.setAttribute('aria-label', 'Редактировать');
      edit.textContent = '✎';

      const del = document.createElement('button');
      del.className = 'icon';
      del.dataset.act = 'del';
      del.dataset.id = plan.id;
      del.setAttribute('aria-label', 'Удалить');
      del.textContent = '✕';

      act.append(run, edit, del);
      row.append(text, act);
      frag.appendChild(row);
    }
    list.appendChild(frag);
  }

  bindPlanList() {
    this.dom.plansList?.addEventListener('click', (e) => this.handlePlanAction(e));
  }

  async handlePlanAction(e) {
    const btn = e.target.closest('button.icon');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    if (!id || !act) return;

    if (act === 'run') {
      const plan = this.findPlan(id);
      if (!plan) return;
      this.applyPlan(plan);
      this.close();
      return;
    }
    if (act === 'del') {
      await deletePlan(id);
      await this.refreshPlans();
      return;
    }
    if (act === 'edit') {
      const plan = this.findPlan(id);
      if (!plan) return;
      this.editId = plan.id;
      this.fillBuilderFromPlan(plan);
      this.toggleEditMode(true);
      this.dom.planNameInput?.focus();
      this.openTab('build');
    }
  }

  findPlan(id) {
    return this.plans.find((p) => String(p.id) === String(id)) ?? null;
  }

  applyPlan(plan) {
    timer.reset();
    timer.setPreset(plan.focus, plan.break);
    timer.setCycles(plan.cycles);
    sync();
  }
}

// -------------------- public api --------------------
const controller = new SidebarController();
export const openSB = () => controller.open();
export const closeSB = () => controller.close();

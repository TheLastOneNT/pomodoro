// sidebar.js — меню «План занятий»: Настроить / Выбрать, общий список планов.
// Тема управляется в app.js. Добавлены: фокус-ловушка, возврат фокуса, ESC только при открытом сайдбаре.

import * as timer from './timer.js';
import { sync } from './ui.js';
import { state } from './state.js';
import { fetchPlans, createPlan, updatePlan, deletePlan } from './plansApi.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value | 0));
const totalMinutes = (focus, relax, cycles) => cycles * (focus + relax);

function getFocusableElements(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'));
}

function createFocusTrap(container) {
  let bound = false;

  const handleKeydown = (event) => {
    if (event.key !== 'Tab') return;

    const focusables = getFocusableElements(container);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !container.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  return {
    activate() {
      if (!container || bound) return;
      bound = true;
      container.addEventListener('keydown', handleKeydown);
      const [firstFocusable] = getFocusableElements(container);
      firstFocusable?.focus();
    },
    deactivate() {
      if (!container || !bound) return;
      bound = false;
      container.removeEventListener('keydown', handleKeydown);
    },
  };
}

class SidebarController {
  constructor() {
    this.dom = {
      openButton: document.getElementById('openSettings'),
      closeButton: document.getElementById('sbClose'),
      sidebar: document.getElementById('sidebar'),
      backdrop: document.getElementById('sidebarBackdrop'),
      tabButtons: Array.from(document.querySelectorAll('.seg__btn[data-mode]')),
      panes: Array.from(document.querySelectorAll('.pane')),
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
      plansList: document.getElementById('listPlans'),
      autoToggle: document.getElementById('bAuto'),
      soundToggle: document.getElementById('bSound'),
    };

    this.focusTrap = createFocusTrap(this.dom.sidebar);
    this.lastActiveElement = null;
    this.editId = null;
    this.plans = [];

    this.bindBaseInteractions();
    this.bindTabs();
    this.bindBuilder();
    this.bindOptions();
    this.bindPlanList();

    this.openTab('build');
    this.refreshPlans();
    this.updateBuilderSummary();
    this.syncOptionToggles();
  }

  bindBaseInteractions() {
    this.dom.openButton?.addEventListener('click', () => this.open());
    this.dom.closeButton?.addEventListener('click', () => this.close());
    this.dom.backdrop?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  bindTabs() {
    this.dom.tabButtons.forEach((button) =>
      button.addEventListener('click', () => this.openTab(button.dataset.mode))
    );
  }

  bindBuilder() {
    const inputs = [this.dom.focusInput, this.dom.breakInput, this.dom.cyclesInput];
    inputs.forEach((input) =>
      ['input', 'change'].forEach((eventName) =>
        input?.addEventListener(eventName, () => this.updateBuilderSummary())
      )
    );

    this.dom.applyButton?.addEventListener('click', () => this.applyBuilderToTimer());

    this.dom.saveToggle?.addEventListener('click', () => {
      this.dom.saveBlock?.classList.toggle('hidden');
      this.dom.planNameInput?.focus();
    });

    this.dom.cancelEditButton?.addEventListener('click', () => this.resetEditState());

    this.dom.saveButton?.addEventListener('click', () => this.handleSavePlan());
  }

  bindOptions() {
    this.dom.autoToggle?.addEventListener('change', () => {
      const nextValue = !!this.dom.autoToggle?.checked;
      timer.setAuto(nextValue);
      state.auto = nextValue;
      const legacyAuto = document.getElementById('autoToggle');
      if (legacyAuto) legacyAuto.checked = nextValue;
      this.syncOptionToggles();
      sync();
    });

    this.dom.soundToggle?.addEventListener('change', () => {
      state.sound = !!this.dom.soundToggle?.checked;
      const legacySound = document.getElementById('soundToggle');
      if (legacySound) legacySound.checked = state.sound;
      this.syncOptionToggles();
      sync();
    });
  }

  syncOptionToggles() {
    if (this.dom.autoToggle) this.dom.autoToggle.checked = !!state.auto;
    if (this.dom.soundToggle) this.dom.soundToggle.checked = !!state.sound;
  }

  bindPlanList() {
    this.dom.plansList?.addEventListener('click', (event) => this.handlePlanAction(event));
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

    if (this.lastActiveElement && typeof this.lastActiveElement.focus === 'function') {
      this.lastActiveElement.focus();
    } else {
      this.dom.openButton?.focus();
    }
  }

  openTab(mode) {
    this.dom.tabButtons.forEach((button) =>
      button.classList.toggle('is-active', button.dataset.mode === mode)
    );
    this.dom.panes.forEach((pane) => pane.classList.toggle('is-open', pane.dataset.pane === mode));
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
    if (this.dom.planNameInput) {
      this.dom.planNameInput.value = '';
    }
    if (this.dom.editName) {
      this.dom.editName.textContent = '';
    }
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

  async handleSavePlan() {
    const { focus, relax, cycles } = this.readBuilderValues();
    const nameInputValue = (this.dom.planNameInput?.value || '').trim();
    const fallbackName = this.editId ? this.dom.editName?.textContent || 'План' : 'Мой план';
    const name = nameInputValue || fallbackName;

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
    } catch (error) {
      console.error('[sidebar] Не удалось загрузить планы', error);
      this.plans = [];
    }
    this.renderPlans();
  }

  renderPlans() {
    const list = this.dom.plansList;
    if (!list) return;

    // очищаем корректно
    list.replaceChildren();

    // ПУСТОЙ СПИСОК — одна компактная фраза
    if (!Array.isArray(this.plans) || this.plans.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'item empty';
      empty.setAttribute('role', 'note');
      empty.textContent = 'Нет сохранённых планов — сохраните во вкладке «Настроить».';
      list.appendChild(empty);
      return;
    }

    // ЕСТЬ ПЛАНЫ — аккуратно строим DOM, без innerHTML
    const frag = document.createDocumentFragment();

    this.plans.forEach((plan) => {
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
    });

    list.appendChild(frag);
  }

  async handlePlanAction(event) {
    const button = event.target.closest('button.icon');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.act;
    if (!id || !action) return;

    if (action === 'run') {
      const plan = this.findPlan(id);
      if (!plan) return;
      this.applyPlan(plan);
      this.close();
      return;
    }

    if (action === 'del') {
      await deletePlan(id);
      await this.refreshPlans();
      return;
    }

    if (action === 'edit') {
      const plan = this.findPlan(id);
      if (!plan) return;

      this.editId = plan.id;
      this.fillBuilderFromPlan(plan);
      this.toggleEditMode(true);
      this.dom.planNameInput?.focus();
      this.openTab('build');
    }
  }

  findPlan(planId) {
    return this.plans.find((plan) => String(plan.id) === String(planId)) ?? null;
  }

  applyPlan(plan) {
    timer.reset();
    timer.setPreset(plan.focus, plan.break);
    timer.setCycles(plan.cycles);
    sync();
  }
}

const controller = new SidebarController();

export const openSB = () => controller.open();
export const closeSB = () => controller.close();

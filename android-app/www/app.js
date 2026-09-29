import { renderBottomNav } from './components/bottom-nav.js';
import { renderTodayView } from './views/today.js';
import { renderUpcomingView } from './views/upcoming.js';
import { renderAllTasksView } from './views/all-tasks.js';
import { renderCompletedView } from './views/completed.js';
import { renderCalendarView } from './views/calendar.js';
import { renderSettingsView } from './views/settings.js';
import { renderTaskModal } from './components/task-form.js';

export const state = {
  tasks: [],
  categories: [],
  settings: {},
  currentView: 'today',
  searchQuery: '',
  filterCategory: 'all',
  filterPriority: 'all',
  isDark: false,
};

let bottomNavContainer;
let viewContainer;
let viewTitleElement;
let searchSection;

const VIEW_TITLES = {
  today: 'Today',
  upcoming: 'Upcoming',
  all: 'All Tasks',
  completed: 'Completed',
  calendar: 'Calendar',
  settings: 'Settings'
};

export async function initApp() {
  bottomNavContainer = document.getElementById('bottom-nav');
  viewContainer = document.getElementById('view-container');
  viewTitleElement = document.getElementById('mobile-view-title');
  searchSection = document.getElementById('mobile-search-section');

  // Load data via api-bridge
  try {
    state.tasks = await window.api.getTasks();
    state.categories = await window.api.getCategories();
    state.settings = await window.api.getSettings();
  } catch (err) {
    console.error("Failed to load data", err);
    showToast("Failed to load app data", "error");
  }

  // Determine theme
  if (state.settings.theme === 'system') {
    state.isDark = await window.api.getSystemTheme();
  } else {
    state.isDark = state.settings.theme === 'dark';
  }
  applyTheme(state.isDark);

  updateCategoryFilterDropdown();

  // Search & Filter event listeners
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const btnToggleSearch = document.getElementById('btn-toggle-search');

  btnToggleSearch.addEventListener('click', () => {
    searchSection.classList.toggle('hidden');
    if (!searchSection.classList.contains('hidden')) {
      searchInput.focus();
    }
  });

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    searchClear.classList.toggle('hidden', !e.target.value);
    renderCurrentView();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    searchClear.classList.add('hidden');
    renderCurrentView();
  });

  document.getElementById('filter-category').addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    renderCurrentView();
  });

  document.getElementById('filter-priority').addEventListener('change', (e) => {
    state.filterPriority = e.target.value;
    renderCurrentView();
  });

  // FAB button
  document.getElementById('btn-fab-add').addEventListener('click', () => {
    openTaskModal(null);
  });

  // Modal backdrop click to dismiss
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Global listeners
  window.api.onNotificationClick((taskId) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) openTaskModal(task);
  });
  window.api.onQuickAdd(() => openTaskModal(null));
  window.api.onThemeChange((isDark) => {
    if (state.settings.theme === 'system') applyTheme(isDark);
  });

  // Initial render
  refreshUI();
}

function updateCategoryFilterDropdown() {
  const select = document.getElementById('filter-category');
  if (!select) return;
  select.innerHTML = '<option value="all">All Categories</option>' + 
    state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  select.value = state.filterCategory;
}

export function navigate(viewName) {
  state.currentView = viewName;
  viewTitleElement.textContent = VIEW_TITLES[viewName] || 'Taskflow';
  
  // Hide search bar on views that don't need it
  const btnToggleSearch = document.getElementById('btn-toggle-search');
  if (viewName === 'calendar' || viewName === 'settings') {
    btnToggleSearch.style.display = 'none';
    searchSection.classList.add('hidden');
  } else {
    btnToggleSearch.style.display = 'flex';
  }

  // Hide FAB in settings
  const fab = document.getElementById('btn-fab-add');
  if (viewName === 'settings') {
    fab.classList.add('hidden');
  } else {
    fab.classList.remove('hidden');
  }

  refreshUI();
}

export async function refreshTasks() {
  state.tasks = await window.api.getTasks();
  state.categories = await window.api.getCategories();
  updateCategoryFilterDropdown();
  refreshUI();
}

export function refreshUI() {
  renderBottomNav(bottomNavContainer, state, navigate);
  renderCurrentView();
}

function renderCurrentView() {
  viewContainer.innerHTML = '';

  switch (state.currentView) {
    case 'today':
      renderTodayView(viewContainer, state);
      break;
    case 'upcoming':
      renderUpcomingView(viewContainer, state);
      break;
    case 'all':
      renderAllTasksView(viewContainer, state);
      break;
    case 'completed':
      renderCompletedView(viewContainer, state);
      break;
    case 'calendar':
      renderCalendarView(viewContainer, state);
      break;
    case 'settings':
      renderSettingsView(viewContainer, state, {
        onSettingChange: async (k, v) => {
          state.settings = await window.api.setSetting(k, v);
          if (k === 'theme') {
            applyTheme(v === 'system' ? await window.api.getSystemTheme() : v === 'dark');
          }
          refreshUI();
        },
        onExport: async () => {
          const res = await window.api.exportData();
          if (res.success) showToast('Backup saved / shared', 'success');
          else showToast('Export cancelled', 'warning');
        },
        onImport: async () => {
          const res = await window.api.importData();
          if (res.success) {
            showToast('Data imported successfully', 'success');
            await refreshTasks();
          }
        },
        onCategoryChange: async () => {
          await refreshTasks();
        }
      });
      break;
  }
}

export function applyTheme(isDark) {
  state.isDark = isDark;
  if (isDark) {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-light');
  } else {
    document.body.classList.add('theme-light');
    document.body.classList.remove('theme-dark');
  }
}

export function showToast(message, type = 'success', action = null) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  if (action) {
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      action.onClick();
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });
    toast.appendChild(btn);
  }

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  
  const duration = action ? 5000 : 3000;
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function openTaskModal(taskOrNull, options = {}) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');

  renderTaskModal(taskOrNull, state.categories, state.settings, {
    onSave: async (taskData) => {
      try {
        if (!taskOrNull && options.prefillDate && !taskData.dueDate) {
          taskData.dueDate = options.prefillDate;
        }
        if (taskOrNull) {
          await window.api.updateTask(taskOrNull.id, taskData);
          showToast('Task updated');
        } else {
          await window.api.createTask(taskData);
          showToast('Task created');
        }
        await refreshTasks();
      } catch (err) {
        showToast('Error saving task', 'error');
      }
      closeModal();
    },
    onDelete: async (id) => {
      if (confirm('Delete this task?')) {
        await window.api.deleteTask(id);
        showToast('Task deleted');
        await refreshTasks();
        closeModal();
      }
    },
    onClose: closeModal
  }, overlay, options);
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

export function getState() {
  return state;
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);

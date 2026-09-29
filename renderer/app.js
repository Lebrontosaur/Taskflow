import { renderSidebar } from './components/sidebar.js';
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

// Global DOM Elements
let sidebarContainer;
let mainContentContainer;
let topBarElement;

export async function initApp() {
  sidebarContainer = document.getElementById('sidebar');
  mainContentContainer = document.getElementById('main-content');
  
  // Load data
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

  // Setup layout with topbar for main content
  mainContentContainer.innerHTML = `
    <div id="top-bar" class="top-bar">
      <div class="search-wrapper">
        <input type="text" id="search-input" class="search-input" placeholder="Search tasks..." />
        <button id="search-clear" class="search-clear hidden" title="Clear search">&times;</button>
      </div>
      <select id="filter-category" class="filter-select">
        <option value="all">All Categories</option>
      </select>
      <select id="filter-priority" class="filter-select">
        <option value="all">All Priorities</option>
        <option value="high">High</option>
        <option value="med">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
    <div id="view-container" class="view-container"></div>
  `;
  
  topBarElement = document.getElementById('top-bar');
  updateCategoryFilterDropdown();

  // Event listeners for search/filter
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
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

  // Modal overlay click-to-close
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

  setupKeyboardShortcuts();

  // Initial render
  refreshUI();
}

function updateCategoryFilterDropdown() {
  const select = document.getElementById('filter-category');
  if(!select) return;
  select.innerHTML = '<option value="all">All Categories</option>' + 
    state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  select.value = state.filterCategory;
}

export function navigate(viewName) {
  state.currentView = viewName;
  
  // Show/hide topbar
  if (viewName === 'calendar' || viewName === 'settings') {
    topBarElement.style.display = 'none';
  } else {
    topBarElement.style.display = 'flex';
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
  renderSidebar(sidebarContainer, state, navigate);
  renderCurrentView();
}

function renderCurrentView() {
  const viewContainer = document.getElementById('view-container');
  viewContainer.innerHTML = ''; // clear

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
          if (res.success) showToast(`Exported to ${res.filePath}`, 'success');
          else showToast('Export failed or cancelled', 'warning');
        },
        onImport: async () => {
          const res = await window.api.importData();
          if (res.success) {
            showToast('Data imported', 'success');
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
  
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));
  
  const duration = action ? 5000 : 3000; // longer for actionable toasts
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function openTaskModal(taskOrNull, options = {}) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');

  // If we have a prefillDate but no task, create a blank task with that date pre-filled
  let taskToEdit = taskOrNull;
  if (!taskToEdit && options.prefillDate) {
    taskToEdit = null; // stays null — we'll pass prefill through the task data defaults
  }

  renderTaskModal(taskOrNull, state.categories, state.settings, {
    onSave: async (taskData) => {
      try {
        // Apply prefill date if creating new task
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

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Don't trigger if typing in input or modal open
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (!document.getElementById('modal-overlay').classList.contains('hidden')) {
      if (e.key === 'Escape') closeModal();
      return;
    }

    switch (e.key) {
      case 'n':
        e.preventDefault();
        openTaskModal(null);
        break;
      case '/':
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
        break;
      case '1': navigate('today'); break;
      case '2': navigate('upcoming'); break;
      case '3': navigate('all'); break;
      case '4': navigate('completed'); break;
      case '5': navigate('calendar'); break;
      case '6': navigate('settings'); break;
    }
  });
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);

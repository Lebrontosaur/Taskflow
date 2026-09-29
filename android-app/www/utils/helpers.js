// Shared utility functions

/**
 * Escapes HTML special characters to prevent XSS in innerHTML usage.
 */
export function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Applies search, category, and priority filters to a task array.
 * Returns a new filtered array (does not mutate input).
 */
export function filterTasks(tasks, state) {
  let result = tasks;

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }

  if (state.filterCategory !== 'all') {
    result = result.filter(t => t.category === state.filterCategory);
  }

  if (state.filterPriority !== 'all') {
    result = result.filter(t => t.priority === state.filterPriority);
  }

  return result;
}

/**
 * Creates shared task action handlers (toggle, edit, delete).
 * Reduces boilerplate across views.
 */
export function createTaskHandlers(state, refreshTasks, openTaskModal, showToast) {
  return {
    handleToggle: async (id) => {
      try {
        const result = await window.api.toggleTask(id);
        await refreshTasks();
        // Show undo toast when completing (not when uncompleting)
        if (result && result.task && result.task.done && showToast) {
          showToast('Task completed', 'success', {
            label: 'Undo',
            onClick: async () => {
              await window.api.toggleTask(id);
              await refreshTasks();
            }
          });
        }
      } catch (err) {
        console.error('Toggle failed:', err);
      }
    },
    handleEdit: (id) => {
      const task = state.tasks.find(x => x.id === id);
      if (task) openTaskModal(task);
    },
    handleDelete: async (id) => {
      if (confirm('Delete task?')) {
        try {
          await window.api.deleteTask(id);
          await refreshTasks();
        } catch (err) {
          console.error('Delete failed:', err);
        }
      }
    }
  };
}

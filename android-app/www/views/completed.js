import { renderTaskList } from '../components/task-list.js';
import { refreshTasks, openTaskModal, showToast } from '../app.js';
import { filterTasks, createTaskHandlers } from '../utils/helpers.js';

export function renderCompletedView(container, state) {
  let tasks = state.tasks.filter(t => t.done);
  tasks = filterTasks(tasks, state);
  
  // Sort by completed date
  tasks.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

  const { handleToggle, handleEdit, handleDelete } = createTaskHandlers(state, refreshTasks, openTaskModal, showToast);

  container.innerHTML = `
    <div class="view-header">
      <h2>Completed <span class="sidebar-badge" style="margin-left: 8px;">${tasks.length}</span></h2>
      ${tasks.length > 0 ? `<button id="btn-clear-completed" class="btn btn-danger">Clear all completed</button>` : ''}
    </div>
    <div class="view-content" id="completed-list-container"></div>
  `;

  if (tasks.length > 0) {
    container.querySelector('#btn-clear-completed').addEventListener('click', async () => {
      if (confirm("Permanently delete all completed tasks? This cannot be undone.")) {
        for (const t of tasks) {
          await window.api.deleteTask(t.id);
        }
        refreshTasks();
      }
    });
  }

  renderTaskList(container.querySelector('#completed-list-container'), tasks, {
    onToggle: handleToggle,
    onEdit: handleEdit,
    onDelete: handleDelete,
    categories: state.categories,
    emptyIcon: "✅",
    emptyMessage: "No completed tasks yet — start checking things off!"
  });
}

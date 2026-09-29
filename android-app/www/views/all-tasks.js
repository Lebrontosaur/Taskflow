import { renderTaskList } from '../components/task-list.js';
import { refreshTasks, openTaskModal, showToast } from '../app.js';
import { filterTasks, createTaskHandlers } from '../utils/helpers.js';

export function renderAllTasksView(container, state) {
  let tasks = state.tasks.filter(t => !t.done);
  tasks = filterTasks(tasks, state);

  // Sort: Priority > DueDate > Created
  const pVal = { high: 3, med: 2, low: 1 };
  tasks.sort((a, b) => {
    const pDiff = (pVal[b.priority] || 0) - (pVal[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  const { handleToggle, handleEdit, handleDelete } = createTaskHandlers(state, refreshTasks, openTaskModal, showToast);

  container.innerHTML = `
    <div class="view-header">
      <h2>All Tasks <span class="sidebar-badge" style="margin-left: 8px;">${tasks.length}</span></h2>
    </div>
    <div class="view-content" id="all-list-container"></div>
  `;

  renderTaskList(container.querySelector('#all-list-container'), tasks, {
    onToggle: handleToggle,
    onEdit: handleEdit,
    onDelete: handleDelete,
    categories: state.categories,
    emptyIcon: "📋",
    emptyMessage: "No tasks yet — create one to get started!"
  });
}

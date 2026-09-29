import { renderTaskList } from '../components/task-list.js';
import { getDaysUntil } from '../utils/date-utils.js';
import { refreshTasks, openTaskModal, showToast } from '../app.js';
import { filterTasks, createTaskHandlers } from '../utils/helpers.js';

export function renderUpcomingView(container, state) {
  let tasks = state.tasks.filter(t => !t.done && t.dueDate && getDaysUntil(t.dueDate) > 0);
  tasks = filterTasks(tasks, state);

  // Sort chronologically
  tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const { handleToggle, handleEdit, handleDelete } = createTaskHandlers(state, refreshTasks, openTaskModal, showToast);

  container.innerHTML = `
    <div class="view-header">
      <h2>Upcoming</h2>
    </div>
    <div class="view-content" id="upcoming-list-container"></div>
  `;

  const listContainer = container.querySelector('#upcoming-list-container');
  
  renderTaskList(listContainer, tasks, {
    onToggle: handleToggle,
    onEdit: handleEdit,
    onDelete: handleDelete,
    groupByDate: true,
    categories: state.categories,
    emptyIcon: "🗓️",
    emptyMessage: "No upcoming tasks — you're all caught up!"
  });
}

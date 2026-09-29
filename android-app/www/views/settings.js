export function renderSettingsView(container, state, callbacks) {
  const s = state.settings || {};
  
  container.innerHTML = `
    <div class="view-header">
      <h2>Settings</h2>
    </div>
    <div class="view-content settings-content">
      
      <!-- Appearance -->
      <div class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Theme</div>
            <div class="settings-desc">Choose your preferred color scheme</div>
          </div>
          <select id="setting-theme" class="form-control" style="width: 140px;">
            <option value="system" ${s.theme === 'system' ? 'selected' : ''}>System</option>
            <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <h3 class="settings-section-title">Notifications & Reminders</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Default Reminder</div>
            <div class="settings-desc">Automatic reminder added to new tasks</div>
          </div>
          <select id="setting-reminder" class="form-control" style="width: 140px;">
            <option value="0" ${s.defaultReminderLead === 0 ? 'selected' : ''}>At due time</option>
            <option value="5" ${s.defaultReminderLead === 5 ? 'selected' : ''}>5 min before</option>
            <option value="15" ${s.defaultReminderLead === 15 ? 'selected' : ''}>15 min before</option>
            <option value="30" ${s.defaultReminderLead === 30 ? 'selected' : ''}>30 min before</option>
            <option value="60" ${s.defaultReminderLead === 60 ? 'selected' : ''}>1 hour before</option>
          </select>
        </div>
        <div class="settings-row" style="margin-top: 8px;">
          <div>
            <div class="settings-label">Android Notification Permission</div>
            <div class="settings-desc">Allow Taskflow to alert you when tasks are due</div>
          </div>
          <button id="btn-request-perm" class="btn btn-secondary" style="white-space: nowrap;">Check / Allow</button>
        </div>
      </div>

      <!-- Categories -->
      <div class="settings-section">
        <h3 class="settings-section-title">Categories</h3>
        <div class="category-list" id="settings-category-list"></div>
      </div>

      <!-- Data -->
      <div class="settings-section">
        <h3 class="settings-section-title">Backup & Restore</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Backup Data</div>
            <div class="settings-desc">Share or save a JSON backup of your tasks</div>
          </div>
          <button id="btn-export" class="btn btn-secondary">Share / Export</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Restore Data</div>
            <div class="settings-desc">Restore from a backup JSON file</div>
          </div>
          <button id="btn-import" class="btn btn-secondary">Import File</button>
        </div>
      </div>

      <!-- About -->
      <div class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <div style="text-align: center; padding: 16px 0;">
          <h3 style="margin-bottom: 2px;">Taskflow for Android</h3>
          <p class="text-dim text-small">v1.0.0 • Offline Personal Task Manager</p>
        </div>
      </div>

    </div>
  `;

  // Attach Setting Handlers
  container.querySelector('#setting-theme').addEventListener('change', (e) => callbacks.onSettingChange('theme', e.target.value));
  container.querySelector('#setting-reminder').addEventListener('change', (e) => callbacks.onSettingChange('defaultReminderLead', parseInt(e.target.value, 10)));
  
  container.querySelector('#btn-request-perm').addEventListener('click', async () => {
    if (window.api && window.api.requestPermission) {
      const granted = await window.api.requestPermission();
      alert(granted ? 'Notification permission granted!' : 'Permission denied or not available.');
    }
  });

  container.querySelector('#btn-export').addEventListener('click', callbacks.onExport);
  container.querySelector('#btn-import').addEventListener('click', callbacks.onImport);

  // Render Categories
  const catList = container.querySelector('#settings-category-list');
  const renderCategories = () => {
    catList.innerHTML = state.categories.map(c => `
      <div class="category-item">
        <div class="color-swatch" style="background-color: ${c.color}"></div>
        <div style="flex:1; font-weight: 500;">${c.name}</div>
        <button type="button" class="btn-icon btn-cat-del" data-name="${c.name}">🗑️</button>
      </div>
    `).join('') + `
      <div style="display:flex; gap:10px; margin-top: 10px;">
        <input type="text" id="new-cat-name" class="form-control" placeholder="New category name" style="flex: 1;">
        <input type="color" id="new-cat-color" value="#6c63ff" style="width:44px; height: 40px; padding:0; border:1px solid var(--border-color); border-radius:6px; cursor:pointer;">
        <button id="btn-add-cat" class="btn btn-primary">Add</button>
      </div>
    `;

    catList.querySelectorAll('.btn-cat-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = e.target.dataset.name;
        if (confirm(`Delete category "${name}"?`)) {
          await window.api.deleteCategory(name);
          callbacks.onCategoryChange();
          renderCategories();
        }
      });
    });

    catList.querySelector('#btn-add-cat').addEventListener('click', async () => {
      const name = catList.querySelector('#new-cat-name').value.trim();
      const color = catList.querySelector('#new-cat-color').value;
      if (name) {
        await window.api.createCategory(name, color);
        callbacks.onCategoryChange();
        renderCategories();
      }
    });
  };
  
  renderCategories();
}

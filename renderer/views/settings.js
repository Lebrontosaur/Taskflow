export function renderSettingsView(container, state, callbacks) {
  const s = state.settings || {};
  
  container.innerHTML = `
    <div class="view-header">
      <h2>Settings</h2>
    </div>
    <div class="view-content" style="max-width: 800px; margin: 0 auto;">
      
      <!-- Appearance -->
      <div class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Theme</div>
            <div class="settings-desc">Choose your preferred color scheme</div>
          </div>
          <select id="setting-theme" class="form-control" style="width: 150px;">
            <option value="system" ${s.theme === 'system' ? 'selected' : ''}>System Default</option>
            <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <h3 class="settings-section-title">Notifications</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Default Reminder</div>
            <div class="settings-desc">Automatic reminder added to new tasks</div>
          </div>
          <select id="setting-reminder" class="form-control" style="width: 150px;">
            <option value="0" ${s.defaultReminderLead === 0 ? 'selected' : ''}>At due time</option>
            <option value="5" ${s.defaultReminderLead === 5 ? 'selected' : ''}>5 min before</option>
            <option value="15" ${s.defaultReminderLead === 15 ? 'selected' : ''}>15 min before</option>
            <option value="30" ${s.defaultReminderLead === 30 ? 'selected' : ''}>30 min before</option>
            <option value="60" ${s.defaultReminderLead === 60 ? 'selected' : ''}>1 hour before</option>
          </select>
        </div>
      </div>

      <!-- Startup -->
      <div class="settings-section">
        <h3 class="settings-section-title">Startup</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Launch at startup</div>
            <div class="settings-desc">Open Taskflow when you log into Windows</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-autolaunch" ${s.autoLaunch ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Start minimized</div>
            <div class="settings-desc">Start app hidden in system tray</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-startminimized" ${s.startMinimized ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Categories -->
      <div class="settings-section">
        <h3 class="settings-section-title">Categories</h3>
        <div class="category-list" id="settings-category-list">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Data -->
      <div class="settings-section">
        <h3 class="settings-section-title">Data Management</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Export Data</div>
            <div class="settings-desc">Save a backup of your tasks and settings</div>
          </div>
          <button id="btn-export" class="btn btn-secondary">Export JSON</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Import Data</div>
            <div class="settings-desc">Restore from a backup file</div>
          </div>
          <button id="btn-import" class="btn btn-secondary">Import JSON</button>
        </div>
      </div>

      <!-- About -->
      <div class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <div style="text-align: center; padding: 20px;">
          <h2 style="margin-bottom: 4px;">Taskflow v1.0.0</h2>
          <p class="text-secondary mb-4">A personal task manager for Windows</p>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Quit Application</div>
            <div class="settings-desc">Fully close Taskflow (bypasses tray)</div>
          </div>
          <button id="btn-quit" class="btn btn-danger-solid">Quit Taskflow</button>
        </div>
      </div>

    </div>
  `;

  // Attach Setting Handlers
  container.querySelector('#setting-theme').addEventListener('change', (e) => callbacks.onSettingChange('theme', e.target.value));
  container.querySelector('#setting-reminder').addEventListener('change', (e) => callbacks.onSettingChange('defaultReminderLead', parseInt(e.target.value, 10)));
  container.querySelector('#setting-autolaunch').addEventListener('change', (e) => callbacks.onSettingChange('autoLaunch', e.target.checked));
  container.querySelector('#setting-startminimized').addEventListener('change', (e) => callbacks.onSettingChange('startMinimized', e.target.checked));
  
  container.querySelector('#btn-export').addEventListener('click', callbacks.onExport);
  container.querySelector('#btn-import').addEventListener('click', callbacks.onImport);
  container.querySelector('#btn-quit').addEventListener('click', () => window.api.quitApp());

  // Render Categories
  const catList = container.querySelector('#settings-category-list');
  const renderCategories = () => {
    catList.innerHTML = state.categories.map(c => `
      <div class="category-item">
        <div class="color-swatch" style="background-color: ${c.color}"></div>
        <div style="flex:1; font-weight: 500;">${c.name}</div>
        <button class="btn-icon btn-cat-del" data-name="${c.name}">🗑️</button>
      </div>
    `).join('') + `
      <div style="display:flex; gap:12px; margin-top: 8px;">
        <input type="text" id="new-cat-name" class="form-control" placeholder="New category name">
        <input type="color" id="new-cat-color" value="#6c63ff" style="width:40px; height: 38px; padding:0; border:1px solid var(--border-color); border-radius:4px; cursor:pointer;">
        <button id="btn-add-cat" class="btn btn-primary">Add</button>
      </div>
    `;

    catList.querySelectorAll('.btn-cat-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const name = e.target.dataset.name;
        if (confirm(`Delete category "${name}"? Tasks will not be deleted but will lose this category.`)) {
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

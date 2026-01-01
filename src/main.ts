import {App, Modal, Notice, Plugin, WorkspaceLeaf, ItemView, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab, TodoItem, TodoPriority} from "./settings";

export const VIEW_TYPE_TODO = 'todo-view';

export class TodoView extends ItemView {
	plugin: MyPlugin;
	searchInput: HTMLInputElement;
	filterSelect: HTMLSelectElement;

	constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_TODO;
	}

	getDisplayText(): string {
		return '待办事项';
	}

	getIcon(): string {
		return 'check-square';
	}

	onOpen(): Promise<void> {
		this.render();
		return Promise.resolve();
	}

	onClose(): Promise<void> {
		this.contentEl.empty();
		return Promise.resolve();
	}

	render(): void {
		const {contentEl} = this;
		contentEl.empty();

		this.renderToolbar(contentEl);
		this.renderStats(contentEl);
		this.renderTodoList(contentEl);
	}

	renderToolbar(containerEl: HTMLElement): void {
		const toolbarEl = containerEl.createEl('div', {cls: 'todo-toolbar'});

		const searchGroup = toolbarEl.createEl('div', {cls: 'todo-toolbar-group'});
		searchGroup.createEl('span', {text: '🔍', cls: 'todo-toolbar-icon'});
		this.searchInput = searchGroup.createEl('input', {
			type: 'text',
			placeholder: '搜索任务...',
			cls: 'todo-search-input'
		}) as HTMLInputElement;
		this.searchInput.addEventListener('input', () => {
			this.renderTodoList(containerEl);
		});

		const filterGroup = toolbarEl.createEl('div', {cls: 'todo-toolbar-group'});
		this.filterSelect = filterGroup.createEl('select', {cls: 'todo-filter-select'});
		const filterOptions = [
			{value: 'all', label: '全部'},
			{value: 'high', label: '高优先级'},
			{value: 'medium', label: '中优先级'},
			{value: 'low', label: '低优先级'},
			{value: 'completed', label: '已完成'},
			{value: 'pending', label: '待办'}
		];
		filterOptions.forEach(option => {
			const opt = document.createElement('option');
			opt.value = option.value;
			opt.textContent = option.label;
			this.filterSelect.appendChild(opt);
		});
		this.filterSelect.addEventListener('change', () => {
			this.renderTodoList(containerEl);
		});

		const createButton = toolbarEl.createEl('button', {
			text: '+ 新建任务',
			cls: 'todo-create-button'
		});
		createButton.addEventListener('click', () => {
			new TodoModal(this.plugin, this, null).open();
		});
	}

	renderStats(containerEl: HTMLElement): void {
		const statsEl = containerEl.createEl('div', {cls: 'todo-stats'});
		const total = this.plugin.todos.length;
		const completed = this.plugin.todos.filter(todo => todo.isCompleted).length;
		const pending = total - completed;
		const highPriority = this.plugin.todos.filter(todo => todo.priority === 'high' && !todo.isCompleted).length;
		const overdue = this.plugin.todos.filter(todo => {
			if (!todo.dueDate || todo.isCompleted) return false;
			return new Date(todo.dueDate) < new Date();
		}).length;

		statsEl.innerHTML = `
			<div class="todo-stat-item">
				<div class="todo-stat-label">总计</div>
				<div class="todo-stat-value">${total}</div>
			</div>
			<div class="todo-stat-item">
				<div class="todo-stat-label">待办</div>
				<div class="todo-stat-value todo-stat-pending">${pending}</div>
			</div>
			<div class="todo-stat-item">
				<div class="todo-stat-label">已完成</div>
				<div class="todo-stat-value todo-stat-completed">${completed}</div>
			</div>
			<div class="todo-stat-item">
				<div class="todo-stat-label">高优先级</div>
				<div class="todo-stat-value todo-stat-high">${highPriority}</div>
			</div>
			<div class="todo-stat-item">
				<div class="todo-stat-label">已过期</div>
				<div class="todo-stat-value todo-stat-overdue">${overdue}</div>
			</div>
		`;
	}

	renderTodoList(containerEl: HTMLElement): void {
		const listEl = containerEl.createEl('div', {cls: 'todo-list'});

		let filteredTodos = this.getFilteredTodos();
		filteredTodos = this.sortTodos(filteredTodos);

		if (filteredTodos.length === 0) {
			this.renderEmptyState(listEl);
			return;
		}

		filteredTodos.forEach(todo => {
			this.renderTodoItem(listEl, todo);
		});
	}

	renderEmptyState(containerEl: HTMLElement): void {
		const emptyEl = containerEl.createEl('div', {cls: 'todo-empty-state'});
		emptyEl.innerHTML = `
			<div class="todo-empty-state-icon">📝</div>
			<div class="todo-empty-state-text">暂无任务</div>
			<div class="todo-empty-state-subtext">点击「新建任务」开始创建</div>
		`;
	}

	renderTodoItem(containerEl: HTMLElement, todo: TodoItem): void {
		const todoEl = containerEl.createEl('div', {cls: `todo-item ${todo.isCompleted ? 'todo-completed' : ''}`});

		const checkbox = todoEl.createEl('input', {
			type: 'checkbox',
			cls: 'todo-checkbox'
		}) as HTMLInputElement;
		checkbox.checked = todo.isCompleted;
		checkbox.addEventListener('change', () => {
			this.plugin.toggleTodo(todo.id);
			this.render();
		});

		const contentEl = todoEl.createEl('div', {cls: 'todo-content'});
		
		const titleEl = contentEl.createEl('div', {text: todo.title, cls: 'todo-title'});
		
		if (todo.description) {
			contentEl.createEl('div', {text: todo.description, cls: 'todo-description'});
		}

		if (todo.tags && todo.tags.length > 0) {
			const tagsEl = contentEl.createEl('div', {cls: 'todo-tags'});
			todo.tags.forEach(tag => {
				const tagEl = tagsEl.createEl('span', {text: `#${tag}`, cls: 'todo-tag'});
				tagEl.addEventListener('click', (e) => {
					e.stopPropagation();
					this.searchInput.value = tag;
					this.render();
				});
			});
		}

		const metaEl = contentEl.createEl('div', {cls: 'todo-meta'});
		
		const priorityLabels = {high: '高', medium: '中', low: '低'};
		metaEl.createEl('span', {text: priorityLabels[todo.priority], cls: `todo-priority todo-priority-${todo.priority}`});
		
		if (todo.dueDate) {
			const dueDate = new Date(todo.dueDate);
			const isOverdue = dueDate < new Date() && !todo.isCompleted;
			const dateText = this.formatDate(dueDate);
			const dateEl = metaEl.createEl('span', {text: `📅 ${dateText}`, cls: `todo-due-date ${isOverdue ? "todo-due-overdue" : ""}`});
		}

		const actionsEl = todoEl.createEl('div', {cls: 'todo-actions'});

		const editButton = actionsEl.createEl('button', {text: '编辑', cls: 'todo-edit-button'});
		editButton.addEventListener('click', () => {
			new TodoModal(this.plugin, this, todo).open();
		});

		const deleteButton = actionsEl.createEl('button', {text: '删除', cls: 'todo-delete-button'});
		deleteButton.addEventListener('click', () => {
			new ConfirmModal(this.plugin.app, '确认删除', '确定要删除这个任务吗？', async () => {
				this.plugin.deleteTodo(todo.id);
				this.render();
			}).open();
		});
	}

	getFilteredTodos(): TodoItem[] {
		let todos = [...this.plugin.todos];
		const searchTerm = this.searchInput.value.toLowerCase();
		const filterValue = this.filterSelect.value;

		if (searchTerm) {
			todos = todos.filter(todo => 
				todo.title.toLowerCase().includes(searchTerm) ||
				(todo.description && todo.description.toLowerCase().includes(searchTerm)) ||
				(todo.tags && todo.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
			);
		}

		if (filterValue === 'completed') {
			todos = todos.filter(todo => todo.isCompleted);
		} else if (filterValue === 'pending') {
			todos = todos.filter(todo => !todo.isCompleted);
		}

		if (filterValue === 'high' || filterValue === 'medium' || filterValue === 'low') {
			todos = todos.filter(todo => todo.priority === filterValue && !todo.isCompleted);
		}

		if (!this.plugin.settings.showCompleted && filterValue !== 'completed') {
			todos = todos.filter(todo => !todo.isCompleted);
		}

		return todos;
	}

	formatDate(date: Date): string {
		const now = new Date();
		const diffTime = date.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return '今天';
		if (diffDays === 1) return '明天';
		if (diffDays === -1) return '昨天';
		if (diffDays < -1) return `${Math.abs(diffDays)}天前`;
		if (diffDays > 0 && diffDays <= 7) return `${diffDays}天后`;
		
		return date.toLocaleDateString('zh-CN', {month: 'short', day: 'numeric'});
	}

	sortTodos(todos: TodoItem[]): TodoItem[] {
		const sorted = [...todos];
		const {sortBy} = this.plugin.settings;

		return sorted.sort((a, b) => {
			switch (sortBy) {
				case 'dueDate':
					if (!a.dueDate) return 1;
					if (!b.dueDate) return -1;
					return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
				case 'priority':
					const priorityOrder = {high: 3, medium: 2, low: 1};
					return priorityOrder[b.priority] - priorityOrder[a.priority];
				case 'createdAt':
				default:
					return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			}
		});
	}
}

class ConfirmModal extends Modal {
	onConfirm: () => void;

	constructor(app: App, title: string, message: string, onConfirm: () => void) {
		super(app);
		this.onConfirm = onConfirm;
		this.titleEl.setText(title);
		this.contentEl.createEl('p', {text: message});
	}

	onOpen(): void {
		const {contentEl} = this;
		const buttonContainer = contentEl.createEl('div', {cls: 'modal-button-container'});

		const confirmButton = buttonContainer.createEl('button', {text: '确认', cls: 'mod-cta'});
		confirmButton.addEventListener('click', () => {
			this.onConfirm();
			this.close();
		});

		const cancelButton = buttonContainer.createEl('button', {text: '取消'});
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}
}

class TodoModal extends Modal {
	plugin: MyPlugin;
	view: TodoView;
	todo: TodoItem | null;
	titleInput: HTMLInputElement;
	descriptionInput: HTMLTextAreaElement;
	prioritySelect: HTMLSelectElement;
	dueDateInput: HTMLInputElement;
	tagsInput: HTMLInputElement;

	constructor(plugin: MyPlugin, view: TodoView, todo: TodoItem | null) {
		super(plugin.app);
		this.plugin = plugin;
		this.view = view;
		this.todo = todo;
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h2', {text: this.todo ? '编辑任务' : '新建任务'});

		const form = contentEl.createEl('form', {cls: 'todo-form'});

		this.titleInput = this.createFormGroup(form, '标题', 'text') as HTMLInputElement;
		this.titleInput.value = this.todo?.title || '';
		this.titleInput.placeholder = '输入任务标题...';
		this.titleInput.required = true;

		this.descriptionInput = this.createFormGroup(form, '描述', 'textarea') as HTMLTextAreaElement;
		this.descriptionInput.value = this.todo?.description || '';
		this.descriptionInput.placeholder = '添加详细描述（可选）...';
		this.descriptionInput.rows = 4;

		this.prioritySelect = this.createFormGroup(form, '优先级', 'select') as HTMLSelectElement;
		const priorities: TodoPriority[] = ['low', 'medium', 'high'];
		const priorityLabels = {low: '低', medium: '中', high: '高'};
		priorities.forEach(priority => {
			const option = document.createElement('option');
			option.value = priority;
			option.textContent = priorityLabels[priority];
			if (this.todo?.priority === priority || (!this.todo && priority === this.plugin.settings.defaultPriority)) {
				option.selected = true;
			}
			this.prioritySelect.appendChild(option);
		});

		this.dueDateInput = this.createFormGroup(form, '截止日期', 'date') as HTMLInputElement;
		if (this.todo?.dueDate) {
			this.dueDateInput.value = this.todo.dueDate;
		} else {
			this.dueDateInput.valueAsDate = new Date();
		}

		this.tagsInput = this.createFormGroup(form, '标签', 'text') as HTMLInputElement;
		this.tagsInput.value = this.todo?.tags?.join(', ') || '';
		this.tagsInput.placeholder = '用逗号分隔多个标签（可选）...';

		const buttonContainer = form.createEl('div', {cls: 'todo-form-actions'});

		const saveButton = buttonContainer.createEl('button', {text: '保存', type: 'submit', cls: 'todo-save-button'});
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			this.saveTodo();
		});

		const cancelButton = buttonContainer.createEl('button', {text: '取消', type: 'button', cls: 'todo-cancel-button'});
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	createFormGroup(form: HTMLFormElement, labelText: string, inputType: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
		const groupEl = form.createEl('div', {cls: 'todo-form-group'});
		groupEl.createEl('label', {text: labelText});

		let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
		if (inputType === 'textarea') {
			input = groupEl.createEl('textarea', {cls: 'todo-input'});
		} else if (inputType === 'select') {
			input = groupEl.createEl('select', {cls: 'todo-input'});
		} else {
			input = groupEl.createEl('input', {
				type: inputType,
				cls: 'todo-input'
			});
		}

		return input;
	}

	saveTodo(): void {
		const title = this.titleInput.value.trim();
		if (!title) {
			new Notice('标题不能为空');
			return;
		}

		const now = new Date().toISOString();
		const tags = this.tagsInput.value
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);

		const todoData: TodoItem = {
			id: this.todo?.id || now + Math.random().toString(36).substr(2, 9),
			title: title,
			description: this.descriptionInput.value.trim(),
			priority: this.prioritySelect.value as TodoPriority,
			dueDate: this.dueDateInput.value,
			isCompleted: this.todo?.isCompleted || false,
			tags: tags,
			createdAt: this.todo?.createdAt || now,
			updatedAt: now
		};

		if (this.todo) {
			this.plugin.updateTodo(todoData);
			new Notice('任务已更新');
		} else {
			this.plugin.addTodo(todoData);
			new Notice('任务已创建');
		}

		this.view.render();
		this.close();
	}
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	todos: TodoItem[] = [];

	async onload() {
		await this.loadSettings();
		await this.loadTodos();

		this.registerView(
			VIEW_TYPE_TODO,
			(leaf) => new TodoView(leaf, this)
		);

		this.addRibbonIcon('check-square', '待办事项', (evt: MouseEvent) => {
			this.openTodoView();
		});

		this.addCommand({
			id: 'open-todo-view',
			name: '打开待办事项',
			callback: () => {
				this.openTodoView();
			}
		});

		this.addCommand({
			id: 'create-quick-task',
			name: '快速创建任务',
			callback: () => {
				this.openTodoView();
				setTimeout(() => {
					const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO);
					if (leaves.length > 0) {
						const view = leaves[0]?.view as TodoView;
						if (view) {
							new TodoModal(this, view, null).open();
						}
					}
				}, 100);
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TODO);
	}

	async openTodoView() {
		const {workspace} = this.app;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TODO);

		if (leaves.length > 0) {
			const leaf = leaves[0];
			if (leaf) {
				workspace.revealLeaf(leaf);
			}
		} else {
			const leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_TODO
				});
				workspace.revealLeaf(leaf);
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData({
			...this.settings,
			todos: this.todos
		});
	}

	async loadTodos() {
		const saved = await this.loadData() as any;
		if (saved && Array.isArray(saved.todos)) {
			this.todos = saved.todos;
		} else {
			this.todos = [];
		}
	}

	async saveTodos() {
		await this.saveData({
			...this.settings,
			todos: this.todos
		});
	}

	async addTodo(todo: TodoItem) {
		this.todos.push(todo);
		await this.saveTodos();
	}

	async updateTodo(todo: TodoItem) {
		const index = this.todos.findIndex(t => t.id === todo.id);
		if (index !== -1) {
			this.todos[index] = todo;
			await this.saveTodos();
		}
	}

	async deleteTodo(id: string) {
		this.todos = this.todos.filter(todo => todo.id !== id);
		await this.saveTodos();
		new Notice('任务已删除');
	}

	async toggleTodo(id: string) {
		const todo = this.todos.find(t => t.id === id);
		if (todo) {
			todo.isCompleted = !todo.isCompleted;
			todo.updatedAt = new Date().toISOString();
			await this.saveTodos();
		}
	}
}

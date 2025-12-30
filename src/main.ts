import {App, Modal, Notice, Plugin, WorkspaceLeaf, ItemView} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab, TodoItem, TodoPriority} from "./settings";

// 视图类型常量
export const VIEW_TYPE_TODO = 'todo-view';

// TODO视图组件
export class TodoView extends ItemView {
	plugin: MyPlugin;

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

	// 渲染TODO列表
	render(): void {
		const {contentEl} = this;
		contentEl.empty();

		// 添加标题
		contentEl.createEl('h2', {text: '待办事项'});

		// 添加创建新任务按钮
		const createButton = contentEl.createEl('button', {
			text: '新建任务',
			cls: 'todo-create-button'
		});
		createButton.addEventListener('click', () => {
			new TodoModal(this.plugin, this, null).open();
		});

		// 添加统计信息
		this.renderStats(contentEl);

		// 添加TODO列表
		this.renderTodoList(contentEl);
	}

	// 渲染统计信息
	renderStats(containerEl: HTMLElement): void {
		const statsEl = containerEl.createEl('div', {cls: 'todo-stats'});
		const total = this.plugin.todos.length;
		const completed = this.plugin.todos.filter(todo => todo.isCompleted).length;
		const pending = total - completed;
		const highPriority = this.plugin.todos.filter(todo => todo.priority === 'high' && !todo.isCompleted).length;

		statsEl.createEl('div', {text: `总计: ${total} | 待办: ${pending} | 已完成: ${completed} | 高优先级: ${highPriority}`, cls: 'todo-stats-text'});
	}

	// 渲染TODO列表
	renderTodoList(containerEl: HTMLElement): void {
		const listEl = containerEl.createEl('div', {cls: 'todo-list'});

		// 根据设置过滤和排序任务
		let filteredTodos = this.plugin.todos;
		if (!this.plugin.settings.showCompleted) {
			filteredTodos = filteredTodos.filter(todo => !todo.isCompleted);
		}

		// 排序
		filteredTodos = this.sortTodos(filteredTodos);

		// 渲染每个任务
		filteredTodos.forEach(todo => {
			const todoEl = listEl.createEl('div', {cls: `todo-item ${todo.isCompleted ? 'todo-completed' : ''}`});

			// 任务复选框
			const checkbox = todoEl.createEl('input', {
				type: 'checkbox',
				cls: 'todo-checkbox'
			}) as HTMLInputElement;
			checkbox.checked = todo.isCompleted;
			checkbox.addEventListener('change', () => {
				this.plugin.toggleTodo(todo.id);
				this.render();
			});

			// 任务内容
			const contentEl = todoEl.createEl('div', {cls: 'todo-content'});
			contentEl.createEl('div', {text: todo.title, cls: 'todo-title'});
			if (todo.description) {
				contentEl.createEl('div', {text: todo.description, cls: 'todo-description'});
			}

			// 任务元信息
			const metaEl = contentEl.createEl('div', {cls: 'todo-meta'});
			metaEl.createEl('span', {text: todo.priority.toUpperCase(), cls: `todo-priority todo-priority-${todo.priority}`});
			if (todo.dueDate) {
				metaEl.createEl('span', {text: `Due: ${todo.dueDate}`, cls: 'todo-due-date'});
			}

			// 操作按钮
			const actionsEl = todoEl.createEl('div', {cls: 'todo-actions'});

			// 编辑按钮
				const editButton = actionsEl.createEl('button', {text: '编辑', cls: 'todo-edit-button'});
				editButton.addEventListener('click', () => {
					new TodoModal(this.plugin, this, todo).open();
				});

				// 删除按钮
				const deleteButton = actionsEl.createEl('button', {text: '删除', cls: 'todo-delete-button'});
				deleteButton.addEventListener('click', () => {
					this.plugin.deleteTodo(todo.id);
					this.render();
				});
		});
	}

	// 排序TODO任务
	sortTodos(todos: TodoItem[]): TodoItem[] {
		const sorted = [...todos];
		const {sortBy} = this.plugin.settings;

		return sorted.sort((a, b) => {
			switch (sortBy) {
				case 'dueDate':
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

// TODO编辑模态框
class TodoModal extends Modal {
	plugin: MyPlugin;
	view: TodoView;
	todo: TodoItem | null;
	titleInput: HTMLInputElement;
	descriptionInput: HTMLTextAreaElement;
	prioritySelect: HTMLSelectElement;
	dueDateInput: HTMLInputElement;

	constructor(plugin: MyPlugin, view: TodoView, todo: TodoItem | null) {
		super(plugin.app);
		this.plugin = plugin;
		this.view = view;
		this.todo = todo;
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.empty();

		// 添加标题
		contentEl.createEl('h2', {text: this.todo ? '编辑任务' : '新建任务'});

		// 创建表单
		const form = contentEl.createEl('form', {cls: 'todo-form'});

		// 标题输入
		this.titleInput = this.createFormGroup(form, '标题', 'text') as HTMLInputElement;
		this.titleInput.value = this.todo?.title || '';

		// 描述输入
		this.descriptionInput = this.createFormGroup(form, '描述', 'textarea') as HTMLTextAreaElement;
		this.descriptionInput.value = this.todo?.description || '';

		// 优先级选择
		this.prioritySelect = this.createFormGroup(form, '优先级', 'select') as HTMLSelectElement;
		const priorities: TodoPriority[] = ['low', 'medium', 'high'];
		const priorityLabels = {low: '低', medium: '中', high: '高'};
		priorities.forEach(priority => {
			const option = document.createElement('option');
			option.value = priority;
			option.textContent = priorityLabels[priority];
			if (this.todo?.priority === priority) {
				option.selected = true;
			}
			this.prioritySelect.appendChild(option);
		});

		// 截止日期输入
		this.dueDateInput = this.createFormGroup(form, '截止日期', 'date') as HTMLInputElement;
		if (this.todo?.dueDate) {
			this.dueDateInput.value = this.todo.dueDate;
		} else {
			// 默认设置为今天
			this.dueDateInput.valueAsDate = new Date();
		}

		// 保存按钮
		const saveButton = form.createEl('button', {text: '保存', type: 'submit', cls: 'todo-save-button'});
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			this.saveTodo();
		});

		// 取消按钮
		const cancelButton = form.createEl('button', {text: '取消', type: 'button', cls: 'todo-cancel-button'});
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	// 创建表单组
	createFormGroup(form: HTMLFormElement, labelText: string, inputType: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
		const groupEl = form.createEl('div', {cls: 'todo-form-group'});
		groupEl.createEl('label', {text: labelText});

		let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
		if (inputType === 'textarea') {
			input = groupEl.createEl('textarea', {cls: 'todo-input'});
			(input as HTMLTextAreaElement).rows = 3;
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

	// 保存TODO任务
	saveTodo(): void {
		const title = this.titleInput.value.trim();
		if (!title) {
			new Notice('标题不能为空');
			return;
		}

		const now = new Date().toISOString();
		const todoData: TodoItem = {
			id: this.todo?.id || now + Math.random().toString(36).substr(2, 9),
			title: title,
			description: this.descriptionInput.value.trim(),
			priority: this.prioritySelect.value as TodoPriority,
			dueDate: this.dueDateInput.value,
			isCompleted: this.todo?.isCompleted || false,
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

// 主插件类
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	todos: TodoItem[] = [];

	async onload() {
		await this.loadSettings();
		await this.loadTodos();

		// 注册视图
		this.registerView(
			VIEW_TYPE_TODO,
			(leaf) => new TodoView(leaf, this)
		);

		// 添加侧边栏图标
		this.addRibbonIcon('check-square', '待办事项', (evt: MouseEvent) => {
			this.openTodoView();
		});

		// 添加命令
		this.addCommand({
			id: 'open-todo-view',
			name: '打开待办事项',
			callback: () => {
				this.openTodoView();
			}
		});

		// 添加设置页面
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TODO);
	}

	// 打开TODO视图
	async openTodoView() {
		const {workspace} = this.app;

		// 检查是否已存在TODO视图
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TODO);

		if (leaves.length > 0) {
			// 已有视图，激活它
			const leaf = leaves[0];
			if (leaf) {
				workspace.revealLeaf(leaf);
			}
		} else {
			// 没有视图，创建新视图
			const leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_TODO
				});
				workspace.revealLeaf(leaf);
			}
		}
	}

	// 加载设置
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	// 保存设置
	async saveSettings() {
		await this.saveData({
			...this.settings,
			todos: this.todos
		});
	}

	// 加载TODO任务
	async loadTodos() {
		const saved = await this.loadData() as any;
		if (saved && Array.isArray(saved.todos)) {
			this.todos = saved.todos;
		} else {
			this.todos = [];
		}
	}

	// 保存TODO任务
	async saveTodos() {
		await this.saveData({
			...this.settings,
			todos: this.todos
		});
	}

	// 添加TODO任务
	async addTodo(todo: TodoItem) {
		this.todos.push(todo);
		await this.saveTodos();
	}

	// 更新TODO任务
	async updateTodo(todo: TodoItem) {
		const index = this.todos.findIndex(t => t.id === todo.id);
		if (index !== -1) {
			this.todos[index] = todo;
			await this.saveTodos();
		}
	}

	// 删除TODO任务
	async deleteTodo(id: string) {
		this.todos = this.todos.filter(todo => todo.id !== id);
		await this.saveTodos();
		new Notice('任务已删除');
	}

	// 切换TODO任务状态
	async toggleTodo(id: string) {
		const todo = this.todos.find(t => t.id === id);
		if (todo) {
			todo.isCompleted = !todo.isCompleted;
			todo.updatedAt = new Date().toISOString();
			await this.saveTodos();
		}
	}
}

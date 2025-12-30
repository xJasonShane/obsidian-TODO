import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

// TODO任务的优先级类型
export type TodoPriority = 'low' | 'medium' | 'high';

// TODO任务的数据结构
export interface TodoItem {
	id: string;
	title: string;
	description: string;
	priority: TodoPriority;
	dueDate: string;
	isCompleted: boolean;
	createdAt: string;
	updatedAt: string;
}

// 插件设置数据结构
export interface MyPluginSettings {
	showCompleted: boolean;
	sortBy: 'createdAt' | 'dueDate' | 'priority';
}

// 默认设置
export const DEFAULT_SETTINGS: MyPluginSettings = {
	showCompleted: true,
	sortBy: 'createdAt'
}

// 设置页面
export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// 添加设置标题
		containerEl.createEl('h2', {text: 'TODO Plugin Settings'});

		// 显示已完成任务设置
		new Setting(containerEl)
			.setName('Show Completed Tasks')
			.setDesc('Whether to show completed tasks in the list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCompleted)
				.onChange(async (value) => {
					this.plugin.settings.showCompleted = value;
					await this.plugin.saveSettings();
				}));

		// 排序方式设置
		new Setting(containerEl)
			.setName('Sort By')
			.setDesc('How to sort the tasks')
			.addDropdown(dropdown => dropdown
				.addOption('createdAt', 'Created Date')
				.addOption('dueDate', 'Due Date')
				.addOption('priority', 'Priority')
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value) => {
					this.plugin.settings.sortBy = value as 'createdAt' | 'dueDate' | 'priority';
					await this.plugin.saveSettings();
				}));
	}
}

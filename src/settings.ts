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
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

// 插件设置数据结构
export interface MyPluginSettings {
	showCompleted: boolean;
	sortBy: 'createdAt' | 'dueDate' | 'priority';
	filterPriority: 'all' | 'high' | 'medium' | 'low';
	filterTag: string;
	defaultPriority: TodoPriority;
}

// 默认设置
export const DEFAULT_SETTINGS: MyPluginSettings = {
	showCompleted: true,
	sortBy: 'createdAt',
	filterPriority: 'all',
	filterTag: '',
	defaultPriority: 'medium'
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
			containerEl.createEl('h2', {text: '待办事项插件设置'});

			// 显示已完成任务设置
			new Setting(containerEl)
				.setName('显示已完成任务')
				.setDesc('是否在列表中显示已完成的任务')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showCompleted)
					.onChange(async (value) => {
						this.plugin.settings.showCompleted = value;
						await this.plugin.saveSettings();
					}));

			// 排序方式设置
			new Setting(containerEl)
				.setName('排序方式')
				.setDesc('任务的排序方式')
				.addDropdown(dropdown => dropdown
					.addOption('createdAt', '创建时间')
					.addOption('dueDate', '截止日期')
					.addOption('priority', '优先级')
					.setValue(this.plugin.settings.sortBy)
					.onChange(async (value) => {
						this.plugin.settings.sortBy = value as 'createdAt' | 'dueDate' | 'priority';
						await this.plugin.saveSettings();
					}));

			// 默认优先级设置
			new Setting(containerEl)
				.setName('默认优先级')
				.setDesc('创建新任务时的默认优先级')
				.addDropdown(dropdown => dropdown
					.addOption('low', '低')
					.addOption('medium', '中')
					.addOption('high', '高')
					.setValue(this.plugin.settings.defaultPriority)
					.onChange(async (value) => {
						this.plugin.settings.defaultPriority = value as TodoPriority;
						await this.plugin.saveSettings();
					}));
		}
}

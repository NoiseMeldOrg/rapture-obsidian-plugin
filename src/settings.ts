import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import type RaptureSyncPlugin from './main';

export interface RaptureSettings {
	// OAuth tokens (stored securely in plugin data)
	accessToken: string;
	refreshToken: string;
	tokenExpiry: number;
	userEmail: string;

	// Sync settings
	destinationFolder: string;
	syncIntervalMinutes: number;
	syncOnVaultOpen: boolean;

	// Status
	lastSyncTimestamp: number;
}

export const DEFAULT_SETTINGS: RaptureSettings = {
	accessToken: '',
	refreshToken: '',
	tokenExpiry: 0,
	userEmail: '',

	destinationFolder: 'Rapture/',
	syncIntervalMinutes: 5,
	syncOnVaultOpen: true,

	lastSyncTimestamp: 0,
};

export class RaptureSettingTab extends PluginSettingTab {
	plugin: RaptureSyncPlugin;
	private syncButton: ButtonComponent | null = null;

	constructor(app: App, plugin: RaptureSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('rapture-sync-settings');

		containerEl.createEl('h2', { text: 'Rapture Sync Settings' });

		// Google Account Section
		containerEl.createEl('h3', { text: 'Google Account' });

		if (this.plugin.oauthManager.isAuthenticated()) {
			// Show connected account
			const accountDiv = containerEl.createDiv({ cls: 'rapture-sync-account' });
			accountDiv.createSpan({ text: 'Connected as: ' });
			accountDiv.createSpan({
				text: this.plugin.settings.userEmail || 'Unknown',
				cls: 'rapture-sync-account-email'
			});

			new Setting(containerEl)
				.setName('Sign out')
				.setDesc('Disconnect your Google account')
				.addButton(button => button
					.setButtonText('Sign Out')
					.onClick(async () => {
						await this.plugin.oauthManager.signOut();
						this.display(); // Refresh settings UI
					}));
		} else {
			// Show connect button
			new Setting(containerEl)
				.setName('Connect Google Account')
				.setDesc('Sign in with Google to sync your Rapture notes')
				.addButton(button => button
					.setButtonText('Connect')
					.setCta()
					.onClick(async () => {
						await this.plugin.oauthManager.startAuthFlow();
					}));
		}

		// Destination Folder
		containerEl.createEl('h3', { text: 'Sync Settings' });

		new Setting(containerEl)
			.setName('Destination folder')
			.setDesc('Where to save synced Rapture notes in your vault')
			.addText(text => text
				.setPlaceholder('Rapture/')
				.setValue(this.plugin.settings.destinationFolder)
				.onChange(async (value) => {
					this.plugin.settings.destinationFolder = value || 'Rapture/';
					await this.plugin.saveSettings();
				}));

		// Sync Interval
		new Setting(containerEl)
			.setName('Sync interval')
			.setDesc('How often to check for new Rapture notes')
			.addDropdown(dropdown => dropdown
				.addOption('1', '1 minute')
				.addOption('5', '5 minutes')
				.addOption('10', '10 minutes')
				.addOption('15', '15 minutes')
				.addOption('30', '30 minutes')
				.setValue(String(this.plugin.settings.syncIntervalMinutes))
				.onChange(async (value) => {
					this.plugin.settings.syncIntervalMinutes = parseInt(value);
					await this.plugin.saveSettings();
				}));

		// Sync on Vault Open
		new Setting(containerEl)
			.setName('Sync on vault open')
			.setDesc('Automatically sync when you open your vault')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.syncOnVaultOpen)
				.onChange(async (value) => {
					this.plugin.settings.syncOnVaultOpen = value;
					await this.plugin.saveSettings();
				}));

		// Manual Sync
		containerEl.createEl('h3', { text: 'Sync Status' });

		new Setting(containerEl)
			.setName('Sync now')
			.setDesc('Manually trigger a sync')
			.addButton(button => {
				this.syncButton = button;
				button
					.setButtonText('Sync Now')
					.onClick(async () => {
						button.setButtonText('Syncing...');
						button.setDisabled(true);
						try {
							await this.plugin.manualSync();
						} finally {
							button.setButtonText('Sync Now');
							button.setDisabled(false);
							this.updateLastSyncDisplay();
						}
					});
			});

		// Last Sync Status
		const statusDiv = containerEl.createDiv({ cls: 'rapture-sync-status' });
		this.updateLastSyncDisplay(statusDiv);
	}

	private updateLastSyncDisplay(container?: HTMLElement) {
		const statusDiv = container || this.containerEl.querySelector('.rapture-sync-status');
		if (!statusDiv) return;

		statusDiv.empty();

		if (this.plugin.settings.lastSyncTimestamp > 0) {
			const lastSync = new Date(this.plugin.settings.lastSyncTimestamp);
			const timeAgo = this.getTimeAgo(lastSync);
			statusDiv.createSpan({
				text: `Last synced: ${timeAgo}`,
				cls: 'rapture-sync-status-text'
			});
		} else {
			statusDiv.createSpan({
				text: 'Never synced',
				cls: 'rapture-sync-status-text'
			});
		}
	}

	private getTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) {
			return 'just now';
		} else if (diffMins < 60) {
			return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		} else {
			return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
		}
	}
}

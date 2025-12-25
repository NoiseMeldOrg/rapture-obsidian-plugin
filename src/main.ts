import { Notice, Plugin, ObsidianProtocolData } from 'obsidian';
import { RaptureSettings, DEFAULT_SETTINGS, RaptureSettingTab } from './settings';
import { SyncEngine, SyncResult } from './syncEngine';
import { DriveApi } from './driveApi';
import { OAuthManager } from './oauth';

export default class RaptureSyncPlugin extends Plugin {
	settings: RaptureSettings;
	syncEngine: SyncEngine;
	driveApi: DriveApi;
	oauthManager: OAuthManager;
	private syncIntervalId: number | null = null;

	async onload() {
		console.log('Loading Rapture Inbox plugin');

		await this.loadSettings();

		// Initialize OAuth manager
		this.oauthManager = new OAuthManager(this);

		// Initialize Drive API
		this.driveApi = new DriveApi(this.oauthManager);

		// Initialize sync engine
		this.syncEngine = new SyncEngine(this.app, this.driveApi, this.settings);

		// Register settings tab
		this.addSettingTab(new RaptureSettingTab(this.app, this));

		// Register protocol handler for OAuth redirect
		this.registerObsidianProtocolHandler('rapture-inbox', async (params) => {
			await this.handleOAuthCallback(params);
		});

		// Register command palette commands
		this.addCommand({
			id: 'sync-now',
			name: 'Sync now',
			callback: async () => {
				await this.manualSync();
			}
		});

		this.addCommand({
			id: 'open-settings',
			name: 'Open settings',
			callback: () => {
				// Open settings tab
				const setting = (this.app as any).setting;
				if (setting) {
					setting.open();
					setting.openTabById(this.manifest.id);
				}
			}
		});

		// Set up polling sync if configured
		this.setupPollingSync();

		// Hook into workspace ready for on-vault-open sync
		this.app.workspace.onLayoutReady(async () => {
			if (this.settings.syncOnVaultOpen && this.oauthManager.isAuthenticated()) {
				await this.syncEngine.syncNow();
			}
		});
	}

	onunload() {
		console.log('Unloading Rapture Inbox plugin');
		this.clearPollingSync();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update sync engine with new settings
		if (this.syncEngine) {
			this.syncEngine.updateSettings(this.settings);
		}
		// Restart polling with new interval
		this.setupPollingSync();
	}

	private setupPollingSync() {
		this.clearPollingSync();

		if (!this.oauthManager?.isAuthenticated()) {
			return;
		}

		const intervalMs = this.settings.syncIntervalMinutes * 60 * 1000;
		this.syncIntervalId = window.setInterval(async () => {
			await this.syncEngine.syncNow();
		}, intervalMs);

		this.registerInterval(this.syncIntervalId);
	}

	private clearPollingSync() {
		if (this.syncIntervalId !== null) {
			window.clearInterval(this.syncIntervalId);
			this.syncIntervalId = null;
		}
	}

	private async handleOAuthCallback(params: ObsidianProtocolData) {
		const error = params['error'];
		const code = params['code'];

		if (error) {
			new Notice(`Authentication failed: ${error}`);
			return;
		}

		if (code) {
			try {
				await this.oauthManager.exchangeCodeForTokens(code);
				new Notice('Successfully connected to Google Drive!');
				this.setupPollingSync();
			} catch (err) {
				new Notice(`Failed to complete authentication: ${err}`);
			}
		}
	}

	async manualSync(): Promise<SyncResult> {
		if (!this.oauthManager.isAuthenticated()) {
			new Notice('Please connect your Google account first');
			return { success: false, filesDownloaded: 0, errors: ['Not authenticated'] };
		}

		new Notice('Syncing Rapture notes...');
		const result = await this.syncEngine.syncNow();

		if (result.success) {
			if (result.filesDownloaded > 0) {
				new Notice(`Synced ${result.filesDownloaded} new Rapture note${result.filesDownloaded > 1 ? 's' : ''}`);
			} else {
				new Notice('No new Rapture notes to sync');
			}
			// Update last sync time
			this.settings.lastSyncTimestamp = Date.now();
			await this.saveSettings();
		} else {
			new Notice(`Sync failed: ${result.errors.join(', ')}`);
		}

		return result;
	}
}

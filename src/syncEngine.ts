import { App, Notice, TFolder, normalizePath } from 'obsidian';
import type { DriveApi, DriveFile } from './driveApi';
import type { RaptureSettings } from './settings';

export interface SyncResult {
	success: boolean;
	filesDownloaded: number;
	errors: string[];
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export class SyncEngine {
	private app: App;
	private driveApi: DriveApi;
	private settings: RaptureSettings;
	private status: SyncStatus = 'idle';

	constructor(app: App, driveApi: DriveApi, settings: RaptureSettings) {
		this.app = app;
		this.driveApi = driveApi;
		this.settings = settings;
	}

	updateSettings(settings: RaptureSettings): void {
		this.settings = settings;
	}

	getStatus(): SyncStatus {
		return this.status;
	}

	async syncNow(): Promise<SyncResult> {
		if (this.status === 'syncing') {
			return {
				success: false,
				filesDownloaded: 0,
				errors: ['Sync already in progress'],
			};
		}

		this.status = 'syncing';
		const result: SyncResult = {
			success: true,
			filesDownloaded: 0,
			errors: [],
		};

		try {
			// Find the Rapture/Obsidian folder
			const folderId = await this.driveApi.findRaptureFolder();
			if (!folderId) {
				result.success = true; // Not an error, just no folder yet
				this.status = 'idle';
				return result;
			}

			// List files in folder
			const files = await this.driveApi.listFilesInFolder(folderId);
			if (files.length === 0) {
				this.status = 'idle';
				return result;
			}

			// Ensure destination folder exists
			await this.ensureDestinationFolder();

			// Process each file
			for (const file of files) {
				try {
					const downloaded = await this.downloadAndSaveFile(file);
					if (downloaded) {
						// Delete from Drive after successful download (mailbox pattern)
						const deleted = await this.driveApi.deleteFile(file.id);
						if (deleted) {
							result.filesDownloaded++;
						} else {
							result.errors.push(`Failed to delete ${file.name} from Drive`);
						}
					}
				} catch (error) {
					result.errors.push(`Failed to process ${file.name}: ${error}`);
				}
			}

			if (result.errors.length > 0) {
				result.success = result.filesDownloaded > 0;
			}

		} catch (error) {
			result.success = false;
			result.errors.push(`Sync failed: ${error}`);
			this.status = 'error';
			return result;
		}

		this.status = 'idle';
		return result;
	}

	private async ensureDestinationFolder(): Promise<void> {
		const folderPath = normalizePath(this.settings.destinationFolder);

		// Check if folder exists
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			// Create folder (and any parent folders)
			await this.app.vault.createFolder(folderPath);
		}
	}

	private async downloadAndSaveFile(file: DriveFile): Promise<boolean> {
		try {
			// Download file content
			const content = await this.driveApi.downloadFile(file.id);

			// Determine vault path
			const destFolder = normalizePath(this.settings.destinationFolder);
			let filePath = normalizePath(`${destFolder}/${file.name}`);

			// Handle duplicate filenames
			filePath = await this.resolveFilePath(filePath);

			// Create file in vault
			await this.app.vault.create(filePath, content);

			return true;
		} catch (error) {
			console.error(`Error downloading file ${file.name}:`, error);
			throw error;
		}
	}

	private async resolveFilePath(originalPath: string): Promise<string> {
		const existingFile = this.app.vault.getAbstractFileByPath(originalPath);
		if (!existingFile) {
			return originalPath;
		}

		// File exists, append timestamp
		const timestamp = Date.now();
		const parts = originalPath.split('.');
		const ext = parts.pop();
		const basePath = parts.join('.');

		return `${basePath}-${timestamp}.${ext}`;
	}
}

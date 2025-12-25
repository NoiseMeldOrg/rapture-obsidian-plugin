import { requestUrl } from 'obsidian';
import type { OAuthManager } from './oauth';

export interface DriveFile {
	id: string;
	name: string;
	mimeType: string;
	modifiedTime: string;
}

export interface DriveApiError {
	code: number;
	message: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export class DriveApi {
	private oauthManager: OAuthManager;

	constructor(oauthManager: OAuthManager) {
		this.oauthManager = oauthManager;
	}

	private async getAuthHeaders(): Promise<Record<string, string>> {
		const token = await this.oauthManager.getAccessToken();
		return {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		};
	}

	async findRaptureFolder(): Promise<string | null> {
		try {
			const headers = await this.getAuthHeaders();

			// First, find the "Rapture" folder
			const raptureQuery = encodeURIComponent(
				"name = 'Rapture' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
			);

			const raptureResponse = await requestUrl({
				url: `${DRIVE_API_BASE}/files?q=${raptureQuery}&fields=files(id,name)`,
				headers,
			});

			if (raptureResponse.status !== 200) {
				throw new Error(`Failed to find Rapture folder: ${raptureResponse.status}`);
			}

			const raptureFiles = raptureResponse.json.files;
			if (!raptureFiles || raptureFiles.length === 0) {
				return null;
			}

			const raptureFolderId = raptureFiles[0].id;

			// Now find "Obsidian" folder inside Rapture
			const obsidianQuery = encodeURIComponent(
				`name = 'Obsidian' and '${raptureFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
			);

			const obsidianResponse = await requestUrl({
				url: `${DRIVE_API_BASE}/files?q=${obsidianQuery}&fields=files(id,name)`,
				headers,
			});

			if (obsidianResponse.status !== 200) {
				throw new Error(`Failed to find Obsidian folder: ${obsidianResponse.status}`);
			}

			const obsidianFiles = obsidianResponse.json.files;
			if (!obsidianFiles || obsidianFiles.length === 0) {
				return null;
			}

			return obsidianFiles[0].id;
		} catch (error) {
			console.error('Error finding Rapture folder:', error);
			return null;
		}
	}

	async listFilesInFolder(folderId: string): Promise<DriveFile[]> {
		try {
			const headers = await this.getAuthHeaders();

			const query = encodeURIComponent(
				`'${folderId}' in parents and mimeType = 'text/markdown' and trashed = false`
			);

			const response = await requestUrl({
				url: `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc`,
				headers,
			});

			if (response.status === 401) {
				// Token expired, trigger refresh and retry
				await this.oauthManager.refreshAccessToken();
				return this.listFilesInFolder(folderId);
			}

			if (response.status !== 200) {
				throw new Error(`Failed to list files: ${response.status}`);
			}

			return response.json.files || [];
		} catch (error) {
			console.error('Error listing files:', error);
			throw error;
		}
	}

	async downloadFile(fileId: string): Promise<string> {
		try {
			const headers = await this.getAuthHeaders();

			const response = await requestUrl({
				url: `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
				headers,
			});

			if (response.status === 401) {
				await this.oauthManager.refreshAccessToken();
				return this.downloadFile(fileId);
			}

			if (response.status === 404) {
				throw new Error('File not found');
			}

			if (response.status !== 200) {
				throw new Error(`Failed to download file: ${response.status}`);
			}

			return response.text;
		} catch (error) {
			console.error('Error downloading file:', error);
			throw error;
		}
	}

	async deleteFile(fileId: string): Promise<boolean> {
		try {
			const headers = await this.getAuthHeaders();

			const response = await requestUrl({
				url: `${DRIVE_API_BASE}/files/${fileId}`,
				method: 'DELETE',
				headers,
			});

			if (response.status === 401) {
				await this.oauthManager.refreshAccessToken();
				return this.deleteFile(fileId);
			}

			if (response.status === 404) {
				// File already deleted, consider success
				return true;
			}

			// DELETE returns 204 No Content on success
			return response.status === 204 || response.status === 200;
		} catch (error) {
			console.error('Error deleting file:', error);
			return false;
		}
	}
}

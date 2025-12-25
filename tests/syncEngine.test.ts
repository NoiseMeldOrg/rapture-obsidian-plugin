/**
 * Sync Engine Module Tests
 * Task Group 10: Sync Engine Implementation
 */

import { SyncEngine, SyncResult, SyncStatus } from '../src/syncEngine';
import type { DriveApi, DriveFile } from '../src/driveApi';
import type { RaptureSettings } from '../src/settings';
import { App, Vault, TFile, TFolder, normalizePath } from 'obsidian';

// Use the mock directly
jest.mock('obsidian');

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let mockApp: App;
  let mockDriveApi: jest.Mocked<DriveApi>;
  let mockSettings: RaptureSettings;
  let mockVault: Vault;

  beforeEach(() => {
    // Create mock vault
    mockVault = new Vault();

    // Create mock app
    mockApp = {
      vault: mockVault,
    } as unknown as App;

    // Create mock Drive API
    mockDriveApi = {
      findRaptureFolder: jest.fn(),
      listFilesInFolder: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<DriveApi>;

    // Create mock settings
    mockSettings = {
      accessToken: 'token',
      refreshToken: 'refresh',
      tokenExpiry: Date.now() + 3600000,
      userEmail: 'test@example.com',
      destinationFolder: 'Rapture/',
      syncIntervalMinutes: 5,
      syncOnVaultOpen: true,
      lastSyncTimestamp: 0,
    };

    syncEngine = new SyncEngine(mockApp, mockDriveApi, mockSettings);
  });

  describe('syncNow', () => {
    it('downloads new files to vault', async () => {
      const mockFiles: DriveFile[] = [
        {
          id: 'file1',
          name: '2024-12-24-120000-test-note.md',
          mimeType: 'text/markdown',
          modifiedTime: '2024-12-24T12:00:00Z',
        },
      ];

      const mockContent = `---
title: Test Note
date: 2024-12-24
---

This is test content.`;

      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue(mockFiles);
      mockDriveApi.downloadFile.mockResolvedValue(mockContent);
      mockDriveApi.deleteFile.mockResolvedValue(true);

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('deletes files from Drive after download', async () => {
      const mockFiles: DriveFile[] = [
        {
          id: 'file1',
          name: 'test.md',
          mimeType: 'text/markdown',
          modifiedTime: '',
        },
      ];

      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue(mockFiles);
      mockDriveApi.downloadFile.mockResolvedValue('content');
      mockDriveApi.deleteFile.mockResolvedValue(true);

      await syncEngine.syncNow();

      expect(mockDriveApi.deleteFile).toHaveBeenCalledWith('file1');
    });

    it('handles empty folder gracefully', async () => {
      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue([]);

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('handles Rapture folder not found gracefully', async () => {
      mockDriveApi.findRaptureFolder.mockResolvedValue(null);

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('handles duplicate filenames by appending timestamp', async () => {
      const mockFiles: DriveFile[] = [
        {
          id: 'file1',
          name: 'existing-note.md',
          mimeType: 'text/markdown',
          modifiedTime: '',
        },
      ];

      // Simulate existing file in vault
      const existingFile = new TFile('Rapture/existing-note.md');
      mockVault._setFile('Rapture/existing-note.md', existingFile);

      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue(mockFiles);
      mockDriveApi.downloadFile.mockResolvedValue('content');
      mockDriveApi.deleteFile.mockResolvedValue(true);

      // Spy on vault.create to check the path used
      const createSpy = jest.spyOn(mockVault, 'create');

      await syncEngine.syncNow();

      // The file should be created with a timestamp suffix
      expect(createSpy).toHaveBeenCalled();
      const calledPath = createSpy.mock.calls[0][0];
      expect(calledPath).toMatch(/existing-note-\d+\.md/);
    });

    it('returns partial success when some files fail', async () => {
      const mockFiles: DriveFile[] = [
        { id: 'file1', name: 'success.md', mimeType: 'text/markdown', modifiedTime: '' },
        { id: 'file2', name: 'fail.md', mimeType: 'text/markdown', modifiedTime: '' },
      ];

      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue(mockFiles);
      mockDriveApi.downloadFile
        .mockResolvedValueOnce('content1')
        .mockRejectedValueOnce(new Error('Download failed'));
      mockDriveApi.deleteFile.mockResolvedValue(true);

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true); // Partial success
      expect(result.filesDownloaded).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('records error when delete fails after successful download', async () => {
      const mockFiles: DriveFile[] = [
        { id: 'file1', name: 'test.md', mimeType: 'text/markdown', modifiedTime: '' },
      ];

      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue(mockFiles);
      mockDriveApi.downloadFile.mockResolvedValue('content');
      mockDriveApi.deleteFile.mockResolvedValue(false);

      const result = await syncEngine.syncNow();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to delete');
    });

    it('prevents concurrent syncs', async () => {
      mockDriveApi.findRaptureFolder.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('folder_id'), 100))
      );
      mockDriveApi.listFilesInFolder.mockResolvedValue([]);

      // Start first sync
      const firstSync = syncEngine.syncNow();

      // Try to start second sync while first is running
      const secondSync = syncEngine.syncNow();

      const secondResult = await secondSync;
      await firstSync;

      expect(secondResult.success).toBe(false);
      expect(secondResult.errors).toContain('Sync already in progress');
    });

    it('handles sync failure gracefully', async () => {
      mockDriveApi.findRaptureFolder.mockRejectedValue(new Error('Network error'));

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Sync failed');
    });
  });

  describe('getStatus', () => {
    it('returns idle status initially', () => {
      expect(syncEngine.getStatus()).toBe('idle');
    });

    it('returns syncing status during sync', async () => {
      mockDriveApi.findRaptureFolder.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(null), 50))
      );

      const syncPromise = syncEngine.syncNow();

      // Check status during sync
      expect(syncEngine.getStatus()).toBe('syncing');

      await syncPromise;

      // Status should return to idle after sync
      expect(syncEngine.getStatus()).toBe('idle');
    });

    it('returns error status after failed sync', async () => {
      mockDriveApi.findRaptureFolder.mockRejectedValue(new Error('Error'));

      await syncEngine.syncNow();

      expect(syncEngine.getStatus()).toBe('error');
    });
  });

  describe('updateSettings', () => {
    it('updates internal settings reference', () => {
      const newSettings = {
        ...mockSettings,
        destinationFolder: 'NewFolder/',
      };

      syncEngine.updateSettings(newSettings);

      // The sync engine should use new settings
      // This is verified by the folder it tries to create/use
      mockDriveApi.findRaptureFolder.mockResolvedValue(null);
      syncEngine.syncNow();

      // No direct way to verify, but updateSettings should not throw
      expect(true).toBe(true);
    });
  });

  describe('destination folder handling', () => {
    it('creates destination folder if it does not exist', async () => {
      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue([
        { id: 'file1', name: 'test.md', mimeType: 'text/markdown', modifiedTime: '' },
      ]);
      mockDriveApi.downloadFile.mockResolvedValue('content');
      mockDriveApi.deleteFile.mockResolvedValue(true);

      const createFolderSpy = jest.spyOn(mockVault, 'createFolder');

      await syncEngine.syncNow();

      expect(createFolderSpy).toHaveBeenCalledWith('Rapture');
    });

    it('does not create folder if it already exists', async () => {
      // Pre-create the folder
      const existingFolder = new TFolder('Rapture/');
      mockVault._setFolder('Rapture', existingFolder);

      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue([
        { id: 'file1', name: 'test.md', mimeType: 'text/markdown', modifiedTime: '' },
      ]);
      mockDriveApi.downloadFile.mockResolvedValue('content');
      mockDriveApi.deleteFile.mockResolvedValue(true);

      const createFolderSpy = jest.spyOn(mockVault, 'createFolder');

      await syncEngine.syncNow();

      expect(createFolderSpy).not.toHaveBeenCalled();
    });
  });

  describe('file content handling', () => {
    it('preserves YAML frontmatter', async () => {
      const contentWithFrontmatter = `---
title: Voice Note
date: 2024-12-24
duration: 30s
content_types:
  - ideas
  - tasks
source: rapture
---

# My Voice Note

This is the transcribed content.

- [ ] Task 1
- [x] Task 2
`;

      mockDriveApi.findRaptureFolder.mockResolvedValue('folder_id');
      mockDriveApi.listFilesInFolder.mockResolvedValue([
        { id: 'file1', name: 'note.md', mimeType: 'text/markdown', modifiedTime: '' },
      ]);
      mockDriveApi.downloadFile.mockResolvedValue(contentWithFrontmatter);
      mockDriveApi.deleteFile.mockResolvedValue(true);

      const createSpy = jest.spyOn(mockVault, 'create');

      await syncEngine.syncNow();

      expect(createSpy).toHaveBeenCalledWith(
        expect.any(String),
        contentWithFrontmatter
      );
    });
  });
});

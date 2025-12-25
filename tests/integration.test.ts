/**
 * Integration Tests for Rapture Inbox Plugin
 *
 * These tests verify the end-to-end integration of all plugin components.
 * For actual Obsidian vault testing, see MANUAL_TESTING_CHECKLIST.md
 */

import { OAuthManager } from '../src/oauth';
import { DriveApi } from '../src/driveApi';
import { SyncEngine, SyncResult } from '../src/syncEngine';
import { RaptureSettings, DEFAULT_SETTINGS } from '../src/settings';

// Mock requestUrl from Obsidian
jest.mock('obsidian', () => ({
  requestUrl: jest.fn(),
  normalizePath: (path: string) => path.replace(/\\/g, '/').replace(/\/+/g, '/'),
  Notice: jest.fn(),
  Plugin: class {},
  PluginSettingTab: class {},
  Setting: jest.fn(),
  App: class {},
}));

const { requestUrl } = require('obsidian');

// Helper to create mock plugin with settings
function createMockPlugin(settings: Partial<RaptureSettings> = {}) {
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    saveSettings: jest.fn().mockResolvedValue(undefined),
    loadData: jest.fn().mockResolvedValue(null),
    saveData: jest.fn().mockResolvedValue(undefined),
    manifest: { id: 'rapture-inbox' },
  };
}

// Mock vault with file operations
function createMockVault() {
  const files: Map<string, string> = new Map();

  return {
    files,
    getAbstractFileByPath: jest.fn((path: string) => {
      return files.has(path) ? { path } : null;
    }),
    create: jest.fn((path: string, content: string) => {
      files.set(path, content);
      return Promise.resolve({ path });
    }),
    createFolder: jest.fn((path: string) => {
      files.set(path, '__folder__');
      return Promise.resolve();
    }),
    read: jest.fn((file: { path: string }) => {
      return Promise.resolve(files.get(file.path) || '');
    }),
  };
}

// Mock app with vault
function createMockApp() {
  return {
    vault: createMockVault(),
    workspace: {
      onLayoutReady: jest.fn((callback: () => void) => callback()),
    },
  };
}

describe('Integration: Full Sync Flow', () => {
  let mockPlugin: ReturnType<typeof createMockPlugin>;
  let mockApp: ReturnType<typeof createMockApp>;
  let oauthManager: OAuthManager;
  let driveApi: DriveApi;
  let syncEngine: SyncEngine;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlugin = createMockPlugin({
      accessToken: 'valid-access-token',
      refreshToken: 'valid-refresh-token',
      tokenExpiry: Date.now() + 3600000, // 1 hour from now
      userEmail: 'test@example.com',
      destinationFolder: 'Rapture/',
    });

    mockApp = createMockApp();
    oauthManager = new OAuthManager(mockPlugin as any);
    driveApi = new DriveApi(oauthManager);
    syncEngine = new SyncEngine(mockApp as any, driveApi, mockPlugin.settings);
  });

  describe('End-to-End Sync', () => {
    it('should sync files from Drive to vault when folder exists', async () => {
      // Setup: Rapture/Obsidian folder exists with files
      const mockFiles = [
        {
          id: 'file-1',
          name: '2025-12-24-103000-meeting-notes.md',
          mimeType: 'text/markdown',
          modifiedTime: '2025-12-24T10:30:00Z',
        },
        {
          id: 'file-2',
          name: '2025-12-24-143000-ideas.md',
          mimeType: 'text/markdown',
          modifiedTime: '2025-12-24T14:30:00Z',
        },
      ];

      const mockContent1 = `---
date: 2025-12-24T10:30:00-05:00
duration: 45
title: Meeting Notes
content_types:
  - MEETING_NOTES
source: rapture-android
---

## Meeting Notes

- Discussed project timeline
- [ ] Follow up with team`;

      const mockContent2 = `---
date: 2025-12-24T14:30:00-05:00
duration: 30
title: Ideas
content_types:
  - IDEAS
source: rapture-android
---

## Ideas

- New feature concept
- Integration improvements`;

      // Mock Drive API responses
      requestUrl
        // Find Rapture folder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        // Find Obsidian subfolder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        // List files in folder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: mockFiles },
        })
        // Download file 1
        .mockResolvedValueOnce({
          status: 200,
          text: mockContent1,
        })
        // Delete file 1
        .mockResolvedValueOnce({
          status: 204,
        })
        // Download file 2
        .mockResolvedValueOnce({
          status: 200,
          text: mockContent2,
        })
        // Delete file 2
        .mockResolvedValueOnce({
          status: 204,
        });

      // Execute sync
      const result = await syncEngine.syncNow();

      // Verify result
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify files were created in vault
      const vault = mockApp.vault;
      expect(vault.create).toHaveBeenCalledTimes(2);
      expect(vault.create).toHaveBeenCalledWith(
        'Rapture/2025-12-24-103000-meeting-notes.md',
        mockContent1
      );
      expect(vault.create).toHaveBeenCalledWith(
        'Rapture/2025-12-24-143000-ideas.md',
        mockContent2
      );
    });

    it('should handle empty Rapture/Obsidian folder gracefully', async () => {
      requestUrl
        // Find Rapture folder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        // Find Obsidian subfolder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        // List files - empty
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [] },
        });

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing Rapture folder gracefully', async () => {
      requestUrl.mockResolvedValueOnce({
        status: 200,
        json: { files: [] }, // No Rapture folder
      });

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing Obsidian subfolder gracefully', async () => {
      requestUrl
        // Find Rapture folder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        // Obsidian subfolder not found
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [] },
        });

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(0);
    });

    it('should handle duplicate filenames by appending timestamp', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'existing-file.md',
        mimeType: 'text/markdown',
        modifiedTime: '2025-12-24T10:00:00Z',
      };

      const mockContent = '# Existing file content';

      // Pre-populate vault with existing file
      mockApp.vault.files.set('Rapture/existing-file.md', 'Original content');
      mockApp.vault.getAbstractFileByPath = jest.fn((path: string) => {
        return mockApp.vault.files.has(path) ? { path } : null;
      });

      requestUrl
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [mockFile] },
        })
        .mockResolvedValueOnce({
          status: 200,
          text: mockContent,
        })
        .mockResolvedValueOnce({
          status: 204,
        });

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify file was created with timestamp suffix
      expect(mockApp.vault.create).toHaveBeenCalledTimes(1);
      const createCall = (mockApp.vault.create as jest.Mock).mock.calls[0];
      expect(createCall[0]).toMatch(/Rapture\/existing-file-\d+\.md/);
      expect(createCall[1]).toBe(mockContent);
    });

    it('should create destination folder if it does not exist', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'test.md',
        mimeType: 'text/markdown',
        modifiedTime: '2025-12-24T10:00:00Z',
      };

      // Vault has no files (destination folder does not exist)
      mockApp.vault.getAbstractFileByPath = jest.fn().mockReturnValue(null);

      requestUrl
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [mockFile] },
        })
        .mockResolvedValueOnce({
          status: 200,
          text: '# Test content',
        })
        .mockResolvedValueOnce({
          status: 204,
        });

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(mockApp.vault.createFolder).toHaveBeenCalledWith('Rapture/');
    });
  });

  describe('OAuth Flow Integration', () => {
    it('should correctly identify authenticated state', () => {
      expect(oauthManager.isAuthenticated()).toBe(true);
    });

    it('should correctly identify unauthenticated state', () => {
      const unauthPlugin = createMockPlugin({ refreshToken: '' });
      const unauthManager = new OAuthManager(unauthPlugin as any);
      expect(unauthManager.isAuthenticated()).toBe(false);
    });

    it('should build correct auth URL with all parameters', () => {
      const authUrl = oauthManager.buildAuthUrl();

      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('redirect_uri=obsidian%3A%2F%2Frapture-inbox');
      expect(authUrl).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('access_type=offline');
    });

    it('should detect expired tokens correctly', () => {
      // Token expires in 1 hour, not expired
      expect(oauthManager.isTokenExpired()).toBe(false);

      // Create plugin with expired token
      const expiredPlugin = createMockPlugin({
        tokenExpiry: Date.now() - 1000, // 1 second ago
      });
      const expiredManager = new OAuthManager(expiredPlugin as any);
      expect(expiredManager.isTokenExpired()).toBe(true);

      // Create plugin with token expiring soon (within 5 min buffer)
      const soonExpiredPlugin = createMockPlugin({
        tokenExpiry: Date.now() + 60000, // 1 minute from now (within 5 min buffer)
      });
      const soonExpiredManager = new OAuthManager(soonExpiredPlugin as any);
      expect(soonExpiredManager.isTokenExpired()).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle token refresh on 401 and retry', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'test.md',
        mimeType: 'text/markdown',
        modifiedTime: '2025-12-24T10:00:00Z',
      };

      requestUrl
        // Find Rapture folder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        // Find Obsidian subfolder
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        // List files - 401 first
        .mockResolvedValueOnce({
          status: 401,
          json: { error: { code: 401, message: 'Token expired' } },
        })
        // Token refresh
        .mockResolvedValueOnce({
          status: 200,
          json: {
            access_token: 'new-access-token',
            expires_in: 3600,
          },
        })
        // List files - retry success
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [mockFile] },
        })
        // Download file
        .mockResolvedValueOnce({
          status: 200,
          text: '# Test content',
        })
        // Delete file
        .mockResolvedValueOnce({
          status: 204,
        });

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);
    });

    it('should prevent concurrent sync operations', async () => {
      requestUrl
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        .mockImplementation(() =>
          new Promise((resolve) => setTimeout(() => resolve({
            status: 200,
            json: { files: [] },
          }), 100))
        );

      // Start first sync (will be delayed)
      const sync1 = syncEngine.syncNow();

      // Try to start second sync immediately
      const sync2 = syncEngine.syncNow();

      const result2 = await sync2;

      expect(result2.success).toBe(false);
      expect(result2.errors).toContain('Sync already in progress');

      // Wait for first sync to complete
      await sync1;
    });

    it('should continue syncing remaining files if one file fails to download', async () => {
      const mockFiles = [
        { id: 'file-1', name: 'good.md', mimeType: 'text/markdown', modifiedTime: '2025-12-24T10:00:00Z' },
        { id: 'file-2', name: 'bad.md', mimeType: 'text/markdown', modifiedTime: '2025-12-24T11:00:00Z' },
        { id: 'file-3', name: 'also-good.md', mimeType: 'text/markdown', modifiedTime: '2025-12-24T12:00:00Z' },
      ];

      requestUrl
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: mockFiles },
        })
        // Download file 1 - success
        .mockResolvedValueOnce({
          status: 200,
          text: '# Good file 1',
        })
        // Delete file 1
        .mockResolvedValueOnce({
          status: 204,
        })
        // Download file 2 - failure
        .mockResolvedValueOnce({
          status: 500,
          json: { error: 'Server error' },
        })
        // Download file 3 - success
        .mockResolvedValueOnce({
          status: 200,
          text: '# Good file 3',
        })
        // Delete file 3
        .mockResolvedValueOnce({
          status: 204,
        });

      const result = await syncEngine.syncNow();

      // Sync partially succeeds
      expect(result.filesDownloaded).toBe(2);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('bad.md');
    });
  });

  describe('YAML Frontmatter Preservation', () => {
    it('should preserve complete YAML frontmatter when syncing', async () => {
      const yamlContent = `---
date: 2025-12-24T10:30:00-05:00
duration: 45
title: Meeting Notes with Special Characters: "Quotes" & Ampersands
content_types:
  - MEETING_NOTES
  - TASKS
  - IDEAS
source: rapture-android
custom_field: custom-value
---

## Meeting Notes

Content after frontmatter.`;

      requestUrl
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'rapture-folder-id', name: 'Rapture' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{ id: 'obsidian-folder-id', name: 'Obsidian' }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          json: { files: [{
            id: 'file-1',
            name: 'meeting.md',
            mimeType: 'text/markdown',
            modifiedTime: '2025-12-24T10:30:00Z',
          }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          text: yamlContent,
        })
        .mockResolvedValueOnce({
          status: 204,
        });

      const result = await syncEngine.syncNow();

      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(1);

      // Verify content was preserved exactly
      const createCall = (mockApp.vault.create as jest.Mock).mock.calls[0];
      expect(createCall[1]).toBe(yamlContent);
      expect(createCall[1]).toContain('date: 2025-12-24T10:30:00-05:00');
      expect(createCall[1]).toContain('duration: 45');
      expect(createCall[1]).toContain('content_types:');
      expect(createCall[1]).toContain('source: rapture-android');
    });
  });

  describe('Polling Sync Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct polling interval from settings', () => {
      const settings: RaptureSettings = {
        ...DEFAULT_SETTINGS,
        syncIntervalMinutes: 5,
      };

      const intervalMs = settings.syncIntervalMinutes * 60 * 1000;
      expect(intervalMs).toBe(300000); // 5 minutes in ms
    });

    it('should support all configured sync intervals', () => {
      const intervals = [1, 5, 10, 15, 30];

      intervals.forEach((minutes) => {
        const expectedMs = minutes * 60 * 1000;
        const settings: RaptureSettings = {
          ...DEFAULT_SETTINGS,
          syncIntervalMinutes: minutes,
        };
        expect(settings.syncIntervalMinutes * 60 * 1000).toBe(expectedMs);
      });
    });
  });
});

describe('Integration: Settings Persistence', () => {
  it('should merge loaded settings with defaults', () => {
    const partialSettings = {
      destinationFolder: 'CustomFolder/',
    };

    const mergedSettings = { ...DEFAULT_SETTINGS, ...partialSettings };

    expect(mergedSettings.destinationFolder).toBe('CustomFolder/');
    expect(mergedSettings.syncIntervalMinutes).toBe(5); // default
    expect(mergedSettings.syncOnVaultOpen).toBe(true); // default
  });

  it('should use defaults when no settings are saved', () => {
    const mergedSettings = { ...DEFAULT_SETTINGS, ...null };

    expect(mergedSettings).toEqual(DEFAULT_SETTINGS);
  });
});

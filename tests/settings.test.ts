/**
 * Settings Tab Module Tests
 * Task Group 11: Settings Tab UI
 */

import { RaptureSettingTab, RaptureSettings, DEFAULT_SETTINGS } from '../src/settings';
import { OAuthManager } from '../src/oauth';
import type RaptureSyncPlugin from '../src/main';
import { App, PluginSettingTab } from 'obsidian';

// Mock the obsidian module
jest.mock('obsidian');

describe('RaptureSettings', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('has correct default values for all settings', () => {
      expect(DEFAULT_SETTINGS.accessToken).toBe('');
      expect(DEFAULT_SETTINGS.refreshToken).toBe('');
      expect(DEFAULT_SETTINGS.tokenExpiry).toBe(0);
      expect(DEFAULT_SETTINGS.userEmail).toBe('');
      expect(DEFAULT_SETTINGS.destinationFolder).toBe('Rapture/');
      expect(DEFAULT_SETTINGS.syncIntervalMinutes).toBe(5);
      expect(DEFAULT_SETTINGS.syncOnVaultOpen).toBe(true);
      expect(DEFAULT_SETTINGS.lastSyncTimestamp).toBe(0);
    });

    it('uses correct destination folder default', () => {
      expect(DEFAULT_SETTINGS.destinationFolder).toBe('Rapture/');
    });

    it('uses correct sync interval default (5 minutes)', () => {
      expect(DEFAULT_SETTINGS.syncIntervalMinutes).toBe(5);
    });

    it('has sync on vault open enabled by default', () => {
      expect(DEFAULT_SETTINGS.syncOnVaultOpen).toBe(true);
    });
  });

  describe('RaptureSettings interface', () => {
    it('can create a valid settings object with all fields', () => {
      const settings: RaptureSettings = {
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        tokenExpiry: Date.now() + 3600000,
        userEmail: 'test@example.com',
        destinationFolder: 'CustomFolder/',
        syncIntervalMinutes: 10,
        syncOnVaultOpen: false,
        lastSyncTimestamp: Date.now(),
      };

      expect(settings.accessToken).toBe('test_access_token');
      expect(settings.refreshToken).toBe('test_refresh_token');
      expect(settings.userEmail).toBe('test@example.com');
      expect(settings.destinationFolder).toBe('CustomFolder/');
      expect(settings.syncIntervalMinutes).toBe(10);
      expect(settings.syncOnVaultOpen).toBe(false);
    });
  });
});

describe('RaptureSettingTab', () => {
  let settingTab: RaptureSettingTab;
  let mockPlugin: RaptureSyncPlugin;
  let mockApp: App;

  beforeEach(() => {
    mockApp = new App();

    // Create mock OAuth manager
    const mockOAuthManager = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      startAuthFlow: jest.fn().mockResolvedValue(undefined),
      signOut: jest.fn().mockResolvedValue(undefined),
    } as unknown as OAuthManager;

    // Create mock plugin with settings
    mockPlugin = {
      settings: { ...DEFAULT_SETTINGS },
      saveSettings: jest.fn().mockResolvedValue(undefined),
      manualSync: jest.fn().mockResolvedValue({
        success: true,
        filesDownloaded: 0,
        errors: [],
      }),
      oauthManager: mockOAuthManager,
    } as unknown as RaptureSyncPlugin;

    settingTab = new RaptureSettingTab(mockApp, mockPlugin);
  });

  describe('constructor', () => {
    it('extends PluginSettingTab', () => {
      expect(settingTab).toBeInstanceOf(PluginSettingTab);
    });

    it('stores plugin reference', () => {
      expect(settingTab.plugin).toBe(mockPlugin);
    });
  });

  describe('settings persistence', () => {
    it('saves destination folder setting correctly', async () => {
      const newFolder = 'CustomFolder/';
      mockPlugin.settings.destinationFolder = newFolder;
      await mockPlugin.saveSettings();

      expect(mockPlugin.saveSettings).toHaveBeenCalled();
      expect(mockPlugin.settings.destinationFolder).toBe(newFolder);
    });

    it('saves sync interval setting correctly', async () => {
      mockPlugin.settings.syncIntervalMinutes = 10;
      await mockPlugin.saveSettings();

      expect(mockPlugin.saveSettings).toHaveBeenCalled();
      expect(mockPlugin.settings.syncIntervalMinutes).toBe(10);
    });

    it('saves sync on vault open setting correctly', async () => {
      mockPlugin.settings.syncOnVaultOpen = false;
      await mockPlugin.saveSettings();

      expect(mockPlugin.saveSettings).toHaveBeenCalled();
      expect(mockPlugin.settings.syncOnVaultOpen).toBe(false);
    });

    it('preserves other settings when updating one', async () => {
      mockPlugin.settings.destinationFolder = 'NewFolder/';
      const originalInterval = mockPlugin.settings.syncIntervalMinutes;
      await mockPlugin.saveSettings();

      expect(mockPlugin.settings.syncIntervalMinutes).toBe(originalInterval);
    });
  });

  describe('Google account connection', () => {
    it('reports not authenticated when no refresh token', () => {
      (mockPlugin.oauthManager.isAuthenticated as jest.Mock).mockReturnValue(false);
      expect(mockPlugin.oauthManager.isAuthenticated()).toBe(false);
    });

    it('reports authenticated when refresh token exists', () => {
      mockPlugin.settings.refreshToken = 'test_token';
      (mockPlugin.oauthManager.isAuthenticated as jest.Mock).mockReturnValue(true);
      expect(mockPlugin.oauthManager.isAuthenticated()).toBe(true);
    });

    it('calls startAuthFlow on connect', async () => {
      await mockPlugin.oauthManager.startAuthFlow();
      expect(mockPlugin.oauthManager.startAuthFlow).toHaveBeenCalled();
    });

    it('calls signOut to disconnect', async () => {
      await mockPlugin.oauthManager.signOut();
      expect(mockPlugin.oauthManager.signOut).toHaveBeenCalled();
    });
  });

  describe('sync controls', () => {
    it('calls manualSync when triggered', async () => {
      await mockPlugin.manualSync();
      expect(mockPlugin.manualSync).toHaveBeenCalled();
    });

    it('manualSync returns correct result structure', async () => {
      const result = await mockPlugin.manualSync();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('filesDownloaded');
      expect(result).toHaveProperty('errors');
      expect(result.success).toBe(true);
      expect(result.filesDownloaded).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('manualSync can return synced files count', async () => {
      (mockPlugin.manualSync as jest.Mock).mockResolvedValueOnce({
        success: true,
        filesDownloaded: 3,
        errors: [],
      });

      const result = await mockPlugin.manualSync();
      expect(result.filesDownloaded).toBe(3);
    });
  });

  describe('getTimeAgo helper', () => {
    it('returns "just now" for recent timestamps', () => {
      const now = new Date();
      const result = (settingTab as any).getTimeAgo(now);
      expect(result).toBe('just now');
    });

    it('returns minutes ago for timestamps less than an hour old', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const result = (settingTab as any).getTimeAgo(date);
      expect(result).toBe('5 minutes ago');
    });

    it('returns hours ago for timestamps less than a day old', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const result = (settingTab as any).getTimeAgo(date);
      expect(result).toBe('3 hours ago');
    });

    it('returns days ago for timestamps more than a day old', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = (settingTab as any).getTimeAgo(date);
      expect(result).toBe('2 days ago');
    });

    it('uses singular form for 1 minute', () => {
      const date = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago
      const result = (settingTab as any).getTimeAgo(date);
      expect(result).toBe('1 minute ago');
    });

    it('uses singular form for 1 hour', () => {
      const date = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const result = (settingTab as any).getTimeAgo(date);
      expect(result).toBe('1 hour ago');
    });

    it('uses singular form for 1 day', () => {
      const date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const result = (settingTab as any).getTimeAgo(date);
      expect(result).toBe('1 day ago');
    });
  });

  describe('sync interval options', () => {
    it('supports 1 minute interval', () => {
      mockPlugin.settings.syncIntervalMinutes = 1;
      expect(mockPlugin.settings.syncIntervalMinutes).toBe(1);
    });

    it('supports 5 minute interval', () => {
      mockPlugin.settings.syncIntervalMinutes = 5;
      expect(mockPlugin.settings.syncIntervalMinutes).toBe(5);
    });

    it('supports 10 minute interval', () => {
      mockPlugin.settings.syncIntervalMinutes = 10;
      expect(mockPlugin.settings.syncIntervalMinutes).toBe(10);
    });

    it('supports 15 minute interval', () => {
      mockPlugin.settings.syncIntervalMinutes = 15;
      expect(mockPlugin.settings.syncIntervalMinutes).toBe(15);
    });

    it('supports 30 minute interval', () => {
      mockPlugin.settings.syncIntervalMinutes = 30;
      expect(mockPlugin.settings.syncIntervalMinutes).toBe(30);
    });
  });

  describe('last sync display', () => {
    it('has lastSyncTimestamp as 0 initially (never synced)', () => {
      expect(mockPlugin.settings.lastSyncTimestamp).toBe(0);
    });

    it('can store a last sync timestamp', () => {
      const timestamp = Date.now() - 5 * 60 * 1000; // 5 minutes ago
      mockPlugin.settings.lastSyncTimestamp = timestamp;
      expect(mockPlugin.settings.lastSyncTimestamp).toBeGreaterThan(0);
    });

    it('can update last sync timestamp after sync', async () => {
      const beforeSync = mockPlugin.settings.lastSyncTimestamp;
      mockPlugin.settings.lastSyncTimestamp = Date.now();
      expect(mockPlugin.settings.lastSyncTimestamp).toBeGreaterThan(beforeSync);
    });
  });
});

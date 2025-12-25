/**
 * OAuth Module Tests
 * Task Group 8: OAuth Implementation
 */

import { OAuthManager } from '../src/oauth';
import type RaptureSyncPlugin from '../src/main';
import { requestUrl } from 'obsidian';

// Mock the requestUrl function
jest.mock('obsidian', () => ({
  requestUrl: jest.fn(),
}));

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe('OAuthManager', () => {
  let oauthManager: OAuthManager;
  let mockPlugin: RaptureSyncPlugin;

  beforeEach(() => {
    // Create mock plugin with settings
    mockPlugin = {
      settings: {
        accessToken: '',
        refreshToken: '',
        tokenExpiry: 0,
        userEmail: '',
        destinationFolder: 'Rapture/',
        syncIntervalMinutes: 5,
        syncOnVaultOpen: true,
        lastSyncTimestamp: 0,
      },
      saveSettings: jest.fn().mockResolvedValue(undefined),
    } as unknown as RaptureSyncPlugin;

    oauthManager = new OAuthManager(mockPlugin);
    mockRequestUrl.mockReset();
  });

  describe('buildAuthUrl', () => {
    it('generates correct URL with client_id', () => {
      const url = oauthManager.buildAuthUrl();
      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=');
    });

    it('includes drive.file scope', () => {
      const url = oauthManager.buildAuthUrl();
      expect(url).toContain('scope=');
      expect(url).toContain('drive.file');
    });

    it('includes redirect_uri for obsidian protocol', () => {
      const url = oauthManager.buildAuthUrl();
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('obsidian');
      expect(url).toContain('rapture-sync');
    });

    it('requests offline access', () => {
      const url = oauthManager.buildAuthUrl();
      expect(url).toContain('access_type=offline');
    });

    it('prompts for consent', () => {
      const url = oauthManager.buildAuthUrl();
      expect(url).toContain('prompt=consent');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('parses token response and stores tokens', async () => {
      const mockResponse = {
        status: 200,
        json: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          email: 'test@example.com',
        },
        text: '',
      };
      mockRequestUrl.mockResolvedValue(mockResponse);

      await oauthManager.exchangeCodeForTokens('test_auth_code');

      expect(mockPlugin.settings.accessToken).toBe('test_access_token');
      expect(mockPlugin.settings.refreshToken).toBe('test_refresh_token');
      expect(mockPlugin.settings.userEmail).toBe('test@example.com');
      expect(mockPlugin.settings.tokenExpiry).toBeGreaterThan(Date.now());
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    it('throws error on failed exchange', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 400,
        json: { error: 'invalid_grant' },
        text: '',
      });

      await expect(oauthManager.exchangeCodeForTokens('bad_code')).rejects.toThrow(
        'Token exchange failed'
      );
    });

    it('handles missing email in response', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
        },
        text: '',
      });

      await oauthManager.exchangeCodeForTokens('test_code');
      expect(mockPlugin.settings.userEmail).toBe('');
    });
  });

  describe('refreshAccessToken', () => {
    beforeEach(() => {
      mockPlugin.settings.refreshToken = 'existing_refresh_token';
    });

    it('handles token refresh successfully', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: {
          access_token: 'new_access_token',
          expires_in: 3600,
        },
        text: '',
      });

      await oauthManager.refreshAccessToken();

      expect(mockPlugin.settings.accessToken).toBe('new_access_token');
      expect(mockPlugin.settings.tokenExpiry).toBeGreaterThan(Date.now());
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    it('handles rotated refresh token', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: {
          access_token: 'new_access_token',
          refresh_token: 'rotated_refresh_token',
          expires_in: 3600,
        },
        text: '',
      });

      await oauthManager.refreshAccessToken();

      expect(mockPlugin.settings.refreshToken).toBe('rotated_refresh_token');
    });

    it('throws error when no refresh token available', async () => {
      mockPlugin.settings.refreshToken = '';

      await expect(oauthManager.refreshAccessToken()).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('clears tokens and throws on refresh failure', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 401,
        json: { error: 'invalid_grant' },
        text: '',
      });

      await expect(oauthManager.refreshAccessToken()).rejects.toThrow(
        'Token refresh failed'
      );

      expect(mockPlugin.settings.accessToken).toBe('');
      expect(mockPlugin.settings.refreshToken).toBe('');
    });
  });

  describe('isTokenExpired', () => {
    it('returns true when token is expired', () => {
      mockPlugin.settings.tokenExpiry = Date.now() - 1000; // 1 second ago

      expect(oauthManager.isTokenExpired()).toBe(true);
    });

    it('returns true when token expires within 5 minutes', () => {
      mockPlugin.settings.tokenExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes from now

      expect(oauthManager.isTokenExpired()).toBe(true);
    });

    it('returns false when token is valid and not expiring soon', () => {
      mockPlugin.settings.tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

      expect(oauthManager.isTokenExpired()).toBe(false);
    });

    it('returns true when tokenExpiry is 0', () => {
      mockPlugin.settings.tokenExpiry = 0;

      expect(oauthManager.isTokenExpired()).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when refresh token exists', () => {
      mockPlugin.settings.refreshToken = 'some_token';

      expect(oauthManager.isAuthenticated()).toBe(true);
    });

    it('returns false when refresh token is empty', () => {
      mockPlugin.settings.refreshToken = '';

      expect(oauthManager.isAuthenticated()).toBe(false);
    });
  });

  describe('signOut', () => {
    it('clears all token data', async () => {
      mockPlugin.settings.accessToken = 'some_token';
      mockPlugin.settings.refreshToken = 'some_refresh';
      mockPlugin.settings.tokenExpiry = Date.now() + 3600000;
      mockPlugin.settings.userEmail = 'test@example.com';

      await oauthManager.signOut();

      expect(mockPlugin.settings.accessToken).toBe('');
      expect(mockPlugin.settings.refreshToken).toBe('');
      expect(mockPlugin.settings.tokenExpiry).toBe(0);
      expect(mockPlugin.settings.userEmail).toBe('');
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });
  });

  describe('getAccessToken', () => {
    it('returns current token when not expired', async () => {
      mockPlugin.settings.accessToken = 'valid_token';
      mockPlugin.settings.tokenExpiry = Date.now() + 10 * 60 * 1000;

      const token = await oauthManager.getAccessToken();

      expect(token).toBe('valid_token');
      expect(mockRequestUrl).not.toHaveBeenCalled();
    });

    it('refreshes token when expired', async () => {
      mockPlugin.settings.accessToken = 'old_token';
      mockPlugin.settings.refreshToken = 'refresh_token';
      mockPlugin.settings.tokenExpiry = Date.now() - 1000;

      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: {
          access_token: 'new_token',
          expires_in: 3600,
        },
        text: '',
      });

      const token = await oauthManager.getAccessToken();

      expect(token).toBe('new_token');
      expect(mockRequestUrl).toHaveBeenCalled();
    });
  });
});

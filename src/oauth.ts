import { requestUrl } from 'obsidian';
import type RaptureSyncPlugin from './main';

// OAuth configuration
// Note: For community plugin distribution, consider routing through API Gateway
// to avoid exposing client ID in source code
const OAUTH_CONFIG = {
	clientId: '1001880100001-l2qr9mev2eb86ob498kel7t8d4a31a8g.apps.googleusercontent.com',
	redirectUri: 'obsidian://rapture-inbox',
	scope: 'https://www.googleapis.com/auth/drive.file',
	authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
	tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export class OAuthManager {
	private plugin: RaptureSyncPlugin;

	constructor(plugin: RaptureSyncPlugin) {
		this.plugin = plugin;
	}

	isAuthenticated(): boolean {
		return !!this.plugin.settings.refreshToken;
	}

	startAuthFlow(): void {
		const authUrl = this.buildAuthUrl();

		// Open browser for OAuth consent
		window.open(authUrl);
	}

	buildAuthUrl(): string {
		const params = new URLSearchParams({
			client_id: OAUTH_CONFIG.clientId,
			redirect_uri: OAUTH_CONFIG.redirectUri,
			response_type: 'code',
			scope: OAUTH_CONFIG.scope,
			access_type: 'offline',
			prompt: 'consent',
		});

		return `${OAUTH_CONFIG.authEndpoint}?${params.toString()}`;
	}

	async exchangeCodeForTokens(code: string): Promise<void> {
		// Option A: Direct exchange with Google (requires client secret handling)
		// Option B: Exchange via API Gateway (recommended for security)

		// For now, using API Gateway approach
		const response = await requestUrl({
			url: 'https://rapture-api-gateway.onrender.com/api/v1/oauth/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				code: code,
				redirect_uri: OAUTH_CONFIG.redirectUri,
			}),
		});

		if (response.status !== 200) {
			throw new Error(`Token exchange failed: ${response.status}`);
		}

		const data = response.json;
		this.plugin.settings.accessToken = data.access_token;
		this.plugin.settings.refreshToken = data.refresh_token;
		this.plugin.settings.tokenExpiry = Date.now() + (data.expires_in * 1000);
		this.plugin.settings.userEmail = data.email || '';

		await this.plugin.saveSettings();
	}

	async getAccessToken(): Promise<string> {
		// Check if token is expired or about to expire (5 min buffer)
		if (this.isTokenExpired()) {
			await this.refreshAccessToken();
		}
		return this.plugin.settings.accessToken;
	}

	isTokenExpired(): boolean {
		const bufferMs = 5 * 60 * 1000; // 5 minutes
		return Date.now() >= (this.plugin.settings.tokenExpiry - bufferMs);
	}

	async refreshAccessToken(): Promise<void> {
		if (!this.plugin.settings.refreshToken) {
			throw new Error('No refresh token available');
		}

		// Refresh via API Gateway
		const response = await requestUrl({
			url: 'https://rapture-api-gateway.onrender.com/api/v1/oauth/refresh',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				refresh_token: this.plugin.settings.refreshToken,
			}),
		});

		if (response.status !== 200) {
			// If refresh fails, clear tokens and require re-auth
			await this.signOut();
			throw new Error('Token refresh failed. Please sign in again.');
		}

		const data = response.json;
		this.plugin.settings.accessToken = data.access_token;
		this.plugin.settings.tokenExpiry = Date.now() + (data.expires_in * 1000);

		// Refresh token may be rotated
		if (data.refresh_token) {
			this.plugin.settings.refreshToken = data.refresh_token;
		}

		await this.plugin.saveSettings();
	}

	async signOut(): Promise<void> {
		this.plugin.settings.accessToken = '';
		this.plugin.settings.refreshToken = '';
		this.plugin.settings.tokenExpiry = 0;
		this.plugin.settings.userEmail = '';

		await this.plugin.saveSettings();
	}
}

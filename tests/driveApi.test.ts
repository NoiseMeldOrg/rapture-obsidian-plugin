/**
 * Drive API Module Tests
 * Task Group 9: Drive API Wrapper
 */

import { DriveApi, DriveFile } from '../src/driveApi';
import type { OAuthManager } from '../src/oauth';
import { requestUrl } from 'obsidian';

// Mock the requestUrl function
jest.mock('obsidian', () => ({
  requestUrl: jest.fn(),
}));

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe('DriveApi', () => {
  let driveApi: DriveApi;
  let mockOAuthManager: OAuthManager;

  beforeEach(() => {
    // Create mock OAuth manager
    mockOAuthManager = {
      getAccessToken: jest.fn().mockResolvedValue('test_access_token'),
      refreshAccessToken: jest.fn().mockResolvedValue(undefined),
      isAuthenticated: jest.fn().mockReturnValue(true),
    } as unknown as OAuthManager;

    driveApi = new DriveApi(mockOAuthManager);
    mockRequestUrl.mockReset();
  });

  describe('findRaptureFolder', () => {
    it('locates Rapture/Obsidian folder successfully', async () => {
      // First request finds Rapture folder
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: {
          files: [{ id: 'rapture_folder_id', name: 'Rapture' }],
        },
        text: '',
      });

      // Second request finds Obsidian folder inside Rapture
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: {
          files: [{ id: 'obsidian_folder_id', name: 'Obsidian' }],
        },
        text: '',
      });

      const folderId = await driveApi.findRaptureFolder();

      expect(folderId).toBe('obsidian_folder_id');
      expect(mockRequestUrl).toHaveBeenCalledTimes(2);
    });

    it('returns null when Rapture folder not found', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: { files: [] },
        text: '',
      });

      const folderId = await driveApi.findRaptureFolder();

      expect(folderId).toBeNull();
    });

    it('returns null when Obsidian folder not found inside Rapture', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: {
          files: [{ id: 'rapture_folder_id', name: 'Rapture' }],
        },
        text: '',
      });

      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: { files: [] },
        text: '',
      });

      const folderId = await driveApi.findRaptureFolder();

      expect(folderId).toBeNull();
    });

    it('returns null on API error', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 500,
        json: { error: 'Internal server error' },
        text: '',
      });

      const folderId = await driveApi.findRaptureFolder();

      expect(folderId).toBeNull();
    });
  });

  describe('listFilesInFolder', () => {
    it('returns array of file metadata', async () => {
      const mockFiles: DriveFile[] = [
        {
          id: 'file1',
          name: '2024-12-24-120000-test-note.md',
          mimeType: 'text/markdown',
          modifiedTime: '2024-12-24T12:00:00Z',
        },
        {
          id: 'file2',
          name: '2024-12-24-130000-another-note.md',
          mimeType: 'text/markdown',
          modifiedTime: '2024-12-24T13:00:00Z',
        },
      ];

      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { files: mockFiles },
        text: '',
      });

      const files = await driveApi.listFilesInFolder('folder_id');

      expect(files).toHaveLength(2);
      expect(files[0].id).toBe('file1');
      expect(files[1].id).toBe('file2');
    });

    it('returns empty array when folder is empty', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { files: [] },
        text: '',
      });

      const files = await driveApi.listFilesInFolder('folder_id');

      expect(files).toHaveLength(0);
    });

    it('triggers token refresh on 401 and retries', async () => {
      // First call returns 401
      mockRequestUrl.mockResolvedValueOnce({
        status: 401,
        json: { error: 'Unauthorized' },
        text: '',
      });

      // After refresh, returns success
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: { files: [{ id: 'file1', name: 'test.md', mimeType: 'text/markdown', modifiedTime: '' }] },
        text: '',
      });

      const files = await driveApi.listFilesInFolder('folder_id');

      expect(mockOAuthManager.refreshAccessToken).toHaveBeenCalled();
      expect(files).toHaveLength(1);
    });

    it('throws error on non-401 failure', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 500,
        json: { error: 'Server error' },
        text: '',
      });

      await expect(driveApi.listFilesInFolder('folder_id')).rejects.toThrow(
        'Failed to list files'
      );
    });
  });

  describe('downloadFile', () => {
    it('returns file content as string', async () => {
      const mockContent = `---
title: Test Note
date: 2024-12-24
---

This is test content.`;

      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: {},
        text: mockContent,
      });

      const content = await driveApi.downloadFile('file_id');

      expect(content).toBe(mockContent);
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('file_id'),
        })
      );
    });

    it('triggers token refresh on 401 and retries', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 401,
        json: {},
        text: '',
      });

      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: {},
        text: 'file content',
      });

      const content = await driveApi.downloadFile('file_id');

      expect(mockOAuthManager.refreshAccessToken).toHaveBeenCalled();
      expect(content).toBe('file content');
    });

    it('throws error when file not found (404)', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 404,
        json: { error: 'Not found' },
        text: '',
      });

      await expect(driveApi.downloadFile('nonexistent_file')).rejects.toThrow(
        'File not found'
      );
    });

    it('throws error on download failure', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 500,
        json: { error: 'Server error' },
        text: '',
      });

      await expect(driveApi.downloadFile('file_id')).rejects.toThrow(
        'Failed to download file'
      );
    });
  });

  describe('deleteFile', () => {
    it('removes file from Drive successfully', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 204,
        json: {},
        text: '',
      });

      const result = await driveApi.deleteFile('file_id');

      expect(result).toBe(true);
      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: expect.stringContaining('file_id'),
        })
      );
    });

    it('returns true when file already deleted (404)', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 404,
        json: {},
        text: '',
      });

      const result = await driveApi.deleteFile('already_deleted_file');

      expect(result).toBe(true);
    });

    it('triggers token refresh on 401 and retries', async () => {
      mockRequestUrl.mockResolvedValueOnce({
        status: 401,
        json: {},
        text: '',
      });

      mockRequestUrl.mockResolvedValueOnce({
        status: 204,
        json: {},
        text: '',
      });

      const result = await driveApi.deleteFile('file_id');

      expect(mockOAuthManager.refreshAccessToken).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false on delete failure', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 500,
        json: { error: 'Server error' },
        text: '',
      });

      const result = await driveApi.deleteFile('file_id');

      expect(result).toBe(false);
    });

    it('handles 200 response as success', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: {},
        text: '',
      });

      const result = await driveApi.deleteFile('file_id');

      expect(result).toBe(true);
    });
  });

  describe('API error handling', () => {
    it('handles 403 permission denied', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 403,
        json: { error: { message: 'Permission denied' } },
        text: '',
      });

      await expect(driveApi.listFilesInFolder('folder_id')).rejects.toThrow();
    });

    it('includes authorization header in requests', async () => {
      mockRequestUrl.mockResolvedValue({
        status: 200,
        json: { files: [] },
        text: '',
      });

      await driveApi.listFilesInFolder('folder_id');

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_access_token',
          }),
        })
      );
    });
  });
});

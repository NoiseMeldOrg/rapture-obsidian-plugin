# Manual Testing Checklist for Rapture Sync Plugin

This document provides step-by-step manual testing procedures for verifying the Rapture Sync plugin works correctly in a real Obsidian environment.

## Prerequisites

Before testing, ensure you have:

- [ ] Obsidian installed (version 1.0.0 or later)
- [ ] Rapture Android app installed with Obsidian destination enabled
- [ ] A Google account with Google Drive access
- [ ] The plugin built (`npm run build`)

## Test Environment Setup

### Install Plugin in Development Vault

1. Create a new test vault or use an existing development vault
2. Navigate to vault's `.obsidian/plugins/` directory
3. Create folder: `rapture-sync/`
4. Copy these files from the plugin build:
   - `main.js`
   - `manifest.json`
   - `styles.css`
5. Restart Obsidian
6. Enable "Rapture Sync" in Settings > Community Plugins

---

## Test Cases

### TC-1: OAuth Flow

**Objective:** Verify Google authentication works correctly

**Steps:**
1. Open Settings > Rapture Sync
2. Click "Connect" button
3. Browser opens to Google OAuth consent screen
4. Authorize the plugin
5. Verify redirect back to Obsidian

**Expected Results:**
- [ ] "Connect" button visible when not authenticated
- [ ] Browser opens with correct OAuth URL
- [ ] After authorization, user email displayed in settings
- [ ] "Sign Out" button appears

**Notes:**
```
OAuth redirect URI: obsidian://rapture-sync
Scope: drive.file
```

---

### TC-2: Destination Folder Configuration

**Objective:** Verify destination folder setting works

**Steps:**
1. Navigate to Settings > Rapture Sync
2. Change destination folder from "Rapture/" to "VoiceNotes/"
3. Trigger a sync
4. Verify files appear in new folder

**Expected Results:**
- [ ] Default folder is "Rapture/"
- [ ] Custom folder is accepted
- [ ] Folder is created if it doesn't exist
- [ ] Files sync to correct folder

---

### TC-3: Manual Sync

**Objective:** Verify manual sync trigger works

**Prerequisites:**
- Authenticated with Google account
- At least one file in Drive's Rapture/Obsidian folder

**Steps:**
1. Open Settings > Rapture Sync
2. Click "Sync Now" button
3. Wait for sync to complete

**Expected Results:**
- [ ] Button shows "Syncing..." during operation
- [ ] Button re-enables after sync
- [ ] Notice appears with sync results
- [ ] Files appear in destination folder
- [ ] Files removed from Google Drive (mailbox pattern)
- [ ] "Last synced" timestamp updates

---

### TC-4: Create Recording in Rapture

**Objective:** Verify Rapture creates files correctly for plugin to sync

**Steps:**
1. Open Rapture Android app
2. Go to Settings > Obsidian
3. Ensure Obsidian destination is enabled
4. Create a voice recording
5. Wait for Rapture to process and upload
6. Check Google Drive for file

**Expected Results:**
- [ ] Recording appears in Rapture/Obsidian folder
- [ ] File is markdown format (.md)
- [ ] Filename follows pattern: YYYY-MM-DD-HHMMSS-title-slug.md
- [ ] File contains YAML frontmatter

---

### TC-5: Polling Sync

**Objective:** Verify automatic polling sync works

**Steps:**
1. Set sync interval to 1 minute
2. Create a recording in Rapture
3. Wait for automatic sync (up to 1 minute)
4. Verify file appears in vault

**Expected Results:**
- [ ] File syncs automatically without manual trigger
- [ ] Sync occurs within configured interval
- [ ] No duplicate downloads

---

### TC-6: Sync on Vault Open

**Objective:** Verify files sync when opening vault

**Prerequisites:**
- Files exist in Drive's Rapture/Obsidian folder
- "Sync on vault open" is enabled

**Steps:**
1. Close Obsidian completely
2. Reopen Obsidian
3. Check destination folder

**Expected Results:**
- [ ] Files sync automatically on vault open
- [ ] No user interaction required
- [ ] Sync occurs after workspace is ready

---

### TC-7: YAML Frontmatter Preservation

**Objective:** Verify metadata is preserved correctly

**Steps:**
1. Sync a file from Rapture
2. Open the synced file in Obsidian
3. Check YAML frontmatter

**Expected Results:**
- [ ] `date` field present with ISO timestamp
- [ ] `duration` field present with seconds value
- [ ] `title` field present
- [ ] `content_types` array present
- [ ] `source: rapture-android` present
- [ ] All frontmatter values match original

**Example YAML:**
```yaml
---
date: 2025-12-24T10:30:00-05:00
duration: 45
title: Meeting Notes
content_types:
  - MEETING_NOTES
  - TASKS
source: rapture-android
---
```

---

### TC-8: Duplicate Filename Handling

**Objective:** Verify duplicate files don't overwrite

**Steps:**
1. Create and sync a file named "test.md"
2. Create another file with same name in Rapture
3. Sync again

**Expected Results:**
- [ ] Both files exist in vault
- [ ] Second file has timestamp suffix (e.g., test-1703453400000.md)
- [ ] No data loss from overwriting

---

### TC-9: Empty Folder Handling

**Objective:** Verify plugin handles empty Drive folder gracefully

**Steps:**
1. Ensure Rapture/Obsidian folder is empty in Drive
2. Trigger manual sync

**Expected Results:**
- [ ] Sync completes without error
- [ ] Notice: "No new Rapture notes to sync"
- [ ] No crashes or exceptions

---

### TC-10: Missing Folder Handling

**Objective:** Verify plugin handles missing folder gracefully

**Steps:**
1. Delete Rapture/Obsidian folder from Drive
2. Trigger manual sync

**Expected Results:**
- [ ] Sync completes without error
- [ ] No crash or exception
- [ ] Plugin waits for folder to be created by Rapture app

---

### TC-11: Sign Out and Re-authenticate

**Objective:** Verify sign out clears credentials properly

**Steps:**
1. Click "Sign Out" in settings
2. Verify UI changes to "Connect" button
3. Try to sync (should fail)
4. Re-authenticate
5. Verify sync works again

**Expected Results:**
- [ ] Sign out clears all tokens
- [ ] Email no longer displayed
- [ ] Sync fails with auth error when signed out
- [ ] Re-authentication works correctly

---

### TC-12: Command Palette Commands

**Objective:** Verify commands are registered correctly

**Steps:**
1. Open command palette (Ctrl/Cmd + P)
2. Search for "Rapture"
3. Execute each command

**Expected Results:**
- [ ] "Rapture: Sync now" appears and triggers sync
- [ ] "Rapture: Open settings" appears and opens settings tab

---

## Performance Tests

### TC-P1: Sync Multiple Files

**Objective:** Verify bulk sync performance

**Steps:**
1. Create 10+ recordings in Rapture
2. Wait for all to upload to Drive
3. Trigger sync
4. Measure time to complete

**Expected Results:**
- [ ] All files sync successfully
- [ ] No timeout errors
- [ ] Reasonable completion time (<30 seconds for 10 files)

---

### TC-P2: Large File Handling

**Objective:** Verify large files sync correctly

**Steps:**
1. Create a long recording (>2 minutes) in Rapture
2. Verify file size in Drive
3. Sync to vault
4. Verify complete file downloaded

**Expected Results:**
- [ ] Large files download completely
- [ ] No truncation
- [ ] Content matches original

---

## Error Recovery Tests

### TC-E1: Network Disconnection During Sync

**Objective:** Verify graceful handling of network issues

**Steps:**
1. Start a sync
2. Disconnect network mid-sync
3. Check error handling

**Expected Results:**
- [ ] Error notice displayed
- [ ] Plugin doesn't crash
- [ ] Retrying after reconnection works

---

### TC-E2: Token Expiry During Sync

**Objective:** Verify automatic token refresh

**Steps:**
1. Wait for access token to expire (or modify settings)
2. Trigger sync

**Expected Results:**
- [ ] Token automatically refreshes
- [ ] Sync continues without user intervention
- [ ] No visible error if refresh succeeds

---

## Regression Tests

Run all test cases after any code changes to verify no regressions:

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| TC-1 | | |
| TC-2 | | |
| TC-3 | | |
| TC-4 | | |
| TC-5 | | |
| TC-6 | | |
| TC-7 | | |
| TC-8 | | |
| TC-9 | | |
| TC-10 | | |
| TC-11 | | |
| TC-12 | | |
| TC-P1 | | |
| TC-P2 | | |
| TC-E1 | | |
| TC-E2 | | |

---

## Release Verification

Before submitting to Obsidian community marketplace:

- [ ] All test cases pass
- [ ] No console errors during normal operation
- [ ] Plugin loads without warnings
- [ ] Plugin unloads cleanly
- [ ] Settings persist across restarts
- [ ] README is accurate and complete
- [ ] CHANGELOG is up to date
- [ ] LICENSE file present
- [ ] manifest.json has correct metadata
- [ ] versions.json is correctly formatted

---

## Tester Information

| Field | Value |
|-------|-------|
| Tester Name | |
| Date | |
| Obsidian Version | |
| Plugin Version | |
| OS | |
| Test Vault | |

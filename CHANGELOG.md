# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-24

### Initial Release

First public release of Rapture Sync for Obsidian.

### Added

#### Authentication
- Google OAuth 2.0 integration for secure Drive access
- Protocol handler `obsidian://rapture-sync` for OAuth callback
- Automatic token refresh before expiry (5-minute buffer)
- Sign out functionality to clear stored credentials
- User email display when authenticated

#### Sync Engine
- Mailbox sync pattern: download files, then delete from Drive
- Automatic folder detection for `Rapture/Obsidian` in Google Drive
- Destination folder creation if it doesn't exist in vault
- Configurable sync intervals: 1, 5, 10, 15, or 30 minutes
- Sync on vault open (optional, enabled by default)
- Manual sync via settings button or command palette
- Concurrent sync prevention (only one sync at a time)
- Error recovery with partial sync success handling

#### File Handling
- YAML frontmatter preservation from Rapture notes
- Original filename preservation
- Duplicate filename handling with timestamp suffix
- Markdown file filtering (only syncs .md files)

#### Settings Tab
- Google account connection section
- Destination folder configuration
- Sync interval dropdown
- Sync on vault open toggle
- Manual sync button with loading state
- Last sync timestamp display ("X minutes ago" format)

#### Commands
- "Rapture: Sync now" - Manual sync trigger
- "Rapture: Open settings" - Quick settings access

#### Developer Experience
- 107 unit tests covering all components
- Integration test suite for end-to-end flows
- Manual testing checklist for QA

### Technical Details

- TypeScript with strict mode
- esbuild for bundling
- Jest for testing
- Obsidian API integration
- Google Drive API v3

### Known Limitations

- Desktop only (mobile untested)
- One-way sync only (no bidirectional)
- Single Google account per vault
- Requires Rapture app with Obsidian destination enabled

### Dependencies

- Obsidian 1.0.0 or later
- Google account with Drive access
- Rapture Android app

## [Unreleased]

### Planned

- Mobile Obsidian support (pending testing)
- Multi-account support
- Sync statistics dashboard
- Notification customization options

---

## Versioning Notes

This project uses semantic versioning:
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

The `versions.json` file maps plugin versions to minimum Obsidian versions required.

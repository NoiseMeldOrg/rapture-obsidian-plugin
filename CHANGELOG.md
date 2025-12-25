# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-24

### Added

- Initial release
- Google OAuth integration for Drive access
- Mailbox sync pattern (download then delete from Drive)
- Configurable sync intervals (1, 5, 10, 15, 30 minutes)
- Sync on vault open option
- Manual sync via command palette
- Settings tab with Google account management
- Duplicate filename handling with timestamp suffix
- YAML frontmatter preservation from Rapture notes
- Last sync timestamp display

### Notes

- Desktop only (mobile support may work but is untested)
- Requires Rapture app with Obsidian destination enabled

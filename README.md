# Rapture Sync for Obsidian

Sync your [Rapture](https://noisemeld.com/rapture) voice notes from Google Drive to your Obsidian vault.

## Features

- **Mailbox Sync Pattern**: Notes are downloaded from Drive and then removed, keeping your Drive folder clean
- **Automatic Sync**: Configurable polling intervals (1, 5, 10, 15, or 30 minutes)
- **Sync on Vault Open**: Optionally sync when you open your vault
- **Manual Sync**: Trigger sync anytime via command palette or settings
- **YAML Frontmatter**: Preserves all metadata from Rapture (date, duration, title, content types, source)
- **Duplicate Handling**: Automatically handles filename conflicts by appending timestamps

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Go to Community Plugins
3. Browse and search for "Rapture Sync"
4. Install and enable the plugin

### Manual Installation

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/NoiseMeldOrg/rapture-obsidian-plugin/releases/latest)
2. Create a folder called `rapture-sync` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Restart Obsidian and enable the plugin in Settings → Community Plugins

## Setup

1. Open plugin settings (Settings → Rapture Sync)
2. Click "Connect" to sign in with your Google account
3. Authorize the plugin to access your Drive files
4. Configure your destination folder (default: `Rapture/`)
5. Set your preferred sync interval

## How It Works

1. **Rapture App** captures voice notes on your Android phone
2. **Rapture** creates markdown files in `Rapture/Obsidian` folder in your Google Drive
3. **Rapture Sync** downloads these files to your Obsidian vault
4. **Rapture Sync** deletes the files from Drive after successful download

This "mailbox" pattern ensures:
- Your Drive folder stays clean (no duplicate management needed)
- Notes appear in your vault automatically
- No data loss (only deleted after successful vault write)

## Commands

- **Rapture: Sync now** - Manually trigger a sync
- **Rapture: Open settings** - Quick access to plugin settings

## File Format

Rapture creates markdown files with YAML frontmatter:

```markdown
---
date: 2025-12-24T10:30:00-05:00
duration: 45
title: Meeting Notes
content_types:
  - MEETING_NOTES
  - TASKS
source: rapture-android
---

## Meeting Notes

- Discussed project timeline
- [ ] Follow up with team
- [x] Review documentation
```

## Requirements

- Obsidian 1.0.0 or later
- [Rapture app](https://play.google.com/store/apps/details?id=com.noisemeld.rapture) on Android
- Obsidian destination enabled in Rapture settings
- Google account with Google Drive

## Privacy & Security

- OAuth tokens are stored locally in your vault's plugin data
- Only accesses files created by the Rapture app (`drive.file` scope)
- No data is sent to NoiseMeld servers (direct Drive API access)
- You can sign out anytime to revoke access

## Troubleshooting

### Notes not appearing

1. Check that Obsidian destination is enabled in Rapture settings
2. Verify files exist in `Rapture/Obsidian` folder in Google Drive
3. Try manual sync via command palette
4. Check destination folder setting matches where you expect files

### Authentication issues

1. Sign out and sign back in
2. Check your internet connection
3. Verify Google account has access to Drive

### Sync failures

- Check the console (Ctrl+Shift+I) for error messages
- Ensure destination folder is writable
- Try reducing sync interval if you have many files

## Development

```bash
# Clone repository
git clone https://github.com/NoiseMeldOrg/rapture-obsidian-plugin.git
cd rapture-obsidian-plugin

# Install dependencies
npm install

# Development mode (watches for changes)
npm run dev

# Production build
npm run build
```

## Support

- [Rapture Website](https://noisemeld.com/rapture)
- [GitHub Issues](https://github.com/NoiseMeldOrg/rapture-obsidian-plugin/issues)
- [Rapture Android App](https://play.google.com/store/apps/details?id=com.noisemeld.rapture)

## License

MIT License - see [LICENSE](LICENSE) for details.

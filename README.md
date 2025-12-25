# Rapture Sync for Obsidian

Automatically sync your [Rapture](https://noisemeld.com/rapture) voice notes from Google Drive to your Obsidian vault.

**Rapture** is a hands-free voice capture app for Android that records your thoughts and transcribes them using AI. **Rapture Sync** is the official Obsidian plugin that brings those voice notes into your personal knowledge management system.

## Features

- **Mailbox Sync Pattern**: Notes are downloaded from Drive and then removed, keeping your Drive folder clean
- **Automatic Sync**: Configurable polling intervals (1, 5, 10, 15, or 30 minutes)
- **Sync on Vault Open**: Optionally sync when you open your vault
- **Manual Sync**: Trigger sync anytime via command palette or settings
- **YAML Frontmatter**: Preserves all metadata from Rapture (date, duration, title, content types, source)
- **Duplicate Handling**: Automatically handles filename conflicts by appending timestamps
- **Secure Authentication**: OAuth 2.0 with Google, tokens stored locally

## How It Works

```
Rapture Android App
        |
        v
Google Drive (Rapture/Obsidian folder)
        |
        v
Rapture Sync Plugin (downloads files)
        |
        v
Your Obsidian Vault (files appear here)
        |
        v
Google Drive (files deleted after successful download)
```

This "mailbox" pattern ensures:
- Your Drive folder stays clean (no duplicate management needed)
- Notes appear in your vault automatically
- No data loss (files only deleted after successful vault write)
- One-way sync keeps things simple and predictable

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open **Obsidian Settings**
2. Go to **Community Plugins**
3. Click **Browse** and search for "Rapture Sync"
4. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/NoiseMeldOrg/rapture-obsidian-plugin/releases/latest)
2. Create a folder called `rapture-sync` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Restart Obsidian
5. Enable the plugin in **Settings > Community Plugins**

### BRAT Installation (Beta Testing)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add this repo: `NoiseMeldOrg/rapture-obsidian-plugin`
3. Enable Rapture Sync in Community Plugins

## Quick Start

### Step 1: Enable Obsidian in Rapture

1. Open the Rapture app on your Android device
2. Go to **Settings > Obsidian**
3. Enable the Obsidian destination toggle
4. Rapture will create a `Rapture/Obsidian` folder in your Google Drive

### Step 2: Connect Obsidian Plugin

1. Open **Obsidian Settings > Rapture Sync**
2. Click **Connect** to sign in with your Google account
3. Authorize access to Drive files created by Rapture
4. Verify your email appears in settings

### Step 3: Configure Sync

1. Set your **destination folder** (default: `Rapture/`)
2. Choose your preferred **sync interval**
3. Optionally enable **sync on vault open**
4. Click **Sync Now** to test

### Step 4: Start Capturing

1. Use Rapture to record a voice note
2. Wait for Rapture to process and upload to Drive
3. Your note will automatically appear in Obsidian at the next sync

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Google Account | Connect/disconnect your Google account | - |
| Destination folder | Where synced files go in your vault | `Rapture/` |
| Sync interval | How often to check for new notes | 5 minutes |
| Sync on vault open | Sync when you open Obsidian | Enabled |

## Commands

Access these via the command palette (Ctrl/Cmd + P):

- **Rapture: Sync now** - Manually trigger a sync
- **Rapture: Open settings** - Quick access to plugin settings

## File Format

Rapture creates markdown files with YAML frontmatter containing metadata:

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

### Frontmatter Fields

| Field | Description | Example |
|-------|-------------|---------|
| `date` | Recording timestamp (ISO 8601) | `2025-12-24T10:30:00-05:00` |
| `duration` | Recording length in seconds | `45` |
| `title` | AI-extracted title | `Meeting Notes` |
| `content_types` | Detected content categories | `MEETING_NOTES`, `TASKS`, `IDEAS`, etc. |
| `source` | Origin of the note | `rapture-android` |

## Requirements

- **Obsidian**: Version 1.0.0 or later (desktop only)
- **Rapture app**: [Download from Google Play](https://play.google.com/store/apps/details?id=com.noisemeld.rapture)
- **Google account**: With Google Drive access
- **Obsidian destination**: Enabled in Rapture settings

## Privacy & Security

- **Local token storage**: OAuth tokens are stored locally in your vault's plugin data (`data.json`)
- **Minimal permissions**: Uses `drive.file` scope - only accesses files created by Rapture
- **No external servers**: Direct communication with Google Drive API
- **No data collection**: NoiseMeld never sees your notes or credentials
- **Easy revocation**: Sign out anytime to clear tokens, or revoke via [Google Account settings](https://myaccount.google.com/permissions)

## Troubleshooting

### Notes not appearing

1. **Check Rapture settings**: Ensure Obsidian destination is enabled
2. **Verify Drive folder**: Check that `Rapture/Obsidian` folder exists in Google Drive
3. **Check for files**: Verify files appear in the Drive folder after recording
4. **Try manual sync**: Use "Rapture: Sync now" command
5. **Check destination folder**: Ensure the vault folder path is correct

### Authentication issues

1. **Sign out and back in**: Settings > Rapture Sync > Sign Out, then Connect
2. **Check internet connection**: OAuth requires network access
3. **Revoke and reauthorize**: Go to [Google Account permissions](https://myaccount.google.com/permissions), revoke Rapture Sync, then reconnect

### Sync failures

1. **Check console**: Open DevTools (Ctrl+Shift+I) and check for errors
2. **Verify permissions**: Ensure the destination folder is writable
3. **Check token expiry**: Sign out and reconnect if tokens might be invalid
4. **Reduce sync frequency**: If rate limited, try a longer sync interval

### Files not deleted from Drive

1. **Check sync result**: If download fails, files won't be deleted
2. **Manual cleanup**: Files can be manually deleted from Drive
3. **Check permissions**: Ensure the plugin has delete permission (should be included in `drive.file` scope)

### Duplicate files appearing

- This is expected behavior when the same filename already exists
- Duplicate files get a timestamp suffix (e.g., `meeting-1703453400000.md`)
- Consider using unique titles in Rapture to avoid duplicates

## FAQ

### Why isn't there bidirectional sync?

By design, Rapture Sync uses a one-way "mailbox" pattern. Voice notes flow from Rapture to Obsidian, not the other way around. This simplifies the architecture and prevents sync conflicts.

### Can I use this on mobile Obsidian?

The plugin is desktop-only for now. Mobile support may work but is untested. Use Obsidian Sync or another solution to sync your vault to mobile.

### What happens if sync fails mid-way?

Successfully downloaded files are saved to your vault. Files that fail to download remain in Drive for the next sync attempt. Files are only deleted from Drive after successful vault write.

### Can I sync to multiple vaults?

Currently, the plugin stores settings per-vault. You would need to authenticate separately in each vault, but they would download from the same Drive folder.

### Does this work with Obsidian Sync?

Yes! Rapture Sync writes files to your local vault. Obsidian Sync (or any other sync solution) can then sync those files across devices.

## Development

```bash
# Clone repository
git clone https://github.com/NoiseMeldOrg/rapture-obsidian-plugin.git
cd rapture-obsidian-plugin

# Install dependencies
npm install

# Development mode (watches for changes)
npm run dev

# Run tests
npm test

# Production build
npm run build

# Lint
npm run lint
```

### Project Structure

```
rapture-obsidian-plugin/
├── src/
│   ├── main.ts           # Plugin entry point
│   ├── settings.ts       # Settings tab UI
│   ├── driveApi.ts       # Google Drive API wrapper
│   ├── syncEngine.ts     # Sync logic
│   └── oauth.ts          # OAuth flow
├── tests/                 # Jest tests
├── manifest.json         # Plugin metadata
├── package.json
└── README.md
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/syncEngine.test.ts
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Support

- **Rapture Website**: [noisemeld.com/rapture](https://noisemeld.com/rapture)
- **GitHub Issues**: [Report bugs or request features](https://github.com/NoiseMeldOrg/rapture-obsidian-plugin/issues)
- **Rapture Android App**: [Google Play Store](https://play.google.com/store/apps/details?id=com.noisemeld.rapture)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Made with voice by [NoiseMeld](https://noisemeld.com)

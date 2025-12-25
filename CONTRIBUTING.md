# Contributing to Rapture Sync

Thank you for your interest in contributing to Rapture Sync! This document provides guidelines for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Release Process](#release-process)
- [Obsidian Marketplace Submission](#obsidian-marketplace-submission)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, be constructive, and be patient with others.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your changes
5. Make your changes and test thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- Obsidian (for testing)
- A Google account with Drive access
- Rapture Android app (optional, for end-to-end testing)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/rapture-obsidian-plugin.git
cd rapture-obsidian-plugin

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Testing in Obsidian

1. Create a test vault or use an existing development vault
2. Create `.obsidian/plugins/rapture-sync/` directory
3. Symlink or copy build output:
   ```bash
   # On macOS/Linux
   ln -s $(pwd)/main.js /path/to/vault/.obsidian/plugins/rapture-sync/
   ln -s $(pwd)/manifest.json /path/to/vault/.obsidian/plugins/rapture-sync/
   ln -s $(pwd)/styles.css /path/to/vault/.obsidian/plugins/rapture-sync/
   ```
4. Enable the plugin in Obsidian settings
5. Open DevTools (Ctrl+Shift+I) to see console logs

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-multiple-accounts`
- `fix/token-refresh-error`
- `docs/improve-readme`
- `test/add-integration-tests`

### Commit Messages

Follow conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(sync): add retry logic for failed downloads
fix(oauth): handle expired refresh token
docs(readme): add troubleshooting section
test(driveApi): add tests for error handling
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/syncEngine.test.ts

# Run tests in watch mode
npm test -- --watch
```

### Test Coverage Goals

- New features should include tests
- Bug fixes should include regression tests
- Aim for >80% coverage on new code

### Manual Testing

Before submitting a PR, complete relevant items in `MANUAL_TESTING_CHECKLIST.md`:

1. Test in a development vault
2. Verify OAuth flow works
3. Test sync with real files
4. Check for console errors

## Submitting Changes

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass: `npm test`
4. Ensure build succeeds: `npm run build`
5. Update CHANGELOG.md if appropriate
6. Submit PR with clear description

### PR Template

```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (describe)

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Works in development vault

## Checklist
- [ ] Code follows project style
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] CHANGELOG updated (if applicable)
```

## Coding Standards

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit types for function parameters
- Handle errors appropriately
- Use async/await for promises

### Style

- 2-space indentation
- Single quotes for strings
- Semicolons at end of statements
- Maximum line length: 100 characters

### File Organization

```
src/
├── main.ts           # Plugin entry point
├── settings.ts       # Settings tab UI
├── driveApi.ts       # Google Drive API
├── syncEngine.ts     # Sync logic
└── oauth.ts          # OAuth flow

tests/
├── __mocks__/        # Mock implementations
├── setup.ts          # Test setup
├── *.test.ts         # Test files
```

### Naming Conventions

- `camelCase` for variables and functions
- `PascalCase` for classes and interfaces
- `UPPER_SNAKE_CASE` for constants
- Descriptive names over abbreviations

## Release Process

### Version Bumping

1. Update version in `manifest.json`
2. Update version in `package.json`
3. Update `versions.json` if minimum Obsidian version changes
4. Add entry to `CHANGELOG.md`

### Creating a Release

```bash
# Bump version
npm run version

# Build production
npm run build

# Create GitHub release with:
# - main.js
# - manifest.json
# - styles.css
```

## Obsidian Marketplace Submission

### First-Time Submission

To submit this plugin to the Obsidian community marketplace:

1. **Verify Requirements**
   - [ ] Plugin has a unique ID (`rapture-sync`)
   - [ ] `manifest.json` is complete and valid
   - [ ] `versions.json` maps versions to Obsidian requirements
   - [ ] README.md provides clear documentation
   - [ ] LICENSE file exists (MIT)
   - [ ] No external dependencies that break plugin guidelines

2. **Fork obsidian-releases**
   ```bash
   git clone https://github.com/obsidianmd/obsidian-releases.git
   ```

3. **Add Plugin Entry**

   Edit `community-plugins.json` and add:
   ```json
   {
     "id": "rapture-sync",
     "name": "Rapture Sync",
     "author": "NoiseMeld",
     "description": "Sync Rapture voice notes from Google Drive to your Obsidian vault",
     "repo": "NoiseMeldOrg/rapture-obsidian-plugin"
   }
   ```

4. **Submit PR**
   - Title: "Add Rapture Sync plugin"
   - Description: Brief explanation of what the plugin does
   - Link to plugin repository

5. **Review Process**
   - Obsidian team reviews the submission
   - May request changes or clarifications
   - Typically takes 1-2 weeks

### Update Submission

For plugin updates, no PR to obsidian-releases is needed:

1. Create a GitHub release with the new version
2. Include `main.js`, `manifest.json`, `styles.css`
3. Obsidian automatically picks up new releases

### Plugin Guidelines

From Obsidian's [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines):

- Plugin must be functional and provide value
- Must not collect user data without consent
- Must handle errors gracefully
- Should work offline when possible
- Should respect user's vault and not modify files unexpectedly
- Must be open source

## Questions?

- Open an issue for bugs or feature requests
- Join the discussion in existing issues
- Check the [Obsidian Developer Docs](https://docs.obsidian.md/)

Thank you for contributing!

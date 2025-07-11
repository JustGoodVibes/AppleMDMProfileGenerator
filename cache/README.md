# Apple MDM Documentation Cache

This directory contains cached Apple MDM documentation JSON files that are automatically downloaded and updated by the GitHub Actions workflow.

## Purpose

The cache serves as a local backup of Apple's MDM documentation to ensure the application can function even when:
- Apple's API is temporarily unavailable
- Network connectivity is limited
- Rate limiting prevents live API access
- The application is configured to use cached files only

## File Structure

- `profile-specific-payload-keys.json` - Main specification file containing all available MDM payload types
- `*.json` - Individual payload type documentation files (e.g., `accounts.json`, `wifi.json`, etc.)
- `manifest.json` - Metadata file containing information about all cached files, including checksums and timestamps

## Automatic Updates

The cache is automatically updated by the GitHub Actions workflow (`.github/workflows/cache-apple-docs.yml`) which:
- Runs daily at 2 AM UTC
- Triggers on pushes to the main branch
- Can be manually triggered via workflow dispatch
- Downloads the latest documentation from Apple's servers
- Only commits changes when files are actually updated

## Configuration

The application behavior can be controlled via the `USE_LIVE_API` configuration parameter:
- `USE_LIVE_API=true` (default): Try live API first, fallback to cache if needed
- `USE_LIVE_API=false`: Use cached files only, skip live API calls

## File Naming Convention

Files are named exactly as they appear in Apple's API URLs:
- Base URL: `https://developer.apple.com/tutorials/data/documentation/devicemanagement/`
- Example: `accounts.json` corresponds to `${BASE_URL}/accounts.json`

## Manifest File Format

The `manifest.json` file contains metadata about all cached files:

```json
{
  "generated_at": "2024-01-01T02:00:00.000Z",
  "total_files": 25,
  "files": {
    "accounts.json": {
      "size": 12345,
      "modified": "2024-01-01T02:00:00.000Z",
      "checksum": "sha256-hash-here"
    }
  }
}
```

## Manual Cache Management

To manually refresh the cache:
1. Go to the Actions tab in the GitHub repository
2. Select the "Cache Apple MDM Documentation" workflow
3. Click "Run workflow" and optionally enable "Force refresh all cached files"

## Development

When developing locally, you can:
- Use the cached files by setting `USE_LIVE_API=false`
- Test with live APIs by setting `USE_LIVE_API=true`
- Clear the cache by deleting files in this directory (they will be re-downloaded)

## File Integrity

Each file's integrity is verified using SHA-256 checksums stored in the manifest. The workflow only updates files when their content actually changes, ensuring efficient storage and minimal unnecessary commits.

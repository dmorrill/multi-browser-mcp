# Building the Chrome Extension

## Prerequisites

- Node.js 20+
- npm

## Build

```bash
node extensions/build-chrome.js
```

The built extension will be in `extensions/chrome/dist/`.

## Development

1. Build the extension
2. Open `chrome://extensions`
3. Enable Developer Mode
4. Click "Load unpacked"
5. Select `extensions/chrome/dist/`

## Testing

After loading, the extension should appear in the toolbar. Click it to connect to the MCP server.

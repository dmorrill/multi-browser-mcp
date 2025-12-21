/**
 * Wrapper Generator
 *
 * Generates language-specific wrappers for Blueprint MCP script mode.
 * Methods are dynamically generated from the tool list.
 */

const python = require('./python');
const javascript = require('./javascript');
const ruby = require('./ruby');

const wrappers = {
  python,
  javascript,
  ruby
};

/**
 * Generate a complete wrapper for the given language
 * @param {string} language - 'python', 'javascript', or 'ruby'
 * @param {Array} tools - Array of tool definitions from listTools()
 * @returns {string} Complete wrapper code
 */
function generateWrapper(language, tools) {
  const wrapper = wrappers[language];
  if (!wrapper) {
    throw new Error(`Unknown language: ${language}. Available: ${Object.keys(wrappers).join(', ')}`);
  }

  // Filter to tools that should be exposed in scripts
  // Exclude 'scripting' itself to avoid recursion
  const scriptableTools = tools.filter(t => t.name !== 'scripting');

  // Generate method code for each tool
  const methods = scriptableTools
    .map(tool => wrapper.generateMethod(tool.name))
    .join('\n');

  // Replace placeholder in template
  return wrapper.template.replace('{{METHODS}}', methods);
}

/**
 * Get list of available wrapper languages
 * @returns {string[]}
 */
function getAvailableLanguages() {
  return Object.keys(wrappers);
}

/**
 * Get file extension for a language
 * @param {string} language
 * @returns {string}
 */
function getFileExtension(language) {
  const extensions = {
    python: '.py',
    javascript: '.mjs',
    ruby: '.rb'
  };
  return extensions[language] || '';
}

/**
 * Get usage instructions text
 * @param {Array} tools - Array of tool definitions
 * @returns {string}
 */
function getInstructions(tools) {
  const toolNames = tools
    .filter(t => t.name !== 'scripting')
    .map(t => t.name)
    .join(', ');

  return `## Blueprint MCP Scripting

Automate browser tasks with external scripts. Use when page structure and selectors are known.

### How It Works
1. Install a wrapper file for your language
2. Import the wrapper in your script
3. Call methods that match tool names exactly

### Available Wrappers
- **python** - Python 3 wrapper
- **javascript** - Node.js ES module wrapper
- **ruby** - Ruby wrapper

### Install a Wrapper
\`\`\`
scripting action='install_wrapper' language='python' path='./blueprint_mcp.py'
\`\`\`

### Available Methods
All tool names become methods: ${toolNames}

### Usage Example (Python)
\`\`\`python
from blueprint_mcp import BlueprintMCP

bp = BlueprintMCP()
bp.enable(client_id='my-script')

# List tabs
tabs = bp.browser_tabs(action='list')
print(tabs['tabs'])

# Navigate
bp.browser_navigate(action='url', url='https://example.com')

# Interact
bp.browser_interact(actions=[{'type': 'click', 'selector': 'button'}])

bp.close()
\`\`\`

### Usage Example (JavaScript)
\`\`\`javascript
import { BlueprintMCP } from './blueprint_mcp.mjs';

const bp = new BlueprintMCP();
await bp.enable({ client_id: 'my-script' });

const tabs = await bp.browser_tabs({ action: 'list' });
console.log(tabs.tabs);

await bp.browser_navigate({ action: 'url', url: 'https://example.com' });
bp.close();
\`\`\`

### Usage Example (Ruby)
\`\`\`ruby
require_relative 'blueprint_mcp'

bp = BlueprintMCP.new
bp.enable(client_id: 'my-script')

tabs = bp.browser_tabs(action: 'list')
puts tabs['tabs']

bp.browser_navigate(action: 'url', url: 'https://example.com')
bp.close
\`\`\`
`;
}

module.exports = {
  generateWrapper,
  getAvailableLanguages,
  getFileExtension,
  getInstructions
};

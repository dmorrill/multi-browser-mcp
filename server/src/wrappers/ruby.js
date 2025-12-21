/**
 * Ruby Wrapper Template
 */

const template = `#!/usr/bin/env ruby
# frozen_string_literal: true

#
# Blueprint MCP Wrapper for Ruby
#
# Auto-generated wrapper for Blueprint MCP script mode.
# Methods match tool names exactly for easy code generation.
#
# Usage:
#   require_relative 'blueprint_mcp'
#
#   bp = BlueprintMCP.new
#   bp.enable(client_id: 'my-script')
#   tabs = bp.browser_tabs(action: 'list')
#   bp.close
#

require 'json'
require 'open3'

class BlueprintMCP
  def initialize(debug: false)
    @debug = debug
    @id = 0
    @stdin, @stdout, @stderr, @wait_thr = Open3.popen3(
      'npx', '@railsblueprint/blueprint-mcp', '--script-mode'
    )
  end

  def _call(method, **params)
    @id += 1
    request = {
      jsonrpc: '2.0',
      id: @id,
      method: method,
      params: params
    }

    warn "[BlueprintMCP] -> #{request.to_json}" if @debug

    @stdin.puts(request.to_json)
    @stdin.flush

    response_line = @stdout.gets
    raise 'No response from server' unless response_line

    warn "[BlueprintMCP] <- #{response_line.strip}" if @debug

    response = JSON.parse(response_line, symbolize_names: true)

    raise response[:error][:message] || 'Unknown error' if response[:error]

    response[:result]
  end

  # Auto-generated methods (match tool names exactly)
{{METHODS}}

  def close
    return unless @stdin

    begin
      @stdin.close
      @stdout.close
      @stderr.close
      Process.kill('TERM', @wait_thr.pid)
    rescue StandardError
      # Ignore cleanup errors
    end

    @stdin = nil
  end
end
`;

/**
 * Generate a Ruby method for a tool
 * @param {string} toolName - Tool name (e.g., 'browser_tabs')
 * @returns {string} Ruby method code
 */
function generateMethod(toolName) {
  return `  def ${toolName}(**params)
    _call('${toolName}', **params)
  end
`;
}

module.exports = {
  template,
  generateMethod
};

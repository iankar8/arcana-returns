# Linear MCP Server Setup

## Overview
This project is configured to use the Linear MCP (Model Context Protocol) server, enabling AI assistance to interact with your Linear workspace.

## Configuration

### 1. MCP Configuration
The MCP server is configured in `~/.cursor/mcp.json` (global Cursor settings). The Linear server has been added automatically.

### 2. Set Linear API Key
Add your Linear API key as a system environment variable. 

**For macOS/Linux (zsh)**, add to `~/.zshrc`:
```bash
export LINEAR_API_KEY="your_linear_api_key_here"
```

Then reload:
```bash
source ~/.zshrc
```

**For macOS/Linux (bash)**, add to `~/.bashrc` or `~/.bash_profile`:
```bash
export LINEAR_API_KEY="your_linear_api_key_here"
```

### 3. Get Your Linear API Key

1. Go to [Linear Settings → API](https://linear.app/settings/api)
2. Create a new Personal API Key
3. Copy the key and add it to your shell config as shown above

## Available Features

Once configured, the Linear MCP server provides:

- **Issue Management**: Create, read, update issues
- **Project Tracking**: View and manage projects
- **Team Collaboration**: Access team information
- **Workflow Automation**: Automate issue state transitions
- **Search**: Search across issues and projects

## Verification

To verify the setup:
1. Restart Cursor
2. The Linear MCP server should automatically connect
3. Test by asking the AI to list Linear issues or create a new issue

## Troubleshooting

- **Authentication Error**: Verify your LINEAR_API_KEY is correct
- **Connection Issues**: Ensure npx can access the internet
- **Package Not Found**: Run `npx -y @modelcontextprotocol/server-linear` manually to test

## Documentation

- [Linear API Documentation](https://developers.linear.app/docs)
- [MCP Protocol Documentation](https://modelcontextprotocol.io)


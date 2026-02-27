# AI Desktop Workbench

A local-first AI desktop workspace with agent automation, knowledge management, and visual task flows.

## Features

- **Workspace Management**: Create and switch between multiple project workspaces
- **Chat Tree**: Branching conversations with rollback support
- **Agent L5 Execution**: Autonomous AI agent with tool calling (file read/write, terminal, knowledge search)
- **Knowledge Base**: SQLite-based vector storage with semantic search
- **Multi-Model Support**: OpenAI, Claude, DeepSeek, Ollama (bring your own API keys)
- **Visual Task Flow**: React Flow powered execution visualization
- **Modern UI**: Shoelace Style components with dark theme

## Project Structure

```
ai-workbench/
├── electron/              # Electron main process
│   ├── main.ts           # Main entry
│   ├── preload.ts        # IPC bridge
│   ├── modelGateway.ts   # LLM provider adapters
│   ├── agent/            # Agent execution system
│   ├── workspace/        # Workspace & chat storage
│   └── knowledge/        # Vector store & embeddings
├── renderer/             # React frontend
│   ├── components/       # UI components
│   │   ├── layout/       # TopBar, Sidebar, Panels
│   │   ├── chat/         # ChatTree, ChatNode, ChatInput
│   │   ├── flow/         # TaskFlowCanvas (React Flow)
│   │   ├── workspace/    # WorkspaceExplorer
│   │   └── knowledge/    # KnowledgePanel
│   ├── state/            # Zustand stores
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Configuration

1. Create a workspace on first launch
2. Open Settings (gear icon in top bar)
3. Configure your API keys:
   - OpenAI API Key (for GPT-4, GPT-3.5)
   - Anthropic API Key (for Claude)
   - DeepSeek API Key
   - Ollama Base URL (default: http://localhost:11434)
4. Select your preferred models

## Usage

### Chat
- Type messages and press Enter to send
- Use `@agent` prefix to invoke the autonomous agent
- Click "Branch" on any message to explore alternative conversations

### Agent
The agent can:
- Read and write files in your workspace
- Execute terminal commands
- Search your knowledge base
- Automatically plan and execute multi-step tasks

### Knowledge Base
- Add documents via the Knowledge panel
- Use semantic search to find relevant information
- Documents are automatically embedded for RAG

### Task Flow
- Visualize agent execution steps in real-time
- See tool calls, results, and decision points

## Safety

- File operations are restricted to the current workspace
- Terminal commands have a blacklist for dangerous operations
- API keys are stored locally in your workspace config

## Technology Stack

- **Desktop**: Electron 33
- **Frontend**: React 18, TypeScript, Vite
- **UI**: Shoelace Style
- **State**: Zustand
- **Database**: SQLite (better-sqlite3)
- **Vector Search**: Custom implementation with cosine similarity
- **Visualization**: React Flow
- **LLM Integrations**: OpenAI, Anthropic SDKs

## Workspace Directory Structure

```
/workspace
  /your-project
    workspace.json        # Workspace configuration
    /chats               # Chat tree storage (JSON)
    /knowledge           # Document storage
    /flows               # Flow exports
    embeddings.db        # Vector database
```

## License

MIT

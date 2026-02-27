// ============================================
// Workspace Types
// ============================================

export interface WorkspaceConfig {
  name: string
  rootPath: string
  models: {
    default: string
    agent: string
  }
  apiKeys: {
    openai: string
    anthropic: string
    deepseek: string
    ollama: string
  }
}

export interface Workspace {
  id: string
  name: string
  path: string
  config: WorkspaceConfig
  lastOpened: number
}

// ============================================
// Chat Tree Types
// ============================================

export interface ChatNode {
  id: string
  parentId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  children: string[]
  createdAt: number
  metadata?: {
    model?: string
    tokens?: number
    latency?: number
  }
}

export interface ChatTree {
  id: string
  name: string
  rootNodeId: string
  nodes: Record<string, ChatNode>
  createdAt: number
  updatedAt: number
}

// ============================================
// Agent Types
// ============================================

export enum AgentState {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  WAITING_TOOL = 'WAITING_TOOL',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  INTERRUPTED = 'INTERRUPTED'
}

export interface ToolCall {
  id: string
  tool: string
  args: Record<string, unknown>
  result?: string
  error?: string
  startTime: number
  endTime?: number
}

export interface AgentExecution {
  id: string
  state: AgentState
  currentStep: number
  maxSteps: number
  startTime: number
  endTime?: number
  toolCalls: ToolCall[]
  log: string[]
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<string>
}

// ============================================
// Knowledge Base Types
// ============================================

export interface Document {
  id: string
  content: string
  source: string
  metadata?: Record<string, unknown>
  createdAt: number
}

export interface SearchResult {
  document: Document
  score: number
}

// ============================================
// Model Gateway Types
// ============================================

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface LLMProvider {
  name: string
  chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>
  stream?(messages: Message[], options?: LLMOptions): AsyncGenerator<string>
}

// ============================================
// Flow Types
// ============================================

export interface FlowNode {
  id: string
  type: 'plan' | 'tool' | 'result' | 'loop' | 'start' | 'end'
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    status?: 'pending' | 'running' | 'success' | 'error'
    details?: Record<string, unknown>
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
}

// ============================================
// IPC Channel Types
// ============================================

export interface IPCChannels {
  // Workspace
  'workspace:list': () => Promise<Workspace[]>
  'workspace:create': (name: string, path: string) => Promise<Workspace>
  'workspace:open': (id: string) => Promise<Workspace>
  'workspace:openByPath': (path: string) => Promise<Workspace>
  'workspace:close': () => Promise<void>
  'workspace:getCurrent': () => Promise<Workspace | null>

  // Chat
  'chat:list': () => Promise<ChatTree[]>
  'chat:create': (name: string) => Promise<ChatTree>
  'chat:load': (id: string) => Promise<ChatTree>
  'chat:save': (tree: ChatTree) => Promise<void>
  'chat:addNode': (treeId: string, node: ChatNode) => Promise<ChatNode>
  'chat:branch': (treeId: string, fromNodeId: string) => Promise<ChatTree>

  // Agent
  'agent:execute': (prompt: string, context?: string) => Promise<AgentExecution>
  'agent:interrupt': (executionId: string) => Promise<void>
  'agent:getState': (executionId: string) => Promise<AgentExecution>

  // LLM
  'llm:chat': (messages: Message[], options?: LLMOptions) => Promise<LLMResponse>
  'llm:stream': (messages: Message[], options?: LLMOptions) => AsyncGenerator<string>
  'llm:getModels': () => Promise<string[]>

  // Knowledge
  'knowledge:add': (content: string, source: string) => Promise<Document>
  'knowledge:search': (query: string, topK?: number) => Promise<SearchResult[]>
  'knowledge:delete': (id: string) => Promise<void>
  'knowledge:list': () => Promise<Document[]>

  // File System
  'fs:read': (path: string) => Promise<string>
  'fs:write': (path: string, content: string) => Promise<void>
  'fs:list': (path: string) => Promise<Array<{ name: string; isDir: boolean }>>

  // Dialog
  'dialog:selectDirectory': () => Promise<string | null>

  // Terminal
  'terminal:create': (cols?: number, rows?: number) => Promise<string>
  'terminal:write': (id: string, data: string) => Promise<void>
  'terminal:resize': (id: string, cols: number, rows: number) => Promise<void>
  'terminal:kill': (id: string) => Promise<void>
  'terminal:data': (id: string) => AsyncGenerator<string>
}

// ============================================
// Electron API Interface (matches preload.ts)
// ============================================

export interface ElectronAPI {
  workspace: {
    list(): Promise<Workspace[]>
    create(name: string, path: string): Promise<Workspace>
    open(id: string): Promise<Workspace>
    openByPath(path: string): Promise<Workspace>
    close(): Promise<void>
    getCurrent(): Promise<Workspace | null>
  }
  chat: {
    list(): Promise<ChatTree[]>
    create(name: string): Promise<ChatTree>
    load(id: string): Promise<ChatTree>
    save(tree: ChatTree): Promise<void>
    addNode(treeId: string, node: ChatNode): Promise<ChatNode>
    branch(treeId: string, fromNodeId: string): Promise<ChatTree>
  }
  agent: {
    execute(prompt: string, context?: string): Promise<AgentExecution>
    interrupt(executionId: string): Promise<void>
    getState(executionId: string): Promise<AgentExecution>
  }
  llm: {
    chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>
    getModels(): Promise<string[]>
  }
  knowledge: {
    add(content: string, source: string): Promise<Document>
    search(query: string, topK?: number): Promise<SearchResult[]>
    delete(id: string): Promise<void>
    list(): Promise<Document[]>
  }
  fs: {
    read(path: string): Promise<string>
    write(path: string, content: string): Promise<void>
    list(path: string): Promise<Array<{ name: string; isDir: boolean }>>
  }
  dialog: {
    selectDirectory(): Promise<string | null>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

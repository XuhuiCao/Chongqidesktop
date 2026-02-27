// API Response Types

export interface Workspace {
  id: string
  name: string
  path: string
  config: WorkspaceConfig
  lastOpened: number
}

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

export interface ChatTree {
  id: string
  name: string
  rootNodeId: string
  nodes: Record<string, ChatNode>
  createdAt: number
  updatedAt: number
}

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

export interface ChatSummary {
  id: string
  name: string
  updatedAt: number
}

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

export interface AgentExecution {
  id: string
  prompt: string
  context?: string
  state: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'INTERRUPTED'
  log: string[]
  result?: string
  error?: string
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface FileEntry {
  name: string
  isDir: boolean
}

// API Interface
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
    list(): Promise<ChatSummary[]>
    create(name: string): Promise<ChatTree>
    load(id: string): Promise<ChatTree>
    save(tree: ChatTree): Promise<void>
    addNode(treeId: string, node: Omit<ChatNode, 'id' | 'createdAt' | 'children'>): Promise<ChatNode>
    branch(treeId: string, fromNodeId: string): Promise<ChatTree>
  }
  agent: {
    execute(prompt: string, context?: string): Promise<AgentExecution>
    interrupt(executionId: string): Promise<void>
    getState(executionId: string): Promise<AgentExecution>
  }
  llm: {
    chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>
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
    list(path: string): Promise<FileEntry[]>
  }
  dialog: {
    selectDirectory(): Promise<string | null>
  }
}

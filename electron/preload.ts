import { contextBridge, ipcRenderer } from 'electron'
import type {
  Workspace, ChatTree, ChatNode, ChatSummary, Document, SearchResult,
  AgentExecution, LLMMessage, LLMOptions, LLMResponse, FileEntry
} from '../renderer/types/api.js'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Workspace
  workspace: {
    list: (): Promise<Workspace[]> => ipcRenderer.invoke('workspace:list'),
    create: (name: string, path: string): Promise<Workspace> => ipcRenderer.invoke('workspace:create', name, path),
    open: (id: string): Promise<Workspace> => ipcRenderer.invoke('workspace:open', id),
    openByPath: (path: string): Promise<Workspace> => ipcRenderer.invoke('workspace:openByPath', path),
    close: (): Promise<void> => ipcRenderer.invoke('workspace:close'),
    getCurrent: (): Promise<Workspace | null> => ipcRenderer.invoke('workspace:getCurrent')
  },

  // Chat
  chat: {
    list: (): Promise<ChatSummary[]> => ipcRenderer.invoke('chat:list'),
    create: (name: string): Promise<ChatTree> => ipcRenderer.invoke('chat:create', name),
    load: (id: string): Promise<ChatTree> => ipcRenderer.invoke('chat:load', id),
    save: (tree: ChatTree): Promise<void> => ipcRenderer.invoke('chat:save', tree),
    addNode: (treeId: string, node: Omit<ChatNode, 'id' | 'createdAt' | 'children'>): Promise<ChatNode> =>
      ipcRenderer.invoke('chat:addNode', treeId, node),
    branch: (treeId: string, fromNodeId: string): Promise<ChatTree> =>
      ipcRenderer.invoke('chat:branch', treeId, fromNodeId)
  },

  // Agent
  agent: {
    execute: (prompt: string, context?: string): Promise<AgentExecution> =>
      ipcRenderer.invoke('agent:execute', prompt, context),
    interrupt: (executionId: string): Promise<void> =>
      ipcRenderer.invoke('agent:interrupt', executionId),
    getState: (executionId: string): Promise<AgentExecution> =>
      ipcRenderer.invoke('agent:getState', executionId)
  },

  // LLM
  llm: {
    chat: (messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> =>
      ipcRenderer.invoke('llm:chat', messages, options),
    getModels: (): Promise<string[]> => ipcRenderer.invoke('llm:getModels')
  },

  // Knowledge
  knowledge: {
    add: (content: string, source: string): Promise<Document> =>
      ipcRenderer.invoke('knowledge:add', content, source),
    search: (query: string, topK?: number): Promise<SearchResult[]> =>
      ipcRenderer.invoke('knowledge:search', query, topK),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('knowledge:delete', id),
    list: (): Promise<Document[]> => ipcRenderer.invoke('knowledge:list')
  },

  // File System
  fs: {
    read: (path: string): Promise<string> => ipcRenderer.invoke('fs:read', path),
    write: (path: string, content: string): Promise<void> => ipcRenderer.invoke('fs:write', path, content),
    list: (path: string): Promise<FileEntry[]> => ipcRenderer.invoke('fs:list', path)
  },

  // Dialog
  dialog: {
    selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectDirectory')
  }
})


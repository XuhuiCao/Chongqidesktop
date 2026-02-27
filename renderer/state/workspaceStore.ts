import { create } from 'zustand'

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

export interface Document {
  id: string
  content: string
  source: string
  metadata?: Record<string, unknown>
  createdAt: number
}

interface WorkspaceStore {
  currentWorkspace: Workspace | null
  currentChat: ChatTree | null
  currentNodeId: string | null
  chats: Array<{ id: string; name: string; updatedAt: number }>
  models: string[]

  // Actions
  initialize: () => Promise<void>
  createWorkspace: (name: string, path: string) => Promise<void>
  openWorkspace: (id: string) => Promise<void>
  openExistingWorkspace: (path: string) => Promise<void>
  closeWorkspace: () => Promise<void>
  refreshWorkspaces: () => Promise<void>
  updateWorkspaceConfig: (config: Partial<WorkspaceConfig>) => Promise<void>

  // Chat actions
  createChat: (name: string) => Promise<void>
  openChat: (id: string) => Promise<void>
  addNode: (node: Omit<ChatNode, 'id' | 'createdAt' | 'children'>) => Promise<ChatNode | undefined>
  branchChat: (fromNodeId: string, newName?: string) => Promise<void>
  refreshChats: () => Promise<void>
  setCurrentNode: (nodeId: string) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  currentWorkspace: null,
  currentChat: null,
  currentNodeId: null,
  chats: [],
  models: [],

  initialize: async () => {
    const workspace = await window.electronAPI.workspace.getCurrent()
    if (workspace) {
      set({ currentWorkspace: workspace })
      await get().refreshChats()
    }
    const models = await window.electronAPI.llm.getModels()
    set({ models })
  },

  createWorkspace: async (name: string, path: string) => {
    const workspace = await window.electronAPI.workspace.create(name, path)
    set({ currentWorkspace: workspace })
    await get().refreshChats()
  },

  openWorkspace: async (id: string) => {
    const workspace = await window.electronAPI.workspace.open(id)
    set({ currentWorkspace: workspace, currentChat: null, currentNodeId: null })
    await get().refreshChats()
    const models = await window.electronAPI.llm.getModels()
    set({ models })
  },

  openExistingWorkspace: async (path: string) => {
    const workspace = await window.electronAPI.workspace.openByPath(path)
    set({ currentWorkspace: workspace, currentChat: null, currentNodeId: null })
    await get().refreshChats()
    const models = await window.electronAPI.llm.getModels()
    set({ models })
  },

  closeWorkspace: async () => {
    await window.electronAPI.workspace.close()
    set({ currentWorkspace: null, currentChat: null, currentNodeId: null, chats: [] })
  },

  refreshWorkspaces: async () => {
    // This is mainly for the welcome screen
  },

  updateWorkspaceConfig: async (config) => {
    const { currentWorkspace } = get()
    if (!currentWorkspace) return

    // Note: This would need to be implemented in the main process
    // For now, we'll just update the local state
    set({
      currentWorkspace: {
        ...currentWorkspace,
        config: { ...currentWorkspace.config, ...config }
      }
    })
  },

  createChat: async (name: string) => {
    const chat = await window.electronAPI.chat.create(name)
    set({ currentChat: chat, currentNodeId: chat.rootNodeId })
    await get().refreshChats()
  },

  openChat: async (id: string) => {
    const chat = await window.electronAPI.chat.load(id)
    set({ currentChat: chat, currentNodeId: chat.rootNodeId })
  },

  addNode: async (node) => {
    const { currentChat } = get()
    if (!currentChat) return

    const newNode: ChatNode = {
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      children: []
    }

    const addedNode = await window.electronAPI.chat.addNode(currentChat.id, newNode)

    set({
      currentChat: {
        ...currentChat,
        nodes: { ...currentChat.nodes, [addedNode.id]: addedNode },
        updatedAt: Date.now()
      },
      currentNodeId: addedNode.id
    })

    return addedNode
  },

  branchChat: async (fromNodeId: string, _newName?: string) => {
    const { currentChat } = get()
    if (!currentChat) return

    const newChat = await window.electronAPI.chat.branch(currentChat.id, fromNodeId)
    set({ currentChat: newChat, currentNodeId: fromNodeId })
    await get().refreshChats()
  },

  refreshChats: async () => {
    const chats = await window.electronAPI.chat.list()
    set({ chats })
  },

  setCurrentNode: (nodeId: string) => {
    set({ currentNodeId: nodeId })
  }
}))

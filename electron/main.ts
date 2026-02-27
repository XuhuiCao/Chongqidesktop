import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { workspaceManager } from './workspace/workspaceManager.js'
import { chatStorage } from './workspace/chatStorage.js'
import { vectorStore } from './knowledge/vectorStore.js'
import { modelGateway, OpenAIAdapter, ClaudeAdapter, DeepSeekAdapter, OllamaAdapter } from './modelGateway.js'
import { AgentExecutor } from './agent/agentExecutor.js'
import { toolRegistry } from './agent/toolRegistry.js'
import { agentStateManager } from './agent/agentState.js'
import { createReadFileTool } from './agent/tools/readFile.js'
import { createWriteFileTool } from './agent/tools/writeFile.js'
import { createListFilesTool } from './agent/tools/listFiles.js'
import { createRunTerminalTool } from './agent/tools/runTerminal.js'
import { createSearchKnowledgeTool } from './agent/tools/searchKnowledge.js'
import { Message, LLMOptions } from './types.js'
import * as fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let currentAgent: AgentExecutor | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    },
    titleBarStyle: 'hiddenInset',
    show: false
  })

  // Error handling
  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('console-message', (_, level, message) => {
    console.log(`[Renderer ${level}]:`, message)
  })

  // Load the renderer
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  console.log('Loading URL:', devServerUrl || 'file://' + path.join(__dirname, '../dist/index.html'))

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl).catch(err => {
      console.error('Failed to load URL:', err)
    })
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(err => {
      console.error('Failed to load file:', err)
    })
  }

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show')
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  await workspaceManager.initialize()
  createWindow()
  setupIPC()
})

app.on('window-all-closed', () => {
  vectorStore.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function setupIPC() {
  // Workspace IPC
  ipcMain.handle('workspace:list', async () => {
    return workspaceManager.listWorkspaces()
  })

  ipcMain.handle('workspace:create', async (_, name: string, rootPath: string) => {
    return workspaceManager.createWorkspace(name, rootPath)
  })

  ipcMain.handle('workspace:open', async (_, id: string) => {
    const workspace = await workspaceManager.openWorkspace(id)
    await vectorStore.initialize()
    updateModelProviders(workspace.config)
    registerTools(workspace.path)
    return workspace
  })

  ipcMain.handle('workspace:openByPath', async (_, dirPath: string) => {
    const workspace = await workspaceManager.openByPath(dirPath)
    await vectorStore.initialize()
    updateModelProviders(workspace.config)
    registerTools(workspace.path)
    return workspace
  })

  ipcMain.handle('workspace:close', async () => {
    await workspaceManager.closeWorkspace()
    vectorStore.close()
    return undefined
  })

  ipcMain.handle('workspace:getCurrent', async () => {
    return workspaceManager.getCurrentWorkspace()
  })

  // Chat IPC
  ipcMain.handle('chat:list', async () => {
    return chatStorage.listChats()
  })

  ipcMain.handle('chat:create', async (_, name: string) => {
    return chatStorage.createChat(name)
  })

  ipcMain.handle('chat:load', async (_, id: string) => {
    return chatStorage.loadChat(id)
  })

  ipcMain.handle('chat:save', async (_, tree) => {
    return chatStorage.saveChat(tree)
  })

  ipcMain.handle('chat:addNode', async (_, treeId: string, node) => {
    return chatStorage.addNode(treeId, node)
  })

  ipcMain.handle('chat:branch', async (_, treeId: string, fromNodeId: string) => {
    return chatStorage.branchChat(treeId, fromNodeId)
  })

  // Agent IPC
  ipcMain.handle('agent:execute', async (_, prompt: string, context?: string) => {
    const workspace = workspaceManager.getCurrentWorkspace()
    if (!workspace) throw new Error('No workspace open')

    const provider = modelGateway.getProvider(workspace.config.models.agent)
    if (!provider) throw new Error('Agent model not configured')

    currentAgent = new AgentExecutor(provider, workspace.path)
    return currentAgent.execute(prompt, context)
  })

  ipcMain.handle('agent:interrupt', async (_, executionId: string) => {
    currentAgent?.interrupt(executionId)
    return undefined
  })

  ipcMain.handle('agent:getState', async (_, executionId: string) => {
    return agentStateManager.getExecution(executionId)
  })

  // LLM IPC
  ipcMain.handle('llm:chat', async (_, messages: Message[], options?: LLMOptions) => {
    const workspace = workspaceManager.getCurrentWorkspace()
    if (!workspace) throw new Error('No workspace open')

    const providerName = options?.model || workspace.config.models.default
    return modelGateway.chat(providerName, messages, options)
  })

  ipcMain.handle('llm:getModels', async () => {
    return modelGateway.getProviders()
  })

  // Knowledge IPC
  ipcMain.handle('knowledge:add', async (_, content: string, source: string) => {
    return vectorStore.addDocument(content, source)
  })

  ipcMain.handle('knowledge:search', async (_, query: string, topK?: number) => {
    return vectorStore.search(query, topK)
  })

  ipcMain.handle('knowledge:delete', async (_, id: string) => {
    return vectorStore.deleteDocument(id)
  })

  ipcMain.handle('knowledge:list', async () => {
    return vectorStore.listDocuments()
  })

  // File System IPC
  ipcMain.handle('fs:read', async (_, filePath: string) => {
    const workspace = workspaceManager.getCurrentWorkspace()
    if (!workspace) throw new Error('No workspace open')

    const fullPath = path.resolve(workspace.path, filePath)
    if (!fullPath.startsWith(workspace.path)) {
      throw new Error('Access denied: Path outside workspace')
    }

    return fs.readFile(fullPath, 'utf-8')
  })

  ipcMain.handle('fs:write', async (_, filePath: string, content: string) => {
    const workspace = workspaceManager.getCurrentWorkspace()
    if (!workspace) throw new Error('No workspace open')

    const fullPath = path.resolve(workspace.path, filePath)
    if (!fullPath.startsWith(workspace.path)) {
      throw new Error('Access denied: Path outside workspace')
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    return fs.writeFile(fullPath, content, 'utf-8')
  })

  ipcMain.handle('fs:list', async (_, dirPath: string) => {
    const workspace = workspaceManager.getCurrentWorkspace()
    if (!workspace) throw new Error('No workspace open')

    const fullPath = path.resolve(workspace.path, dirPath)
    if (!fullPath.startsWith(workspace.path)) {
      throw new Error('Access denied: Path outside workspace')
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    return entries.map(e => ({ name: e.name, isDir: e.isDirectory() }))
  })

  // Dialog IPC
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })
}

function updateModelProviders(config: { apiKeys: Record<string, string>; models: { default: string; agent: string } }) {
  // Clear existing providers

  // Register OpenAI if API key exists
  if (config.apiKeys.openai) {
    modelGateway.registerProvider('openai', new OpenAIAdapter(config.apiKeys.openai))
    modelGateway.registerProvider('gpt-4', new OpenAIAdapter(config.apiKeys.openai, 'gpt-4'))
    modelGateway.registerProvider('gpt-3.5-turbo', new OpenAIAdapter(config.apiKeys.openai, 'gpt-3.5-turbo'))
  }

  // Register Claude if API key exists
  if (config.apiKeys.anthropic) {
    modelGateway.registerProvider('anthropic', new ClaudeAdapter(config.apiKeys.anthropic))
    modelGateway.registerProvider('claude', new ClaudeAdapter(config.apiKeys.anthropic))
    modelGateway.registerProvider('claude-3-opus', new ClaudeAdapter(config.apiKeys.anthropic, 'claude-3-opus-20240229'))
    modelGateway.registerProvider('claude-3-sonnet', new ClaudeAdapter(config.apiKeys.anthropic, 'claude-3-sonnet-20240229'))
  }

  // Register DeepSeek if API key exists
  if (config.apiKeys.deepseek) {
    modelGateway.registerProvider('deepseek', new DeepSeekAdapter(config.apiKeys.deepseek))
  }

  // Register Ollama (local, no API key needed)
  modelGateway.registerProvider('ollama', new OllamaAdapter(config.apiKeys.ollama || 'http://localhost:11434'))
}

function registerTools(workspacePath: string) {
  toolRegistry.clear()
  toolRegistry.register(createReadFileTool(workspacePath))
  toolRegistry.register(createWriteFileTool(workspacePath))
  toolRegistry.register(createListFilesTool(workspacePath))
  toolRegistry.register(createRunTerminalTool(workspacePath))
  toolRegistry.register(createSearchKnowledgeTool(vectorStore))
}

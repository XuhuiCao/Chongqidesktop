import { Workspace, WorkspaceConfig } from '../types.js'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

const WORKSPACE_LIST_FILE = 'workspaces.json'
const WORKSPACE_CONFIG_FILE = 'workspace.json'

export class WorkspaceManager {
  private configPath: string
  private workspacesPath: string
  private currentWorkspace: Workspace | null = null

  constructor() {
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'config')
    this.workspacesPath = path.join(this.configPath, WORKSPACE_LIST_FILE)
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.configPath, { recursive: true })

    try {
      await fs.access(this.workspacesPath)
    } catch {
      await fs.writeFile(this.workspacesPath, JSON.stringify([], null, 2))
    }
  }

  async listWorkspaces(): Promise<Workspace[]> {
    try {
      const content = await fs.readFile(this.workspacesPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  async createWorkspace(name: string, rootPath: string): Promise<Workspace> {
    const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const workspaceDir = path.join(rootPath, name)

    // Create workspace directory structure
    await fs.mkdir(workspaceDir, { recursive: true })
    await fs.mkdir(path.join(workspaceDir, 'chats'), { recursive: true })
    await fs.mkdir(path.join(workspaceDir, 'knowledge'), { recursive: true })
    await fs.mkdir(path.join(workspaceDir, 'flows'), { recursive: true })

    // Create default workspace config
    const config: WorkspaceConfig = {
      name,
      rootPath: workspaceDir,
      models: {
        default: 'deepseek',
        agent: 'claude'
      },
      apiKeys: {
        openai: '',
        anthropic: '',
        deepseek: '',
        ollama: ''
      }
    }

    await fs.writeFile(
      path.join(workspaceDir, WORKSPACE_CONFIG_FILE),
      JSON.stringify(config, null, 2)
    )

    const workspace: Workspace = {
      id: workspaceId,
      name,
      path: workspaceDir,
      config,
      lastOpened: Date.now()
    }

    // Save to workspace list
    const workspaces = await this.listWorkspaces()
    workspaces.push(workspace)
    await fs.writeFile(this.workspacesPath, JSON.stringify(workspaces, null, 2))

    return workspace
  }

  async openWorkspace(id: string): Promise<Workspace> {
    const workspaces = await this.listWorkspaces()
    const workspace = workspaces.find(w => w.id === id)

    if (!workspace) {
      throw new Error(`Workspace ${id} not found`)
    }

    // Load latest config
    const configPath = path.join(workspace.path, WORKSPACE_CONFIG_FILE)
    try {
      const configContent = await fs.readFile(configPath, 'utf-8')
      workspace.config = JSON.parse(configContent)
    } catch {
      // Config doesn't exist or is corrupted, use default
    }

    // Update last opened time
    workspace.lastOpened = Date.now()
    const updatedWorkspaces = workspaces.map(w =>
      w.id === id ? workspace : w
    )
    await fs.writeFile(this.workspacesPath, JSON.stringify(updatedWorkspaces, null, 2))

    this.currentWorkspace = workspace
    return workspace
  }

  async openByPath(dirPath: string): Promise<Workspace> {
    const workspaces = await this.listWorkspaces()

    // Check if this path already exists in workspace list
    let workspace = workspaces.find(w => w.path === dirPath)

    if (!workspace) {
      // Try to load existing config from the directory
      let config: WorkspaceConfig | null = null
      const configPath = path.join(dirPath, WORKSPACE_CONFIG_FILE)

      try {
        const configContent = await fs.readFile(configPath, 'utf-8')
        config = JSON.parse(configContent)
      } catch {
        // Config doesn't exist, check if directory is valid
        throw new Error(`No valid workspace found at ${dirPath}. Please select a directory containing a workspace.json file or create a new workspace.`)
      }

      // Config is guaranteed to be non-null at this point
      if (!config) {
        throw new Error(`Failed to load workspace config from ${dirPath}`)
      }

      // Create new workspace entry
      const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const dirName = path.basename(dirPath)

      workspace = {
        id: workspaceId,
        name: config.name || dirName,
        path: dirPath,
        config,
        lastOpened: Date.now()
      }

      // Add to workspace list
      workspaces.push(workspace)
    }

    // Update last opened time
    workspace.lastOpened = Date.now()
    const updatedWorkspaces = workspaces.map(w =>
      w.path === dirPath ? workspace : w
    )
    await fs.writeFile(this.workspacesPath, JSON.stringify(updatedWorkspaces, null, 2))

    this.currentWorkspace = workspace
    return workspace
  }

  async closeWorkspace(): Promise<void> {
    this.currentWorkspace = null
  }

  getCurrentWorkspace(): Workspace | null {
    return this.currentWorkspace
  }

  async updateWorkspaceConfig(id: string, config: Partial<WorkspaceConfig>): Promise<Workspace> {
    const workspaces = await this.listWorkspaces()
    const workspace = workspaces.find(w => w.id === id)

    if (!workspace) {
      throw new Error(`Workspace ${id} not found`)
    }

    workspace.config = { ...workspace.config, ...config }

    // Save config file
    const configPath = path.join(workspace.path, WORKSPACE_CONFIG_FILE)
    await fs.writeFile(configPath, JSON.stringify(workspace.config, null, 2))

    // Update workspace list
    const updatedWorkspaces = workspaces.map(w =>
      w.id === id ? workspace : w
    )
    await fs.writeFile(this.workspacesPath, JSON.stringify(updatedWorkspaces, null, 2))

    if (this.currentWorkspace?.id === id) {
      this.currentWorkspace = workspace
    }

    return workspace
  }

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await this.listWorkspaces()
    const workspace = workspaces.find(w => w.id === id)

    if (!workspace) {
      throw new Error(`Workspace ${id} not found`)
    }

    // Remove from list
    const updatedWorkspaces = workspaces.filter(w => w.id !== id)
    await fs.writeFile(this.workspacesPath, JSON.stringify(updatedWorkspaces, null, 2))

    // Optionally delete directory (commented out for safety)
    // await fs.rm(workspace.path, { recursive: true })

    if (this.currentWorkspace?.id === id) {
      this.currentWorkspace = null
    }
  }

  getCurrentWorkspacePath(): string | null {
    return this.currentWorkspace?.path || null
  }
}

export const workspaceManager = new WorkspaceManager()

import { ChatTree, ChatNode } from '../types.js'
import * as fs from 'fs/promises'
import * as path from 'path'
import { workspaceManager } from './workspaceManager.js'

export class ChatStorage {
  private getChatsDirectory(): string {
    const workspacePath = workspaceManager.getCurrentWorkspacePath()
    if (!workspacePath) {
      throw new Error('No workspace is currently open')
    }
    return path.join(workspacePath, 'chats')
  }

  async listChats(): Promise<Array<{ id: string; name: string; updatedAt: number }>> {
    try {
      const chatsDir = this.getChatsDirectory()
      const files = await fs.readdir(chatsDir)
      const chats: Array<{ id: string; name: string; updatedAt: number }> = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(chatsDir, file), 'utf-8')
            const tree: ChatTree = JSON.parse(content)
            chats.push({
              id: tree.id,
              name: tree.name,
              updatedAt: tree.updatedAt
            })
          } catch {
            // Skip corrupted files
          }
        }
      }

      return chats.sort((a, b) => b.updatedAt - a.updatedAt)
    } catch {
      return []
    }
  }

  async createChat(name: string): Promise<ChatTree> {
    const chatsDir = this.getChatsDirectory()
    const now = Date.now()
    const chatId = `chat_${now}_${Math.random().toString(36).substr(2, 9)}`

    // Create root node
    const rootNode: ChatNode = {
      id: `node_${now}`,
      role: 'system',
      content: 'You are a helpful AI assistant.',
      children: [],
      createdAt: now
    }

    const tree: ChatTree = {
      id: chatId,
      name,
      rootNodeId: rootNode.id,
      nodes: { [rootNode.id]: rootNode },
      createdAt: now,
      updatedAt: now
    }

    await fs.writeFile(
      path.join(chatsDir, `${chatId}.json`),
      JSON.stringify(tree, null, 2)
    )

    return tree
  }

  async loadChat(id: string): Promise<ChatTree> {
    const chatsDir = this.getChatsDirectory()
    const filePath = path.join(chatsDir, `${id}.json`)

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      throw new Error(`Chat ${id} not found`)
    }
  }

  async saveChat(tree: ChatTree): Promise<void> {
    const chatsDir = this.getChatsDirectory()
    tree.updatedAt = Date.now()

    await fs.writeFile(
      path.join(chatsDir, `${tree.id}.json`),
      JSON.stringify(tree, null, 2)
    )
  }

  async addNode(treeId: string, node: ChatNode): Promise<ChatNode> {
    const tree = await this.loadChat(treeId)

    // Add node to tree
    tree.nodes[node.id] = node

    // Update parent's children if parent exists
    if (node.parentId && tree.nodes[node.parentId]) {
      const parent = tree.nodes[node.parentId]
      if (!parent.children.includes(node.id)) {
        parent.children.push(node.id)
      }
    }

    await this.saveChat(tree)
    return node
  }

  async branchChat(fromTreeId: string, fromNodeId: string, newName?: string): Promise<ChatTree> {
    const sourceTree = await this.loadChat(fromTreeId)
    const now = Date.now()

    // Create new tree ID
    const newTreeId = `chat_${now}_${Math.random().toString(36).substr(2, 9)}`

    // Collect all nodes from the branch point
    const nodesToCopy: Record<string, ChatNode> = {}

    const collectNodes = (nodeId: string) => {
      const node = sourceTree.nodes[nodeId]
      if (!node) return

      nodesToCopy[nodeId] = { ...node }
      for (const childId of node.children) {
        collectNodes(childId)
      }
    }

    // Find path from root to source node
    const buildPath = (targetId: string): string[] => {
      const path: string[] = []
      let currentId: string | undefined = targetId

      while (currentId) {
        path.unshift(currentId)
        const currentNode: ChatNode | undefined = sourceTree.nodes[currentId]
        currentId = currentNode?.parentId
      }

      return path
    }

    const pathNodes = buildPath(fromNodeId)
    for (const nodeId of pathNodes) {
      collectNodes(nodeId)
    }

    // Find the root of the new branch
    const newRootNodeId = pathNodes[0]

    const newTree: ChatTree = {
      id: newTreeId,
      name: newName || `${sourceTree.name} (Branch)`,
      rootNodeId: newRootNodeId,
      nodes: nodesToCopy,
      createdAt: now,
      updatedAt: now
    }

    await this.saveChat(newTree)
    return newTree
  }

  async deleteChat(id: string): Promise<void> {
    const chatsDir = this.getChatsDirectory()
    const filePath = path.join(chatsDir, `${id}.json`)

    try {
      await fs.unlink(filePath)
    } catch {
      throw new Error(`Failed to delete chat ${id}`)
    }
  }

  async updateChatName(id: string, name: string): Promise<void> {
    const tree = await this.loadChat(id)
    tree.name = name
    await this.saveChat(tree)
  }
}

export const chatStorage = new ChatStorage()

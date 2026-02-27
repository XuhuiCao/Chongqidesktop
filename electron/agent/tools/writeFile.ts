import { Tool } from '../../types.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export function createWriteFileTool(workspacePath: string): Tool {
  return {
    name: 'write_file',
    description: 'Write content to a file at the specified path. Creates directories if needed.',
    parameters: {
      path: {
        type: 'string',
        description: 'Relative path to the file from workspace root'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      }
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      const filePath = args.path as string
      const content = args.content as string

      if (!filePath) {
        throw new Error('Path parameter is required')
      }

      if (content === undefined) {
        throw new Error('Content parameter is required')
      }

      // Security: Ensure the path is within workspace
      const fullPath = path.resolve(workspacePath, filePath)
      const resolvedWorkspace = path.resolve(workspacePath)
      if (!fullPath.startsWith(resolvedWorkspace)) {
        throw new Error('Access denied: Path is outside workspace')
      }

      // Create parent directories if they don't exist
      const parentDir = path.dirname(fullPath)
      await fs.mkdir(parentDir, { recursive: true })

      await fs.writeFile(fullPath, content, 'utf-8')
      return `Successfully wrote ${content.length} characters to ${filePath}`
    }
  }
}

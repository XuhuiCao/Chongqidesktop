import { Tool } from '../../types.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export function createReadFileTool(workspacePath: string): Tool {
  return {
    name: 'read_file',
    description: 'Read the contents of a file at the specified path',
    parameters: {
      path: {
        type: 'string',
        description: 'Relative path to the file from workspace root'
      }
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      const filePath = args.path as string
      if (!filePath) {
        throw new Error('Path parameter is required')
      }

      // Security: Ensure the path is within workspace
      const fullPath = path.resolve(workspacePath, filePath)
      const resolvedWorkspace = path.resolve(workspacePath)
      if (!fullPath.startsWith(resolvedWorkspace)) {
        throw new Error('Access denied: Path is outside workspace')
      }

      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        return content
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`File not found: ${filePath}`)
        }
        throw error
      }
    }
  }
}

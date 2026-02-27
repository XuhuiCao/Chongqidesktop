import { Tool } from '../../types.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export function createListFilesTool(workspacePath: string): Tool {
  return {
    name: 'list_files',
    description: 'List files and directories in the specified path',
    parameters: {
      path: {
        type: 'string',
        description: 'Relative path to the directory from workspace root (optional, defaults to root)'
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to list files recursively (optional, defaults to false)'
      }
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      const targetPath = (args.path as string) || '.'
      const recursive = (args.recursive as boolean) || false

      // Security: Ensure the path is within workspace
      const fullPath = path.resolve(workspacePath, targetPath)
      const resolvedWorkspace = path.resolve(workspacePath)
      if (!fullPath.startsWith(resolvedWorkspace)) {
        throw new Error('Access denied: Path is outside workspace')
      }

      try {
        const entries = await listDirectory(fullPath, recursive, '')
        return entries.join('\n')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`Directory not found: ${targetPath}`)
        }
        throw error
      }
    }
  }
}

async function listDirectory(
  dirPath: string,
  recursive: boolean,
  prefix: string
): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const result: string[] = []

  // Sort: directories first, then files
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  for (const entry of sorted) {
    const isDir = entry.isDirectory()
    const icon = isDir ? '📁' : '📄'
    result.push(`${prefix}${icon} ${entry.name}`)

    if (isDir && recursive) {
      const subPath = path.join(dirPath, entry.name)
      const subEntries = await listDirectory(subPath, recursive, `${prefix}  `)
      result.push(...subEntries)
    }
  }

  return result
}

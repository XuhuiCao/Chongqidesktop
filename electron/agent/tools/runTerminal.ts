import { Tool } from '../../types.js'
import { spawn } from 'child_process'

// Blacklist of dangerous commands
const DANGEROUS_COMMANDS = [
  /rm\s+-rf\s*\/\s*$/,
  />\s*\/dev\/(sd|hd|vd)/,
  /mkfs/,
  /dd\s+if=.*of=\/dev/,
  /:(){ :|:& };:/,
  /chmod\s+-R\s+777\s+\//,
  /chown\s+-R/,
  /wget.*\|.*sh/,
  /curl.*\|.*sh/,
]

export function createRunTerminalTool(workspacePath: string): Tool {
  return {
    name: 'run_terminal',
    description: 'Execute a terminal command in the workspace directory. Use with caution.',
    parameters: {
      command: {
        type: 'string',
        description: 'Command to execute'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (optional, defaults to 30000)'
      }
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      const command = args.command as string
      const timeout = (args.timeout as number) || 30000

      if (!command) {
        throw new Error('Command parameter is required')
      }

      // Security: Check for dangerous commands
      for (const pattern of DANGEROUS_COMMANDS) {
        if (pattern.test(command)) {
          throw new Error('Command blocked for security reasons')
        }
      }

      // Parse command (simple parsing, may need improvement for complex cases)
      const parts = command.match(/(?:"[^"]*"|'[^']*'|\S+)/g) || []
      const cmd = parts[0]?.replace(/^["']|["']$/g, '')
      const args_list = parts.slice(1).map(arg => arg.replace(/^["']|["']$/g, ''))

      if (!cmd) {
        throw new Error('Invalid command')
      }

      return new Promise((resolve, reject) => {
        const child = spawn(cmd, args_list, {
          cwd: workspacePath,
          shell: true,
          env: {
            ...process.env,
            PATH: process.env.PATH
          }
        })

        let stdout = ''
        let stderr = ''
        let killed = false

        const timeoutId = setTimeout(() => {
          killed = true
          child.kill('SIGTERM')
          reject(new Error(`Command timed out after ${timeout}ms`))
        }, timeout)

        child.stdout?.on('data', (data) => {
          stdout += data.toString()
        })

        child.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        child.on('close', (code) => {
          clearTimeout(timeoutId)
          if (killed) return

          const output = []
          if (stdout) output.push('STDOUT:\n' + stdout)
          if (stderr) output.push('STDERR:\n' + stderr)
          output.push(`Exit code: ${code}`)

          resolve(output.join('\n\n'))
        })

        child.on('error', (error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
      })
    }
  }
}

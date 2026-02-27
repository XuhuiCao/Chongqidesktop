import { AgentExecution, AgentState, Message } from '../types.js'
import { agentStateManager } from './agentState.js'
import { toolRegistry } from './toolRegistry.js'
import { LLMProvider } from '../modelGateway.js'

const MAX_EXECUTION_TIME = 5 * 60 * 1000 // 5 minutes

export class AgentExecutor {
  private provider: LLMProvider
  private workspacePath: string

  constructor(provider: LLMProvider, workspacePath: string) {
    this.provider = provider
    this.workspacePath = workspacePath
  }

  async execute(prompt: string, context?: string): Promise<AgentExecution> {
    const execution = agentStateManager.createExecution()
    const tools = toolRegistry.getAll()

    agentStateManager.createContext(execution.id, this.workspacePath, new Map(
      tools.map(t => [t.name, t])
    ))

    this.runExecution(execution, prompt, context).catch(error => {
      console.error('Agent execution error:', error)
      agentStateManager.completeExecution(execution.id, false)
    })

    return execution
  }

  private async runExecution(
    execution: AgentExecution,
    prompt: string,
    context?: string
  ): Promise<void> {
    const ctx = agentStateManager.getContext(execution.id)
    if (!ctx) return

    const startTime = Date.now()
    const tools = toolRegistry.getAll()
    const systemPrompt = agentStateManager.buildSystemPrompt(tools)

    const messages: Message[] = [
      { role: 'system', content: systemPrompt }
    ]

    if (context) {
      messages.push({ role: 'system', content: `Context: ${context}` })
    }

    messages.push({ role: 'user', content: prompt })

    agentStateManager.updateState(execution.id, AgentState.EXECUTING)

    while (execution.state === AgentState.EXECUTING) {
      // Check timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        execution.log.push(`[${new Date().toISOString()}] Execution timeout`)
        agentStateManager.completeExecution(execution.id, false)
        return
      }

      // Check interrupted
      if (ctx.interrupted) {
        execution.state = AgentState.INTERRUPTED
        return
      }

      // Increment step
      if (!agentStateManager.incrementStep(execution.id)) {
        return
      }

      try {
        const response = await this.provider.chat(messages)
        const content = response.content.trim()

        execution.log.push(`[${new Date().toISOString()}] LLM response received (${response.usage?.totalTokens || 'unknown'} tokens)`)

        // Parse response
        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(content)
        } catch {
          // Not JSON, treat as text response
          messages.push({ role: 'assistant', content })
          messages.push({ role: 'user', content: 'Please respond with a JSON object containing either a tool call or final response.' })
          continue
        }

        // Check for final response
        if (parsed.final) {
          messages.push({ role: 'assistant', content: parsed.final as string })
          execution.log.push(`[${new Date().toISOString()}] Task completed`)
          agentStateManager.completeExecution(execution.id, true)
          return
        }

        // Check for tool call
        if (parsed.tool) {
          const toolName = parsed.tool as string
          const toolArgs = (parsed.args as Record<string, unknown>) || {}

          agentStateManager.updateState(execution.id, AgentState.WAITING_TOOL)

          const toolCall: { id: string; tool: string; args: Record<string, unknown>; startTime: number; result?: string; endTime?: number } = {
            id: `call_${Date.now()}`,
            tool: toolName,
            args: toolArgs,
            startTime: Date.now()
          }

          const tool = toolRegistry.get(toolName)
          let toolResult: string

          if (!tool) {
            toolResult = `Error: Tool "${toolName}" not found`
          } else {
            try {
              toolResult = await tool.execute(toolArgs)
            } catch (error) {
              toolResult = `Error: ${(error as Error).message}`
            }
          }

          toolCall.result = toolResult
          toolCall.endTime = Date.now()

          agentStateManager.addToolCall(execution.id, toolCall)
          agentStateManager.updateState(execution.id, AgentState.EXECUTING)

          messages.push({ role: 'assistant', content: JSON.stringify({ tool: toolName, args: toolArgs }) })
          messages.push({ role: 'user', content: `Tool result: ${toolResult}` })

          execution.log.push(`[${new Date().toISOString()}] Tool ${toolName} executed`)
        } else {
          // Invalid response format
          messages.push({ role: 'assistant', content: JSON.stringify(parsed) })
          messages.push({ role: 'user', content: 'Invalid response format. Please provide either a "tool" object or a "final" string.' })
        }
      } catch (error) {
        execution.log.push(`[${new Date().toISOString()}] Error: ${(error as Error).message}`)
        agentStateManager.completeExecution(execution.id, false)
        return
      }
    }
  }

  interrupt(executionId: string): void {
    agentStateManager.interrupt(executionId)
  }
}

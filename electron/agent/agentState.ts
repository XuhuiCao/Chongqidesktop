import { AgentState, AgentExecution, ToolCall, Tool } from '../types.js'

export { AgentState }

export interface AgentContext {
  execution: AgentExecution
  workspacePath: string
  tools: Map<string, Tool>
  interrupted: boolean
}

export class AgentStateManager {
  private executions: Map<string, AgentExecution> = new Map()
  private contexts: Map<string, AgentContext> = new Map()

  createExecution(maxSteps: number = 30): AgentExecution {
    const execution: AgentExecution = {
      id: this.generateId(),
      state: AgentState.IDLE,
      currentStep: 0,
      maxSteps,
      startTime: Date.now(),
      toolCalls: [],
      log: []
    }
    this.executions.set(execution.id, execution)
    return execution
  }

  getExecution(id: string): AgentExecution | undefined {
    return this.executions.get(id)
  }

  updateState(id: string, state: AgentState): void {
    const execution = this.executions.get(id)
    if (execution) {
      execution.state = state
      execution.log.push(`[${new Date().toISOString()}] State: ${state}`)
    }
  }

  incrementStep(id: string): boolean {
    const execution = this.executions.get(id)
    if (!execution) return false

    execution.currentStep++
    execution.log.push(`[${new Date().toISOString()}] Step ${execution.currentStep}/${execution.maxSteps}`)

    if (execution.currentStep >= execution.maxSteps) {
      execution.state = AgentState.FAILED
      execution.log.push(`[${new Date().toISOString()}] Max steps reached`)
      execution.endTime = Date.now()
      return false
    }
    return true
  }

  addToolCall(id: string, toolCall: ToolCall): void {
    const execution = this.executions.get(id)
    if (execution) {
      execution.toolCalls.push(toolCall)
      execution.log.push(`[${new Date().toISOString()}] Tool: ${toolCall.tool}`)
    }
  }

  completeExecution(id: string, success: boolean = true): void {
    const execution = this.executions.get(id)
    if (execution) {
      execution.state = success ? AgentState.COMPLETED : AgentState.FAILED
      execution.endTime = Date.now()
      execution.log.push(`[${new Date().toISOString()}] ${success ? 'Completed' : 'Failed'}`)
    }
  }

  interrupt(id: string): void {
    const execution = this.executions.get(id)
    if (execution) {
      execution.state = AgentState.INTERRUPTED
      execution.endTime = Date.now()
      execution.log.push(`[${new Date().toISOString()}] Interrupted by user`)
    }

    const context = this.contexts.get(id)
    if (context) {
      context.interrupted = true
    }
  }

  createContext(executionId: string, workspacePath: string, tools: Map<string, Tool>): AgentContext {
    const execution = this.executions.get(executionId)
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`)
    }

    const context: AgentContext = {
      execution,
      workspacePath,
      tools,
      interrupted: false
    }
    this.contexts.set(executionId, context)
    return context
  }

  getContext(executionId: string): AgentContext | undefined {
    return this.contexts.get(executionId)
  }

  cleanup(executionId: string): void {
    this.executions.delete(executionId)
    this.contexts.delete(executionId)
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  buildSystemPrompt(tools: Tool[]): string {
    const toolDescriptions = tools.map(t => {
      return `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`
    }).join('\n')

    return `You are an autonomous coding agent running in a local workspace.

You can use the following tools:
${toolDescriptions}

When you need to use a tool, respond with a JSON object:
{
  "tool": "tool_name",
  "args": {
    "param1": "value1",
    "param2": "value2"
  }
}

When you have completed the task or need to provide final output, respond with:
{
  "final": "Your final response here"
}

Guidelines:
- Always check if files exist before reading them
- Verify file contents after writing
- Use relative paths from the workspace root
- Be concise but thorough in your final response
- If a tool returns an error, analyze it and try an alternative approach
- You have a maximum of 30 steps and 5 minutes to complete tasks
`
  }
}

export const agentStateManager = new AgentStateManager()

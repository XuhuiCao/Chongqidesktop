import { useState, useRef, useCallback, useEffect } from 'react'
import { useWorkspaceStore } from '../../state/workspaceStore'

export function ChatInput() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { currentChat, currentWorkspace, addNode, currentNodeId } = useWorkspaceStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea and sync value
  useEffect(() => {
    if (textareaRef.current) {
      const slTextarea = textareaRef.current
      // Sync value with Shoelace component
      if ((slTextarea as any).value !== input) {
        (slTextarea as any).value = input
      }
      // Auto-resize
      slTextarea.style.height = 'auto'
      slTextarea.style.height = `${Math.min(slTextarea.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading || !currentChat || !currentWorkspace) return

    const content = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      // Get parent node ID (current node)
      const parentId = currentNodeId

      // Add user message
      const userNode = await addNode({
        role: 'user',
        content,
        parentId: parentId || undefined
      })

      if (!userNode) throw new Error('Failed to add user message')

      // Get conversation context
      const context = buildContext(currentChat, userNode.id)

      // Check if this is an agent request
      if (content.startsWith('@agent')) {
        // Handle agent execution
        await handleAgentRequest(content.substring(6).trim(), context)
      } else {
        // Regular LLM chat
        const messages = [
          { role: 'system' as const, content: 'You are a helpful AI assistant.' },
          ...context
        ]

        const response = await window.electronAPI.llm.chat(messages, {
          model: currentWorkspace.config.models.default
        })

        await addNode({
          role: 'assistant',
          content: response.content,
          parentId: userNode.id,
          metadata: {
            tokens: response.usage?.totalTokens
          }
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      await addNode({
        role: 'assistant',
        content: `Error: ${(error as Error).message}`,
        parentId: currentNodeId || undefined
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, currentChat, currentWorkspace, currentNodeId, addNode])

  const handleAgentRequest = async (prompt: string, _context: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    if (!currentWorkspace) return

    // Add agent is thinking message
    const agentNode = await addNode({
      role: 'assistant',
      content: '🤖 Agent is processing your request...',
      parentId: currentNodeId || undefined
    })

    if (!agentNode) return

    try {
      const execution = await window.electronAPI.agent.execute(prompt)

      // Poll for completion
      const checkStatus = async (): Promise<void> => {
        const state = await window.electronAPI.agent.getState(execution.id)

        if (state.state === 'COMPLETED' || state.state === 'FAILED' || state.state === 'INTERRUPTED') {
          const summary = state.log.join('\n')
          await addNode({
            role: 'assistant',
            content: `**Agent Execution ${state.state}**\n\n\`\`\`\n${summary}\n\`\`\``,
            parentId: agentNode.id
          })
          return
        }

        // Update thinking message
        setTimeout(checkStatus, 1000)
      }

      checkStatus()
    } catch (error) {
      await addNode({
        role: 'assistant',
        content: `Agent error: ${(error as Error).message}`,
        parentId: agentNode.id
      })
    }
  }

  const buildContext = (chat: typeof currentChat, upToNodeId: string): Array<{ role: 'user' | 'assistant'; content: string }> => {
    if (!chat) return []

    const context: Array<{ role: 'user' | 'assistant'; content: string }> = []
    const path: string[] = []

    // Build path from node to root
    let nodeId: string | undefined = upToNodeId
    while (nodeId && chat.nodes[nodeId]) {
      path.unshift(nodeId)
      nodeId = chat.nodes[nodeId].parentId
    }

    // Add nodes to context (skip system and current node)
    for (const id of path) {
      const node = chat.nodes[id]
      if (node.role !== 'system' && id !== upToNodeId) {
        context.push({
          role: node.role as 'user' | 'assistant',
          content: node.content
        })
      }
    }

    return context
  }

  // Handle key press in sl-textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }

    textarea.addEventListener('keydown', handleKeyPress)
    return () => textarea.removeEventListener('keydown', handleKeyPress)
  }, [handleSubmit])

  if (!currentChat) {
    return null
  }

  return (
    <div>
      {/* Input Toolbar */}
      <div className="flex items-center gap-sm" style={{ marginBottom: '12px' }}>
        <sl-tooltip content="Type @agent to use the autonomous agent">
          <sl-badge variant="neutral" pill>
            <sl-icon name="robot" slot="prefix" />
            @agent
          </sl-badge>
        </sl-tooltip>
        <span className="text-sm text-muted">for autonomous execution</span>
      </div>

      {/* Input Area */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}
      >
        <div style={{ flex: 1 }}>
          <sl-textarea
            ref={textareaRef as any}
            placeholder={isLoading ? 'Waiting for response...' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
            value={input}
            onSlInput={(e: Event) => {
              const target = e.target as HTMLTextAreaElement
              setInput(target.value)
            }}
            disabled={isLoading}
            resize="auto"
            rows={1}
            style={{ minHeight: '44px' }}
          />
        </div>

        <sl-button
          variant="primary"
          size="large"
          onSlClick={() => handleSubmit()}
          disabled={!input.trim() || isLoading}
          loading={isLoading}
        >
          <sl-icon slot="prefix" name="send" />
          Send
        </sl-button>
      </div>

      {/* Input Hints */}
      <div className="flex items-center gap-md" style={{ marginTop: '8px' }}>
        <span className="text-sm text-muted">Press Enter to send, Shift+Enter for new line</span>
      </div>
    </div>
  )
}

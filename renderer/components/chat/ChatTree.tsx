import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../../state/workspaceStore'
import { ChatNodeView } from './ChatNode'

export function ChatTreeView() {
  const { currentChat, currentNodeId } = useWorkspaceStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentChat?.nodes, currentNodeId])

  if (!currentChat) {
    return null
  }

  // Build the conversation path from root to current node
  const buildPath = (): string[] => {
    const path: string[] = []
    let nodeId: string | undefined = currentNodeId || undefined

    while (nodeId && currentChat.nodes[nodeId]) {
      path.unshift(nodeId)
      nodeId = currentChat.nodes[nodeId].parentId
    }

    return path
  }

  const path = buildPath()

  return (
    <div ref={scrollRef} style={{ height: '100%', overflow: 'auto' }}>
      <div className="flex flex-col gap-md" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {path.map((nodeId, index) => {
          const node = currentChat.nodes[nodeId]
          if (!node) return null

          const isLast = index === path.length - 1

          return (
            <ChatNodeView
              key={nodeId}
              node={node}
              isActive={isLast}
              hasBranches={node.children.length > 1}
            />
          )
        })}

        {path.length === 0 && (
          <div className="text-center text-muted" style={{ padding: '40px' }}>
            <sl-icon name="chat-square-dots" style={{ fontSize: '48px', opacity: 0.3 }} />
            <p style={{ marginTop: '16px' }}>
              Start typing to begin the conversation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

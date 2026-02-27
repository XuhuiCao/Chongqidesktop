import { useState } from 'react'
import { useWorkspaceStore, ChatNode } from '../../state/workspaceStore'
import Markdown from './Markdown'

interface ChatNodeViewProps {
  node: ChatNode
  isActive: boolean
  hasBranches: boolean
}

export function ChatNodeView({ node, isActive, hasBranches }: ChatNodeViewProps) {
  const { currentChat, branchChat, setCurrentNode } = useWorkspaceStore()
  const [isHovering, setIsHovering] = useState(false)

  const handleBranch = async () => {
    await branchChat(node.id, `${currentChat?.name} (Branch)`)
  }

  const isUser = node.role === 'user'
  const isSystem = node.role === 'system'

  if (isSystem) {
    return null // Don't show system messages in the main view
  }

  return (
    <div
      className="animate-fadeIn"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isUser
            ? '#e8ebe6'
            : 'linear-gradient(135deg, #5d7052, #7a9865)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0
        }}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-sm" style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-sm text-muted">
            {new Date(node.createdAt).toLocaleString()}
          </span>
          {hasBranches && (
            <sl-badge variant="neutral" pill>
              <sl-icon name="diagram-3" slot="prefix" />
              Branched
            </sl-badge>
          )}
        </div>

        <div
          style={{
            background: isUser ? '#f8f9fa' : 'transparent',
            padding: isUser ? '12px 16px' : '8px 0',
            borderRadius: '12px',
            border: isUser ? '1px solid #eaeaea' : 'none'
          }}
        >
          <Markdown content={node.content} />
        </div>

        {/* Node actions */}
        {(isHovering || isActive) && (
          <div className="flex items-center gap-sm" style={{ marginTop: '8px' }}>
            <sl-tooltip content="Branch from this point">
              <sl-button
                size="small"
                variant="text"
                onSlClick={handleBranch}
              >
                <sl-icon slot="prefix" name="diagram-2" />
                Branch
              </sl-button>
            </sl-tooltip>

            {node.metadata?.tokens && (
              <span className="text-sm text-muted">
                {node.metadata.tokens} tokens
              </span>
            )}

            {node.metadata?.latency && (
              <span className="text-sm text-muted">
                {node.metadata.latency}ms
              </span>
            )}
          </div>
        )}

        {/* Show branches if this node has multiple children */}
        {node.children.length > 1 && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #eaeaea'
            }}
          >
            <div style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
              <sl-icon name="diagram-3" /> This message has {node.children.length} branches:
            </div>
            <div className="flex flex-col gap-xs">
              {node.children.map((childId, idx) => {
                const childNode = currentChat?.nodes[childId]
                if (!childNode) return null
                return (
                  <div
                    key={childId}
                    onClick={() => setCurrentNode(childId)}
                    style={{
                      padding: '8px 12px',
                      background: '#ffffff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'rgba(0, 0, 0, 0.88)',
                      border: '1px solid #eaeaea'
                    }}
                  >
                    Branch {idx + 1}: {childNode.content.substring(0, 80)}...
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

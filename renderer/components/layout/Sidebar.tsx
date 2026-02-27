import { useState } from 'react'
import { useWorkspaceStore } from '../../state/workspaceStore'
import { WorkspaceExplorer } from '../workspace/WorkspaceExplorer'

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<'files' | 'chats'>('chats')
  const { currentChat } = useWorkspaceStore()

  return (
    <div className="app-sidebar">
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #eaeaea',
          padding: '8px'
        }}
      >
        <sl-button
          variant={activeTab === 'chats' ? 'primary' : 'text'}
          size="small"
          onSlClick={() => setActiveTab('chats')}
        >
          <sl-icon name="chat-left-text" slot="prefix" />
          Chats
        </sl-button>
        <sl-button
          variant={activeTab === 'files' ? 'primary' : 'text'}
          size="small"
          onSlClick={() => setActiveTab('files')}
        >
          <sl-icon name="folder" slot="prefix" />
          Files
        </sl-button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'chats' ? <ChatList /> : <WorkspaceExplorer />}
      </div>

      {/* Branch Info if in a branched chat */}
      {currentChat && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #eaeaea',
            background: '#f8f9fa'
          }}
        >
          <div className="text-sm text-muted" style={{ marginBottom: '8px' }}>
            Current Context
          </div>
          <ContextTree />
        </div>
      )}
    </div>
  )
}

function ChatList() {
  const { chats, currentChat, createChat, openChat } = useWorkspaceStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newChatName, setNewChatName] = useState('')

  const handleCreate = async () => {
    if (!newChatName) return
    await createChat(newChatName)
    setNewChatName('')
    setShowCreateDialog(false)
  }

  return (
    <div style={{ padding: '8px' }}>
      <div className="flex items-center justify-between" style={{ padding: '8px' }}>
        <span className="text-sm text-muted">Conversations</span>
        <sl-button size="small" variant="text" onSlClick={() => setShowCreateDialog(true)}>
          <sl-icon name="plus-lg" />
        </sl-button>
      </div>

      <div className="flex flex-col gap-xs">
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => openChat(chat.id)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              background: currentChat?.id === chat.id
                ? '#5d7052'
                : 'transparent',
              color: currentChat?.id === chat.id
                ? 'white'
                : 'rgba(0, 0, 0, 0.88)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <sl-icon
              name="chat-left-text"
              style={{
                opacity: currentChat?.id === chat.id ? 1 : 0.7
              }}
            />
            <div className="flex-1 truncate">{chat.name}</div>
          </div>
        ))}

        {chats.length === 0 && (
          <div
            className="text-sm text-muted"
            style={{ padding: '16px', textAlign: 'center' }}
          >
            No conversations yet
          </div>
        )}
      </div>

      <sl-dialog
        label="New Chat"
        open={showCreateDialog}
        onSlShow={() => setShowCreateDialog(true)}
        onSlHide={() => setShowCreateDialog(false)}
      >
        <sl-input
          label="Chat Name"
          placeholder="e.g., Feature Discussion"
          value={newChatName}
          onSlInput={(e: any) => setNewChatName(e.target.value)}
        />
        <div slot="footer">
          <sl-button variant="neutral" onSlClick={() => setShowCreateDialog(false)}>
            Cancel
          </sl-button>
          <sl-button variant="primary" onSlClick={handleCreate} disabled={!newChatName}>
            Create
          </sl-button>
        </div>
      </sl-dialog>
    </div>
  )
}

function ContextTree() {
  const { currentChat, currentNodeId } = useWorkspaceStore()

  if (!currentChat) return null

  // Build path from current node to root
  const path: Array<{ id: string; role: string; preview: string }> = []
  let nodeId: string | undefined = currentNodeId || undefined

  while (nodeId && currentChat.nodes[nodeId]) {
    const node = currentChat.nodes[nodeId]
    path.unshift({
      id: node.id,
      role: node.role,
      preview: node.content.substring(0, 50) + (node.content.length > 50 ? '...' : '')
    })
    nodeId = node.parentId
  }

  return (
    <div className="flex flex-col gap-xs">
      {path.map((node, index) => (
        <div
          key={node.id}
          className="text-sm"
          style={{
            paddingLeft: `${index * 12}px`,
            opacity: index === path.length - 1 ? 1 : 0.5
          }}
        >
          <div className="flex items-center gap-xs">
            {node.role === 'user' ? (
              <sl-icon name="person" style={{ fontSize: '12px' }} />
            ) : node.role === 'assistant' ? (
              <sl-icon name="robot" style={{ fontSize: '12px' }} />
            ) : (
              <sl-icon name="gear" style={{ fontSize: '12px' }} />
            )}
            <span className="truncate">{node.preview}</span>
          </div>
        </div>
      ))}

      {path.length === 0 && (
        <div className="text-sm text-muted" style={{ fontStyle: 'italic' }}>
          Start a new conversation
        </div>
      )}
    </div>
  )
}

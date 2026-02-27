import { useWorkspaceStore } from '../../state/workspaceStore'
import { ChatTreeView } from '../chat/ChatTree'
import { ChatInput } from '../chat/ChatInput'

export function MainPanel() {
  const { currentChat } = useWorkspaceStore()

  return (
    <div className="app-center">
      {currentChat ? (
        <>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <ChatTreeView />
          </div>
          <div
            className="flex-shrink-0"
            style={{
              borderTop: '1px solid #eaeaea',
              padding: '16px',
              background: '#ffffff'
            }}
          >
            <ChatInput />
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function EmptyState() {
  const { createChat } = useWorkspaceStore()

  return (
    <div className="flex flex-col items-center justify-center" style={{ height: '100%' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#f8f9fa',
            border: '1px solid #eaeaea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px'
          }}
        >
          💬
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: 'rgba(0, 0, 0, 0.88)' }}>
          Start a Conversation
        </h2>
        <p style={{ color: 'rgba(0, 0, 0, 0.65)', marginBottom: '24px' }}>
          Create a new chat to begin working with AI, or select an existing conversation from the sidebar.
        </p>

        <sl-button
          variant="primary"
          size="medium"
          onSlClick={() => createChat('New Conversation')}
        >
          <sl-icon slot="prefix" name="plus-lg" />
          New Chat
        </sl-button>

        <div style={{ marginTop: '32px' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>Quick Tips:</p>
          <div className="flex flex-col gap-sm" style={{ textAlign: 'left' }}>
            <div className="flex items-center gap-sm text-sm" style={{ color: 'rgba(0, 0, 0, 0.65)' }}>
              <sl-icon name="lightbulb" style={{ color: '#d89614' }} />
              Use @agent to invoke the autonomous coding agent
            </div>
            <div className="flex items-center gap-sm text-sm" style={{ color: 'rgba(0, 0, 0, 0.65)' }}>
              <sl-icon name="diagram-3" style={{ color: '#5d7052' }} />
              Branch conversations to explore different paths
            </div>
            <div className="flex items-center gap-sm text-sm" style={{ color: 'rgba(0, 0, 0, 0.65)' }}>
              <sl-icon name="book" style={{ color: '#5d7052' }} />
              Add documents to knowledge base for RAG
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

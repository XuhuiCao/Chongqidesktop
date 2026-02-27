import { useState, useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../state/workspaceStore'

interface WorkspaceInfo {
  id: string
  name: string
  path: string
  lastOpened: number
}

export function WelcomeScreen() {
  const { createWorkspace, openWorkspace, openExistingWorkspace } = useWorkspaceStore()
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const loadWorkspaces = async () => {
    const list = await window.electronAPI.workspace.list()
    setWorkspaces(list)
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName || isCreating) return

    setIsCreating(true)
    try {
      const dir = await window.electronAPI.dialog.selectDirectory()
      if (!dir) {
        setIsCreating(false)
        return
      }

      await createWorkspace(newWorkspaceName, dir)
      setShowCreateDialog(false)
      setNewWorkspaceName('')
    } catch (error) {
      console.error('Failed to create workspace:', error)
      alert('Failed to create workspace: ' + (error as Error).message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenExistingWorkspace = async () => {
    if (isOpening) return

    setIsOpening(true)
    try {
      const dir = await window.electronAPI.dialog.selectDirectory()
      if (!dir) {
        setIsOpening(false)
        return
      }

      await openExistingWorkspace(dir)
    } catch (error) {
      console.error('Failed to open workspace:', error)
      alert('Failed to open workspace: ' + (error as Error).message)
    } finally {
      setIsOpening(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newWorkspaceName) {
      handleCreateWorkspace()
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e8ebe6 100%)'
      }}
    >
      <div className="text-center" style={{ maxWidth: '600px', padding: '40px' }}>
        <Logo />
        <Title />
        <Actions
          onCreateClick={() => setShowCreateDialog(true)}
          onOpenClick={handleOpenExistingWorkspace}
          isOpening={isOpening}
        />
        <RecentWorkspaces
          workspaces={workspaces}
          onOpen={openWorkspace}
        />
      </div>

      {showCreateDialog && (
        <CreateDialog
          ref={dialogRef}
          name={newWorkspaceName}
          onNameChange={setNewWorkspaceName}
          onCreate={handleCreateWorkspace}
          onCancel={() => setShowCreateDialog(false)}
          isCreating={isCreating}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  )
}

function Logo() {
  return (
    <div
      style={{
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #5d7052, #7a9865)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 32px',
        fontSize: '40px',
        boxShadow: '0 4px 12px rgba(93, 112, 82, 0.2)'
      }}
    >
      🤖
    </div>
  )
}

function Title() {
  return (
    <>
      <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '12px', color: 'rgba(0, 0, 0, 0.88)' }}>
        AI Desktop Workbench
      </h1>
      <p style={{ fontSize: '16px', color: 'rgba(0, 0, 0, 0.65)', marginBottom: '40px' }}>
        Your local-first AI workspace with agent automation and knowledge management
      </p>
    </>
  )
}

interface ActionsProps {
  onCreateClick: () => void
  onOpenClick: () => void
  isOpening: boolean
}

function Actions({ onCreateClick, onOpenClick, isOpening }: ActionsProps) {
  return (
    <div className="flex flex-col gap-md" style={{ alignItems: 'center' }}>
      <div className="flex flex-col gap-sm" style={{ width: '240px' }}>
        <sl-button
          variant="primary"
          size="large"
          onSlClick={onCreateClick}
        >
          <sl-icon slot="prefix" name="plus-lg" />
          Create New Workspace
        </sl-button>

        <sl-button
          variant="default"
          size="large"
          onSlClick={onOpenClick}
          loading={isOpening}
        >
          <sl-icon slot="prefix" name="folder2-open" />
          Open Workspace
        </sl-button>
      </div>
    </div>
  )
}

interface RecentWorkspacesProps {
  workspaces: WorkspaceInfo[]
  onOpen: (id: string) => Promise<void>
}

function RecentWorkspaces({ workspaces, onOpen }: RecentWorkspacesProps) {
  if (workspaces.length === 0) return null

  return (
    <div style={{ width: '100%', marginTop: '32px' }}>
      <p
        style={{
          fontSize: '14px',
          color: 'rgba(0, 0, 0, 0.45)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '16px'
        }}
      >
        Recent Workspaces
      </p>
      <div className="flex flex-col gap-sm">
        {workspaces
          .sort((a, b) => b.lastOpened - a.lastOpened)
          .slice(0, 5)
          .map(ws => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onClick={() => onOpen(ws.id)}
            />
          ))}
      </div>
    </div>
  )
}

interface WorkspaceCardProps {
  workspace: WorkspaceInfo
  onClick: () => void
}

function WorkspaceCard({ workspace, onClick }: WorkspaceCardProps) {
  return (
    <sl-card
      class="workspace-card"
      onSlClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <sl-icon name="folder" style={{ color: '#5d7052' }} />
          <div>
            <div style={{ fontWeight: 500, color: 'rgba(0, 0, 0, 0.88)' }}>{workspace.name}</div>
            <div style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>{workspace.path}</div>
          </div>
        </div>
        <sl-icon name="chevron-right" style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
      </div>
    </sl-card>
  )
}

interface CreateDialogProps {
  ref: React.RefObject<HTMLDivElement>
  name: string
  onNameChange: (name: string) => void
  onCreate: () => void
  onCancel: () => void
  isCreating: boolean
  onKeyDown: (e: React.KeyboardEvent) => void
}

function CreateDialog({
  ref,
  name,
  onNameChange,
  onCreate,
  onCancel,
  isCreating,
  onKeyDown
}: CreateDialogProps) {
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          onCancel()
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid #eaeaea',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)'
        }}
      >
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: 'rgba(0, 0, 0, 0.88)' }}>
          Create New Workspace
        </h2>

        <div className="flex flex-col gap-md">
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.88)' }}>
              Workspace Name
            </label>
            <input
              type="text"
              placeholder="My Project"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #eaeaea',
                background: '#ffffff',
                color: 'rgba(0, 0, 0, 0.88)',
                fontSize: '14px'
              }}
            />
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
            You will be prompted to select a directory for the workspace.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isCreating}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #eaeaea',
              background: '#ffffff',
              color: 'rgba(0, 0, 0, 0.88)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!name || isCreating}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#5d7052',
              color: 'white',
              cursor: name ? 'pointer' : 'not-allowed',
              opacity: name ? 1 : 0.5,
              fontSize: '14px'
            }}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

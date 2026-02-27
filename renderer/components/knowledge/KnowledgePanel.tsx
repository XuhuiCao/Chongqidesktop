import { useState, useEffect, useCallback } from 'react'
import { useWorkspaceStore, Document } from '../../state/workspaceStore'

// Shoelace custom event type
interface SlInputEvent extends CustomEvent<{ value: string }> {
  target: EventTarget & { value: string }
}

export function KnowledgePanel() {
  const { currentWorkspace } = useWorkspaceStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ document: Document; score: number }> | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocSource, setNewDocSource] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSlInput = (e: SlInputEvent, setter: (value: string) => void) => {
    setter(e.target.value)
  }

  const loadDocuments = useCallback(async () => {
    if (!currentWorkspace) return
    try {
      const docs = await window.electronAPI.knowledge.list()
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }, [currentWorkspace])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }

    setIsLoading(true)
    try {
      const results = await window.electronAPI.knowledge.search(searchQuery, 5)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDocument = async () => {
    if (!newDocContent.trim() || !newDocSource.trim()) return

    setIsLoading(true)
    try {
      await window.electronAPI.knowledge.add(newDocContent, newDocSource)
      setNewDocContent('')
      setNewDocSource('')
      setShowAddDialog(false)
      loadDocuments()
    } catch (error) {
      console.error('Failed to add document:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await window.electronAPI.knowledge.delete(id)
      loadDocuments()
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100%' }}>
        <span className="text-muted">Open a workspace to use knowledge base</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search */}
      <div style={{ padding: '16px', borderBottom: '1px solid #eaeaea' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <sl-input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onSlInput={(e: unknown) => handleSlInput(e as SlInputEvent, setSearchQuery)}
            onKeyDown={(e: unknown) => (e as KeyboardEvent).key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          >
            <sl-icon slot="prefix" name="search" />
          </sl-input>
          <sl-button variant="primary" onSlClick={handleSearch} loading={isLoading}>
            Search
          </sl-button>
        </div>
      </div>

      {/* Add Button */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #eaeaea',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span className="text-sm text-muted">
          {documents.length} documents
        </span>
        <sl-button variant="primary" size="small" onSlClick={() => setShowAddDialog(true)}>
          <sl-icon slot="prefix" name="plus-lg" />
          Add
        </sl-button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ padding: '8px' }}>
        {searchResults ? (
          <SearchResults
            results={searchResults}
            onClear={() => setSearchResults(null)}
          />
        ) : (
          <DocumentList
            documents={documents}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Add Document Dialog */}
      <sl-dialog
        label="Add to Knowledge Base"
        open={showAddDialog}
        onSlShow={() => setShowAddDialog(true)}
        onSlHide={() => setShowAddDialog(false)}
      >
        <div className="flex flex-col gap-md">
          <sl-input
            label="Source"
            placeholder="e.g., project-docs.md or https://example.com"
            value={newDocSource}
            onSlInput={(e: unknown) => handleSlInput(e as SlInputEvent, setNewDocSource)}
          />
          <sl-textarea
            label="Content"
            placeholder="Paste or type the content to add..."
            value={newDocContent}
            onSlInput={(e: unknown) => handleSlInput(e as SlInputEvent, setNewDocContent)}
            rows={10}
          />
        </div>
        <div slot="footer">
          <sl-button variant="neutral" onSlClick={() => setShowAddDialog(false)}>
            Cancel
          </sl-button>
          <sl-button
            variant="primary"
            onSlClick={handleAddDocument}
            disabled={!newDocContent.trim() || !newDocSource.trim()}
            loading={isLoading}
          >
            Add Document
          </sl-button>
        </div>
      </sl-dialog>
    </div>
  )
}

function DocumentList({
  documents,
  onDelete
}: {
  documents: Document[]
  onDelete: (id: string) => void
}) {
  if (documents.length === 0) {
    return (
      <div className="text-center" style={{ padding: '40px 20px' }}>
        <sl-icon
          name="database-slash"
          style={{ fontSize: '48px', opacity: 0.3, display: 'block', marginBottom: '16px' }}
        />
        <p className="text-muted">No documents in knowledge base</p>
        <p className="text-sm text-muted" style={{ marginTop: '8px' }}>
          Add documents to enable RAG search
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-sm">
      {documents.map(doc => (
        <sl-card key={doc.id}>
          <div className="flex items-start justify-between gap-md">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-sm" style={{ marginBottom: '4px' }}>
                <sl-icon name="file-text" style={{ color: '#5d7052' }} />
                <span className="text-sm" style={{ fontWeight: 500 }}>
                  {doc.source}
                </span>
              </div>
              <p
                className="text-sm text-muted"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {doc.content}
              </p>
              <p className="text-sm text-muted" style={{ marginTop: '8px' }}>
                {new Date(doc.createdAt).toLocaleString()}
              </p>
            </div>
            <sl-button
              variant="text"
              size="small"
              onSlClick={() => onDelete(doc.id)}
            >
              <sl-icon name="trash" />
            </sl-button>
          </div>
        </sl-card>
      ))}
    </div>
  )
}

function SearchResults({
  results,
  onClear
}: {
  results: Array<{ document: Document; score: number }>
  onClear: () => void
}) {
  if (results.length === 0) {
    return (
      <div className="text-center" style={{ padding: '40px 20px' }}>
        <sl-icon name="search" style={{ fontSize: '48px', opacity: 0.3 }} />
        <p className="text-muted" style={{ marginTop: '16px' }}>
          No results found
        </p>
        <sl-button variant="text" onSlClick={onClear}>
          Clear search
        </sl-button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ padding: '8px' }}>
        <span className="text-sm text-muted">{results.length} results</span>
        <sl-button variant="text" size="small" onSlClick={onClear}>
          Clear
        </sl-button>
      </div>

      <div className="flex flex-col gap-sm">
        {results.map(({ document, score }, index) => (
          <sl-card key={document.id}>
            <div className="flex items-center gap-sm" style={{ marginBottom: '8px' }}>
              <sl-badge variant="primary" pill>
                #{index + 1}
              </sl-badge>
              <sl-badge variant="success" pill>
                {(score * 100).toFixed(1)}% match
              </sl-badge>
              <span className="text-sm" style={{ fontWeight: 500 }}>
                {document.source}
              </span>
            </div>
            <p
              className="text-sm"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.6'
              }}
            >
              {document.content}
            </p>
          </sl-card>
        ))}
      </div>
    </div>
  )
}

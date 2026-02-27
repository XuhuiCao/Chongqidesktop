import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../state/workspaceStore'

interface FileNode {
  name: string
  isDir: boolean
  children?: FileNode[]
}

export function WorkspaceExplorer() {
  const { currentWorkspace } = useWorkspaceStore()
  const [files, setFiles] = useState<FileNode[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['.']))
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    if (currentWorkspace) {
      loadFiles('.')
    }
  }, [currentWorkspace])

  const loadFiles = async (path: string) => {
    try {
      const entries = await window.electronAPI.fs.list(path)
      setFiles(entries.map(e => ({ name: e.name, isDir: e.isDir, children: e.isDir ? [] : undefined })))
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }

  const toggleDir = async (dirName: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(dirName)) {
      newExpanded.delete(dirName)
    } else {
      newExpanded.add(dirName)
    }
    setExpandedDirs(newExpanded)
  }

  const handleFileClick = async (fileName: string, isDir: boolean) => {
    if (isDir) {
      toggleDir(fileName)
    } else {
      setSelectedFile(fileName)
      // Could open file in editor
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100%' }}>
        <span className="text-muted">No workspace open</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
        <span className="text-sm text-muted">Workspace Files</span>
        <sl-button
          size="small"
          variant="text"
          onSlClick={() => loadFiles('.')}
        >
          <sl-icon name="arrow-clockwise" />
        </sl-button>
      </div>

      <div className="flex flex-col gap-xs">
        {files.map(file => (
          <FileTreeItem
            key={file.name}
            file={file}
            level={0}
            expandedDirs={expandedDirs}
            selectedFile={selectedFile}
            onToggle={toggleDir}
            onSelect={handleFileClick}
          />
        ))}

        {files.length === 0 && (
          <div className="text-sm text-muted" style={{ padding: '16px', textAlign: 'center' }}>
            No files yet
          </div>
        )}
      </div>
    </div>
  )
}

interface FileTreeItemProps {
  file: FileNode
  level: number
  expandedDirs: Set<string>
  selectedFile: string | null
  onToggle: (name: string) => void
  onSelect: (name: string, isDir: boolean) => void
}

function FileTreeItem({ file, level, expandedDirs, selectedFile, onToggle, onSelect }: FileTreeItemProps) {
  const isExpanded = expandedDirs.has(file.name)
  const isSelected = selectedFile === file.name

  return (
    <div>
      <div
        onClick={() => onSelect(file.name, file.isDir)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          paddingLeft: `${8 + level * 16}px`,
          borderRadius: '4px',
          cursor: 'pointer',
          background: isSelected ? '#5d7052' : 'transparent',
          color: isSelected ? 'white' : 'rgba(0, 0, 0, 0.88)'
        }}
      >
        {file.isDir ? (
          <span onClick={(e) => { e.stopPropagation(); onToggle(file.name) }}>
            <sl-icon
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              style={{ opacity: 0.6, cursor: 'pointer' }}
            />
          </span>
        ) : (
          <span style={{ width: '16px' }} />
        )}

        <sl-icon
          name={file.isDir ? (isExpanded ? 'folder2-open' : 'folder') : getFileIcon(file.name)}
          style={{ color: file.isDir ? '#5d7052' : 'rgba(0, 0, 0, 0.65)' }}
        />

        <span className="truncate">{file.name}</span>
      </div>

      {file.isDir && isExpanded && file.children && (
        <div>
          {file.children.map(child => (
            <FileTreeItem
              key={child.name}
              file={child}
              level={level + 1}
              expandedDirs={expandedDirs}
              selectedFile={selectedFile}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()

  const iconMap: Record<string, string> = {
    'ts': 'filetype-tsx',
    'tsx': 'filetype-tsx',
    'js': 'filetype-js',
    'jsx': 'filetype-jsx',
    'json': 'filetype-json',
    'md': 'filetype-md',
    'html': 'filetype-html',
    'css': 'filetype-css',
    'py': 'filetype-py',
    'java': 'filetype-java',
    'sql': 'filetype-sql',
    'yml': 'filetype-yml',
    'yaml': 'filetype-yml',
  }

  return iconMap[ext || ''] || 'file-earmark'
}

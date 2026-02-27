import { useState } from 'react'
import { TaskFlowCanvas } from '../flow/TaskFlowCanvas'
import { KnowledgePanel } from '../knowledge/KnowledgePanel'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<'flow' | 'knowledge'>('flow')

  return (
    <div className="app-right">
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #eaeaea',
          padding: '8px'
        }}
      >
        <sl-button
          variant={activeTab === 'flow' ? 'primary' : 'text'}
          size="small"
          onSlClick={() => setActiveTab('flow')}
        >
          <sl-icon name="diagram-3" slot="prefix" />
          Flow
        </sl-button>
        <sl-button
          variant={activeTab === 'knowledge' ? 'primary' : 'text'}
          size="small"
          onSlClick={() => setActiveTab('knowledge')}
        >
          <sl-icon name="database" slot="prefix" />
          Knowledge
        </sl-button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ position: 'relative' }}>
        {activeTab === 'flow' ? <TaskFlowCanvas /> : <KnowledgePanel />}
      </div>
    </div>
  )
}

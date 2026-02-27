import { useState } from 'react'
import { useWorkspaceStore } from '../../state/workspaceStore'

export function TopBar() {
  const { currentWorkspace, closeWorkspace } = useWorkspaceStore()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <div className="app-topbar" style={{ padding: '0 24px 0 85px' }}>
        <div className="flex items-center gap-md" style={{ flex: 1 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #5d7052, #7a9865)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            🤖
          </div>

          {currentWorkspace && (
            <>
              <div className="flex items-center gap-sm" style={{ minWidth: 0 }}>
                <sl-icon name="folder-fill" style={{ color: '#5d7052', flexShrink: 0 }} />
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentWorkspace.name}
                </span>
              </div>

              <div
                style={{
                  width: '1px',
                  height: '20px',
                  background: '#eaeaea',
                  margin: '0 8px',
                  flexShrink: 0
                }}
              />

              <ModelSelector />
            </>
          )}
        </div>

        <div className="flex items-center gap-sm">
          <sl-button
            variant="neutral"
            size="small"
            circle
            onSlClick={() => setShowSettings(true)}
          >
            <sl-icon name="gear" />
          </sl-button>

          <sl-button
            variant="neutral"
            size="small"
            circle
            onSlClick={() => closeWorkspace()}
            title="Close Workspace"
          >
            <sl-icon name="box-arrow-right" />
          </sl-button>
        </div>
      </div>

      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}

function ModelSelector() {
  const { models, currentWorkspace, updateWorkspaceConfig } = useWorkspaceStore()
  const [isOpen, setIsOpen] = useState(false)

  const currentModel = currentWorkspace?.config.models.default || 'Select Model'

  const handleSelect = (model: string) => {
    updateWorkspaceConfig({
      models: { ...currentWorkspace!.config.models, default: model }
    })
    setIsOpen(false)
  }

  return (
    <sl-dropdown open={isOpen} onSlShow={() => setIsOpen(true)} onSlHide={() => setIsOpen(false)}>
      <sl-button slot="trigger" variant="text" size="small">
        <sl-icon slot="prefix" name="cpu" />
        {currentModel}
        <sl-icon slot="suffix" name="chevron-down" />
      </sl-button>

      <sl-menu style={{ minWidth: '200px' }}>
        {models.length === 0 ? (
          <sl-menu-item disabled>No models configured</sl-menu-item>
        ) : (
          models.map(model => (
            <sl-menu-item
              key={model}
              checked={model === currentModel}
              onSlClick={() => handleSelect(model)}
            >
              {model}
            </sl-menu-item>
          ))
        )}
      </sl-menu>
    </sl-dropdown>
  )
}

function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentWorkspace, updateWorkspaceConfig } = useWorkspaceStore()
  const [apiKeys, setApiKeys] = useState(currentWorkspace?.config.apiKeys || {
    openai: '',
    anthropic: '',
    deepseek: '',
    ollama: ''
  })
  const [agentModel, setAgentModel] = useState(currentWorkspace?.config.models.agent || 'claude')
  const [activeTab, setActiveTab] = useState('api')

  const handleSave = async () => {
    await updateWorkspaceConfig({
      apiKeys,
      models: {
        ...currentWorkspace!.config.models,
        agent: agentModel
      }
    })
    onClose()
  }

  return (
    <sl-dialog label="Settings" open={open} onSlHide={onClose} style={{ '--width': '500px' } as any}>
      <sl-tab-group activeTab={activeTab} onSlTabShow={(e: any) => setActiveTab(e.detail.name)}>
        <sl-tab slot="nav" panel="api">API Keys</sl-tab>
        <sl-tab slot="nav" panel="agent">Agent</sl-tab>

        <sl-tab-panel name="api">
          <div className="flex flex-col gap-md" style={{ padding: '16px 0' }}>
            <sl-input
              label="OpenAI API Key"
              type="password"
              value={apiKeys.openai}
              onSlInput={(e: any) => setApiKeys({ ...apiKeys, openai: e.target.value })}
              placeholder="sk-..."
            />
            <sl-input
              label="Anthropic API Key"
              type="password"
              value={apiKeys.anthropic}
              onSlInput={(e: any) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
              placeholder="sk-ant-..."
            />
            <sl-input
              label="DeepSeek API Key"
              type="password"
              value={apiKeys.deepseek}
              onSlInput={(e: any) => setApiKeys({ ...apiKeys, deepseek: e.target.value })}
              placeholder="..."
            />
            <sl-input
              label="Ollama Base URL"
              type="text"
              value={apiKeys.ollama}
              onSlInput={(e: any) => setApiKeys({ ...apiKeys, ollama: e.target.value })}
              placeholder="http://localhost:11434"
            />
          </div>
        </sl-tab-panel>

        <sl-tab-panel name="agent">
          <div className="flex flex-col gap-md" style={{ padding: '16px 0' }}>
            <sl-select
              label="Agent Model"
              value={agentModel}
              onSlChange={(e: any) => setAgentModel(e.target.value)}
            >
              <sl-option value="claude">Claude</sl-option>
              <sl-option value="gpt-4">GPT-4</sl-option>
              <sl-option value="gpt-3.5-turbo">GPT-3.5 Turbo</sl-option>
              <sl-option value="deepseek">DeepSeek</sl-option>
              <sl-option value="ollama">Ollama (Local)</sl-option>
            </sl-select>

            <sl-alert variant="info" open>
              <sl-icon slot="icon" name="info-circle" />
              The agent model is used for autonomous task execution with tool calling.
            </sl-alert>
          </div>
        </sl-tab-panel>
      </sl-tab-group>

      <div slot="footer">
        <sl-button variant="neutral" onSlClick={onClose}>
          Cancel
        </sl-button>
        <sl-button variant="primary" onSlClick={handleSave}>
          Save
        </sl-button>
      </div>
    </sl-dialog>
  )
}

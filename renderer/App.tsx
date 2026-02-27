import { useEffect, useState } from 'react'
import { TopBar } from './components/layout/TopBar'
import { Sidebar } from './components/layout/Sidebar'
import { MainPanel } from './components/layout/MainPanel'
import { RightPanel } from './components/layout/RightPanel'
import { WelcomeScreen } from './components/WelcomeScreen'
import { useWorkspaceStore } from './state/workspaceStore'

function App() {
  const { currentWorkspace, initialize } = useWorkspaceStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initialize().then(() => {
      setIsLoading(false)
    })
  }, [initialize])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', background: '#f8f9fa' }}>
        <sl-spinner style={{ fontSize: '2rem' }} />
      </div>
    )
  }

  if (!currentWorkspace) {
    return <WelcomeScreen />
  }

  return (
    <div className="app-container">
      <TopBar />
      <div className="app-main">
        <Sidebar />
        <MainPanel />
        <RightPanel />
      </div>
    </div>
  )
}

export default App

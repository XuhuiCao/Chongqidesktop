import { useState, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkspaceStore } from '../../state/workspaceStore'

interface FlowNodeData extends Record<string, unknown> {
  label: string
  description?: string
  status?: 'pending' | 'running' | 'success' | 'error'
  details?: Record<string, unknown>
}

// Node type definitions with custom styling
const nodeStyles: Record<string, React.CSSProperties> = {
  start: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    padding: '12px 24px',
    fontWeight: 500
  },
  plan: {
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px'
  },
  tool: {
    background: '#0891b2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px'
  },
  result: {
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px'
  },
  loop: {
    background: '#d97706',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  end: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    padding: '12px 24px',
    fontWeight: 500
  }
}

// Custom node component
function CustomNode({ data, type }: { data: FlowNodeData; type: string }) {
  const status = data.status || 'pending'
  const statusColors = {
    pending: '#6b7280',
    running: '#3b82f6',
    success: '#10b981',
    error: '#ef4444'
  }

  return (
    <div
      style={{
        ...nodeStyles[type] || nodeStyles.plan,
        borderLeft: `4px solid ${statusColors[status]}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div style={{ fontWeight: 500 }}>{data.label}</div>
      {data.description && (
        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
          {data.description}
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  start: CustomNode,
  plan: CustomNode,
  tool: CustomNode,
  result: CustomNode,
  loop: CustomNode,
  end: CustomNode
}

export function TaskFlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { currentChat } = useWorkspaceStore()
  const [isSimulating, setIsSimulating] = useState(false)

  // Generate flow visualization from chat when it changes
  useEffect(() => {
    if (currentChat) {
      generateFlowFromChat(currentChat)
    } else {
      // Show example flow
      setNodes([
        {
          id: '1',
          type: 'start',
          position: { x: 250, y: 0 },
          data: { label: 'Start', status: 'success' }
        },
        {
          id: '2',
          type: 'plan',
          position: { x: 250, y: 100 },
          data: { label: 'Analyze Request', description: 'Parse user intent', status: 'success' }
        },
        {
          id: '3',
          type: 'tool',
          position: { x: 250, y: 220 },
          data: { label: 'Search Knowledge', description: 'Query vector store', status: 'pending' }
        },
        {
          id: '4',
          type: 'result',
          position: { x: 250, y: 340 },
          data: { label: 'Generate Response', description: 'LLM completion', status: 'pending' }
        },
        {
          id: '5',
          type: 'end',
          position: { x: 250, y: 460 },
          data: { label: 'Complete', status: 'pending' }
        }
      ])

      setEdges([
        { id: 'e1-2', source: '1', target: '2', animated: true },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' }
      ])
    }
  }, [currentChat])

  const generateFlowFromChat = (chat: typeof currentChat) => {
    if (!chat) return

    // Generate nodes from chat tree
    const flowNodes: Node<FlowNodeData>[] = []
    const flowEdges: Edge[] = []

    let yOffset = 0
    const xOffset = 250

    // Traverse the chat tree
    const traverse = (nodeId: string, parentId?: string, depth: number = 0) => {
      const node = chat.nodes[nodeId]
      if (!node || node.role === 'system') return

      const flowNode: Node<FlowNodeData> = {
        id: nodeId,
        type: node.role === 'user' ? 'plan' : 'result',
        position: { x: xOffset + depth * 50, y: yOffset },
        data: {
          label: node.role === 'user' ? 'User Input' : 'Assistant Response',
          description: node.content.substring(0, 50) + '...',
          status: 'success'
        }
      }

      flowNodes.push(flowNode)

      if (parentId) {
        flowEdges.push({
          id: `e-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          animated: true
        })
      }

      yOffset += 120

      // Process children
      for (const childId of node.children) {
        traverse(childId, nodeId, depth + 1)
      }
    }

    // Start from root
    traverse(chat.rootNodeId)

    setNodes(flowNodes)
    setEdges(flowEdges)
  }

  const simulateExecution = useCallback(() => {
    setIsSimulating(true)

    const newNodes = [...nodes]
    let step = 0

    const interval = setInterval(() => {
      if (step >= newNodes.length) {
        clearInterval(interval)
        setIsSimulating(false)
        return
      }

      setNodes(prev => prev.map((node, idx) => ({
        ...node,
        data: {
          ...node.data,
          status: idx <= step ? 'success' : 'pending'
        }
      })))

      step++
    }, 1000)

    return () => clearInterval(interval)
  }, [nodes, setNodes])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #eaeaea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span className="text-sm text-muted">Task Flow Visualization</span>
        <sl-button
          size="small"
          variant="primary"
          onSlClick={simulateExecution}
          disabled={isSimulating}
        >
          <sl-icon slot="prefix" name={isSimulating ? 'play-fill' : 'play'} />
          {isSimulating ? 'Running...' : 'Simulate'}
        </sl-button>
      </div>

      {/* React Flow Canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: '#f8f9fa' }}
        >
          <Background color="#eaeaea" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const status = (node.data as FlowNodeData).status
              const colors = {
                pending: '#6b7280',
                running: '#3b82f6',
                success: '#10b981',
                error: '#ef4444'
              }
              return colors[status || 'pending']
            }}
            maskColor="rgba(0, 0, 0, 0.2)"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid #eaeaea',
          display: 'flex',
          gap: '16px',
          fontSize: '12px'
        }}
      >
        <div className="flex items-center gap-xs">
          <span style={{ width: '12px', height: '12px', background: '#4f46e5', borderRadius: '50%' }} />
          Start
        </div>
        <div className="flex items-center gap-xs">
          <span style={{ width: '12px', height: '12px', background: '#7c3aed', borderRadius: '2px' }} />
          Plan
        </div>
        <div className="flex items-center gap-xs">
          <span style={{ width: '12px', height: '12px', background: '#0891b2', borderRadius: '2px' }} />
          Tool
        </div>
        <div className="flex items-center gap-xs">
          <span style={{ width: '12px', height: '12px', background: '#059669', borderRadius: '2px' }} />
          Result
        </div>
      </div>
    </div>
  )
}

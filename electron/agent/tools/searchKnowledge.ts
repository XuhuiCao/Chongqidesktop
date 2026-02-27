import { Tool } from '../../types.js'
import { VectorStore } from '../../knowledge/vectorStore.js'

export function createSearchKnowledgeTool(vectorStore: VectorStore): Tool {
  return {
    name: 'search_knowledge',
    description: 'Search the local knowledge base for relevant information',
    parameters: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      topK: {
        type: 'number',
        description: 'Number of results to return (optional, defaults to 5)'
      }
    },
    execute: async (args: Record<string, unknown>): Promise<string> => {
      const query = args.query as string
      const topK = (args.topK as number) || 5

      if (!query) {
        throw new Error('Query parameter is required')
      }

      try {
        const results = await vectorStore.search(query, topK)

        if (results.length === 0) {
          return 'No relevant documents found in the knowledge base.'
        }

        const formatted = results.map((r, i) => {
          return `[${i + 1}] Score: ${(r.score * 100).toFixed(1)}%\nSource: ${r.document.source}\nContent: ${r.document.content.substring(0, 500)}${r.document.content.length > 500 ? '...' : ''}`
        }).join('\n\n')

        return `Found ${results.length} relevant documents:\n\n${formatted}`
      } catch (error) {
        throw new Error(`Search failed: ${(error as Error).message}`)
      }
    }
  }
}

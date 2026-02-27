// Simple embedding implementation using statistical method
// For production, use a proper embedding model API

export interface EmbeddingModel {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

// Simple TF-IDF based embedding for demo purposes
// In production, replace with actual embedding API
export class SimpleEmbedding implements EmbeddingModel {
  private vectorSize: number = 384

  async embed(text: string): Promise<number[]> {
    // Normalize text
    const normalized = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Create word frequency vector
    const words = normalized.split(' ')
    const wordFreq = new Map<string, number>()

    for (const word of words) {
      if (word.length > 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      }
    }

    // Create fixed-size vector using hashing trick
    const vector = new Array(this.vectorSize).fill(0)

    for (const [word, freq] of wordFreq) {
      // Simple hash function
      let hash = 0
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i)
        hash = hash & hash
      }

      const index = Math.abs(hash) % this.vectorSize
      vector[index] += freq / words.length
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
    if (magnitude > 0) {
      return vector.map(v => v / magnitude)
    }

    return vector
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)))
  }
}

// OpenAI embedding adapter
export class OpenAIEmbedding implements EmbeddingModel {
  private apiKey: string
  private model: string = 'text-embedding-ada-002'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: text
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: texts
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((d: any) => d.embedding)
  }
}

export const simpleEmbedding = new SimpleEmbedding()

import { Document, SearchResult } from '../types.js'
import { EmbeddingModel, simpleEmbedding } from './embedding.js'
import Database from 'better-sqlite3'
import * as path from 'path'
import { workspaceManager } from '../workspace/workspaceManager.js'

export class VectorStore {
  private db: Database.Database | null = null
  private embedding: EmbeddingModel
  private documents: Map<string, Document> = new Map()
  private vectors: Map<string, number[]> = new Map()

  constructor(embedding?: EmbeddingModel) {
    this.embedding = embedding || simpleEmbedding
  }

  async initialize(): Promise<void> {
    const workspacePath = workspaceManager.getCurrentWorkspacePath()
    if (!workspacePath) {
      throw new Error('No workspace is currently open')
    }

    const dbPath = path.join(workspacePath, 'embeddings.db')
    this.db = new Database(dbPath)

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        doc_id TEXT PRIMARY KEY,
        vector TEXT NOT NULL,
        FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
    `)

    // Load existing documents
    await this.loadFromDatabase()
  }

  private loadFromDatabase(): void {
    if (!this.db) return

    const docs = this.db.prepare('SELECT * FROM documents').all() as any[]
    for (const row of docs) {
      const doc: Document = {
        id: row.id,
        content: row.content,
        source: row.source,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        createdAt: row.created_at
      }
      this.documents.set(doc.id, doc)
    }

    const embeddings = this.db.prepare('SELECT * FROM embeddings').all() as any[]
    for (const row of embeddings) {
      this.vectors.set(row.doc_id, JSON.parse(row.vector))
    }
  }

  async addDocument(content: string, source: string, metadata?: Record<string, unknown>): Promise<Document> {
    if (!this.db) {
      throw new Error('Vector store not initialized')
    }

    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    const doc: Document = {
      id,
      content,
      source,
      metadata,
      createdAt: now
    }

    // Generate embedding
    const vector = await this.embedding.embed(content)

    // Insert into database
    const insertDoc = this.db.prepare(`
      INSERT INTO documents (id, content, source, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const insertEmb = this.db.prepare(`
      INSERT INTO embeddings (doc_id, vector)
      VALUES (?, ?)
    `)

    insertDoc.run(id, content, source, metadata ? JSON.stringify(metadata) : null, now)
    insertEmb.run(id, JSON.stringify(vector))

    // Cache in memory
    this.documents.set(id, doc)
    this.vectors.set(id, vector)

    return doc
  }

  async addDocuments(documents: Array<{ content: string; source: string; metadata?: Record<string, unknown> }>): Promise<Document[]> {
    const results: Document[] = []
    for (const doc of documents) {
      results.push(await this.addDocument(doc.content, doc.source, doc.metadata))
    }
    return results
  }

  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.db || this.documents.size === 0) {
      return []
    }

    // Generate query embedding
    const queryVector = await this.embedding.embed(query)

    // Calculate cosine similarity for all documents
    const scores: Array<{ docId: string; score: number }> = []

    for (const [docId, vector] of this.vectors) {
      const score = this.cosineSimilarity(queryVector, vector)
      scores.push({ docId, score })
    }

    // Sort by score descending and take top K
    scores.sort((a, b) => b.score - a.score)
    const topScores = scores.slice(0, topK)

    return topScores.map(({ docId, score }) => ({
      document: this.documents.get(docId)!,
      score
    }))
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.db) return

    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id)
    this.documents.delete(id)
    this.vectors.delete(id)
  }

  listDocuments(): Document[] {
    return Array.from(this.documents.values())
  }

  getDocument(id: string): Document | undefined {
    return this.documents.get(id)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  close(): void {
    this.db?.close()
    this.db = null
    this.documents.clear()
    this.vectors.clear()
  }
}

export const vectorStore = new VectorStore()

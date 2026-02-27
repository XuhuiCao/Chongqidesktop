import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Types (copied from types.ts to avoid circular dependencies)
export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface LLMProvider {
  name: string
  chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>
  stream?(messages: Message[], options?: LLMOptions): AsyncGenerator<string>
}

export class OpenAIAdapter implements LLMProvider {
  name = 'openai'
  private client: OpenAI
  private defaultModel: string

  constructor(apiKey: string, defaultModel: string = 'gpt-4') {
    this.client = new OpenAI({ apiKey })
    this.defaultModel = defaultModel
  }

  async chat(messages: Message[], options: LLMOptions = {}): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    }
  }

  async *stream(messages: Message[], options: LLMOptions = {}): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }
}

export class ClaudeAdapter implements LLMProvider {
  name = 'anthropic'
  private client: Anthropic
  private defaultModel: string

  constructor(apiKey: string, defaultModel: string = 'claude-3-sonnet-20240229') {
    this.client = new Anthropic({ apiKey })
    this.defaultModel = defaultModel
  }

  async chat(messages: Message[], options: LLMOptions = {}): Promise<LLMResponse> {
    // Convert messages to Claude format
    const systemMessage = messages.find(m => m.role === 'system')?.content
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    const response = await this.client.messages.create({
      model: options.model || this.defaultModel,
      messages: conversationMessages,
      system: systemMessage,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096
    })

    const content = response.content
      .filter(c => c.type === 'text')
      .map(c => (c as any).text)
      .join('')

    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      }
    }
  }

  async *stream(messages: Message[], options: LLMOptions = {}): AsyncGenerator<string> {
    const systemMessage = messages.find(m => m.role === 'system')?.content
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    const stream = await this.client.messages.create({
      model: options.model || this.defaultModel,
      messages: conversationMessages,
      system: systemMessage,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: true
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }
}

export class DeepSeekAdapter implements LLMProvider {
  name = 'deepseek'
  private client: OpenAI
  private defaultModel: string

  constructor(apiKey: string, defaultModel: string = 'deepseek-chat') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    })
    this.defaultModel = defaultModel
  }

  async chat(messages: Message[], options: LLMOptions = {}): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    }
  }

  async *stream(messages: Message[], options: LLMOptions = {}): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }
}

export class OllamaAdapter implements LLMProvider {
  name = 'ollama'
  private baseURL: string
  private defaultModel: string

  constructor(baseURL: string = 'http://localhost:11434', defaultModel: string = 'llama2') {
    this.baseURL = baseURL
    this.defaultModel = defaultModel
  }

  async chat(messages: Message[], options: LLMOptions = {}): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.message?.content || ''
    }
  }

  async *stream(messages: Message[], options: LLMOptions = {}): AsyncGenerator<string> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            yield data.message.content
          }
          if (data.done) {
            return
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

export class ModelGateway {
  private providers: Map<string, LLMProvider> = new Map()

  registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider)
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name)
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  async chat(providerName: string, messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }
    return provider.chat(messages, options)
  }

  async *stream(providerName: string, messages: Message[], options?: LLMOptions): AsyncGenerator<string> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }
    if (!provider.stream) {
      throw new Error(`Provider ${providerName} does not support streaming`)
    }
    yield* provider.stream(messages, options)
  }
}

export const modelGateway = new ModelGateway()

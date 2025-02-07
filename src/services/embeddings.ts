import ollama from 'ollama';
import OpenAI from 'openai';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export interface EmbeddingProvider {
  generateEmbeddings(text: string): Promise<number[]>;
  getVectorSize(): number;
}

export class OllamaProvider implements EmbeddingProvider {
  private model: string;

  constructor(model: string = 'nomic-embed-text') {
    this.model = model;
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      console.error('Generating Ollama embeddings for text:', text.substring(0, 50) + '...');
      const response = await ollama.embeddings({
        model: this.model,
        prompt: text
      });
      console.error('Successfully generated Ollama embeddings with size:', response.embedding.length);
      return response.embedding;
    } catch (error) {
      console.error('Ollama embedding error:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to generate embeddings with Ollama: ${error}`
      );
    }
  }

  getVectorSize(): number {
    // nomic-embed-text produces 768-dimensional vectors
    return 768;
  }
}

export class OpenAIProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      console.error('Generating OpenAI embeddings for text:', text.substring(0, 50) + '...');
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });
      const embedding = response.data[0].embedding;
      console.error('Successfully generated OpenAI embeddings with size:', embedding.length);
      return embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to generate embeddings with OpenAI: ${error}`
      );
    }
  }

  getVectorSize(): number {
    // text-embedding-3-small produces 1536-dimensional vectors
    return 1536;
  }
}

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private fallbackProvider?: EmbeddingProvider;

  constructor(provider: EmbeddingProvider, fallbackProvider?: EmbeddingProvider) {
    this.provider = provider;
    this.fallbackProvider = fallbackProvider;
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      return await this.provider.generateEmbeddings(text);
    } catch (error) {
      if (this.fallbackProvider) {
        console.error('Primary provider failed, trying fallback provider...');
        return this.fallbackProvider.generateEmbeddings(text);
      }
      throw error;
    }
  }

  getVectorSize(): number {
    return this.provider.getVectorSize();
  }

  static createFromConfig(config: {
    provider: 'ollama' | 'openai';
    apiKey?: string;
    model?: string;
    fallbackProvider?: 'ollama' | 'openai';
    fallbackApiKey?: string;
    fallbackModel?: string;
  }): EmbeddingService {
    const primaryProvider = EmbeddingService.createProvider(
      config.provider,
      config.apiKey,
      config.model
    );

    let fallbackProvider: EmbeddingProvider | undefined;
    if (config.fallbackProvider) {
      fallbackProvider = EmbeddingService.createProvider(
        config.fallbackProvider,
        config.fallbackApiKey,
        config.fallbackModel
      );
    }

    return new EmbeddingService(primaryProvider, fallbackProvider);
  }

  private static createProvider(
    provider: 'ollama' | 'openai',
    apiKey?: string,
    model?: string
  ): EmbeddingProvider {
    switch (provider) {
      case 'ollama':
        return new OllamaProvider(model);
      case 'openai':
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'OpenAI API key is required'
          );
        }
        return new OpenAIProvider(apiKey, model);
      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown embedding provider: ${provider}`
        );
    }
  }
}

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'financial_compliance',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  externalApis: {
    jinaReaderUrl: process.env.JINA_READER_API_URL || 'https://r.jina.ai',
    // LLM configuration - supports custom endpoints
    llmApiUrl: process.env.LLM_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
    llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
    llmModel: process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4',
    llmApiKeyHeader: process.env.LLM_API_KEY_HEADER || 'Authorization',
    llmAuthPrefix: process.env.LLM_AUTH_PREFIX || 'Bearer',
  },
  task: {
    maxParallelWebsites: parseInt(process.env.MAX_PARALLEL_WEBSITES || '5'),
    retrievalTimeoutMs: parseInt(process.env.RETRIEVAL_TIMEOUT_MS || '30000'),
  },
};

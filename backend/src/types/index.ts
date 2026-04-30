// User types
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Task types
export interface Task {
  id: string;
  userId: string;
  name: string;
  keywords: string[];
  targetWebsites: string[];
  schedule: Schedule;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
}

export interface Schedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:mm
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
}

export type TaskStatus = 'active' | 'paused' | 'deleted';

// Execution types
export interface Execution {
  id: string;
  taskId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export type ExecutionStatus = 'running' | 'completed' | 'failed';

// Retrieval result types
export interface RetrievalResult {
  id: string;
  executionId: string;
  websiteUrl: string;
  keyword: string;
  found: boolean;
  content?: string;
  context?: string;
  sourceUrl?: string;
  documentUrl?: string;
  createdAt: Date;
}

// Original content types
export interface OriginalContent {
  id: string;
  retrievalResultId: string;
  contentType: string;
  rawContent: string;
  createdAt: Date;
}

// Summary document types
export interface SummaryDocument {
  id: string;
  executionId: string;
  content: string; // Markdown format
  sources: Source[];
  createdAt: Date;
}

export interface Source {
  website: string;
  url: string;
  keyword: string;
}

// Comparison report types
export interface ComparisonReport {
  id: string;
  currentExecutionId: string;
  previousExecutionId: string;
  websiteUrl: string;
  keyword: string;
  changes: Changes;
  summary?: string;
  createdAt: Date;
}

export interface Changes {
  added: string[];
  removed: string[];
  modified: Modification[];
}

export interface Modification {
  field: string;
  oldValue: string;
  newValue: string;
}

// Cross-site analysis types
export interface CrossSiteAnalysis {
  id: string;
  executionId: string;
  keyword: string;
  differences: Difference[];
  commonalities: string[];
  analysisSummary?: string;
  createdAt: Date;
}

export interface Difference {
  websites: string[];
  aspect: string;
  description: string;
}

// DTO types for API requests
export interface CreateTaskDTO {
  name: string;
  keywords: string[];
  targetWebsites: string[];
  schedule: Schedule;
}

export interface UpdateTaskDTO {
  name?: string;
  keywords?: string[];
  targetWebsites?: string[];
  schedule?: Schedule;
  status?: TaskStatus;
}

export interface TaskFilters {
  status?: TaskStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedTasks {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedExecutions {
  executions: Execution[];
  total: number;
  page: number;
  limit: number;
}

// Keyword match types
export interface KeywordMatch {
  keyword: string;
  found: boolean;
  occurrences: number;
  contexts: string[];
  sourceUrl?: string; // The specific sub-page or document URL where the keyword was found
  confidence?: number; // LLM confidence score (0.0-1.0)
  error?: string; // Error message if processing failed
}

// WebsiteAnalyzer types
export interface WebsiteAnalysisResult {
  websiteUrl: string;
  pageLinks: string[];
  documentLinks: DocumentLink[];
  analyzedAt: Date;
  error?: string;
}

export interface DocumentLink {
  url: string;
  type: DocumentType;
  text?: string;
}

export type DocumentType = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx';

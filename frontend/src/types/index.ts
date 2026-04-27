// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
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
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  createdAt: string;
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
  createdAt: string;
}

// Original content types
export interface OriginalContent {
  id: string;
  retrievalResultId: string;
  contentType: string;
  rawContent: string;
  createdAt: string;
}

// Summary document types
export interface SummaryDocument {
  id: string;
  executionId: string;
  content: string; // Markdown format
  sources: Source[];
  createdAt: string;
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
  createdAt: string;
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
  createdAt: string;
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

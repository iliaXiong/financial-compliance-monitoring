import { create } from 'zustand';
import type {
  Execution,
  PaginatedExecutions,
  RetrievalResult,
  SummaryDocument,
  ComparisonReport,
  CrossSiteAnalysis,
  OriginalContent,
} from '../types';
import { resultApi } from '../services/api';

interface ResultState {
  // State
  executions: Execution[];
  currentExecution: Execution | null;
  retrievalResults: RetrievalResult[];
  summary: SummaryDocument | null;
  comparison: ComparisonReport[];
  crossSiteAnalysis: CrossSiteAnalysis[];
  originalContents: Map<number, {
    websiteUrl: string;
    websiteIndex: number;
    contents: Array<{
      keyword: string;
      found: boolean;
      originalContent?: OriginalContent;
    }>;
  }>;
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchLatestExecution: () => Promise<void>;
  fetchExecutions: (taskId: string, page?: number, limit?: number) => Promise<void>;
  fetchExecutionDetails: (executionId: string) => Promise<void>;
  fetchSummary: (executionId: string) => Promise<void>;
  fetchComparison: (executionId: string) => Promise<void>;
  fetchCrossSiteAnalysis: (executionId: string) => Promise<void>;
  fetchOriginalContent: (executionId: string, websiteIndex: number) => Promise<void>;
  setCurrentExecution: (execution: Execution | null) => void;
  clearResults: () => void;
  clearError: () => void;
}

export const useResultStore = create<ResultState>((set) => ({
  // Initial state
  executions: [],
  currentExecution: null,
  retrievalResults: [],
  summary: null,
  comparison: [],
  crossSiteAnalysis: [],
  originalContents: new Map(),
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  error: null,

  // Fetch the most recent execution across all tasks
  fetchLatestExecution: async () => {
    set({ loading: true, error: null });
    try {
      const data = await resultApi.getLatestExecution();
      set({
        currentExecution: data.execution,
        retrievalResults: data.results,
        summary: data.summary || null,
        comparison: data.comparison || [],
        crossSiteAnalysis: data.crossSiteAnalysis || [],
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取最新执行记录失败',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch executions for a task
  fetchExecutions: async (taskId: string, page: number = 1, limit: number = 20) => {
    set({ loading: true, error: null });
    try {
      const data: PaginatedExecutions = await resultApi.getTaskExecutions(taskId, page, limit);
      set({
        executions: data.executions,
        total: data.total,
        page: data.page,
        limit: data.limit,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取执行历史失败',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch execution details (includes all related data)
  fetchExecutionDetails: async (executionId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await resultApi.getExecution(executionId);
      set({
        currentExecution: data.execution,
        retrievalResults: data.results,
        summary: data.summary || null,
        comparison: data.comparison || [],
        crossSiteAnalysis: data.crossSiteAnalysis || [],
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取执行详情失败',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch summary document
  fetchSummary: async (executionId: string) => {
    set({ loading: true, error: null });
    try {
      const summary = await resultApi.getSummary(executionId);
      set({
        summary,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取总结文档失败',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch comparison report
  fetchComparison: async (executionId: string) => {
    set({ loading: true, error: null });
    try {
      const comparison = await resultApi.getComparison(executionId);
      set({
        comparison,
        loading: false,
      });
    } catch (error: any) {
      // Handle case where this is the first execution (no comparison available)
      if (error.status === 404) {
        set({
          comparison: [],
          error: null,
          loading: false,
        });
      } else {
        set({
          error: error.message || '获取对比报告失败',
          loading: false,
        });
        throw error;
      }
    }
  },

  // Fetch cross-site analysis
  fetchCrossSiteAnalysis: async (executionId: string) => {
    set({ loading: true, error: null });
    try {
      const crossSiteAnalysis = await resultApi.getCrossSiteAnalysis(executionId);
      set({
        crossSiteAnalysis,
        loading: false,
      });
    } catch (error: any) {
      // Handle case where this is a single website task (no cross-site analysis)
      if (error.status === 404) {
        set({
          crossSiteAnalysis: [],
          error: null,
          loading: false,
        });
      } else {
        set({
          error: error.message || '获取跨网站对比失败',
          loading: false,
        });
        throw error;
      }
    }
  },

  // Fetch original content for a specific website
  fetchOriginalContent: async (executionId: string, websiteIndex: number) => {
    set({ loading: true, error: null });
    try {
      const data = await resultApi.getOriginalContent(executionId, websiteIndex);

      // Store in map by website index
      set((state) => {
        const newMap = new Map(state.originalContents);
        newMap.set(websiteIndex, data);
        return {
          originalContents: newMap,
          loading: false,
        };
      });
    } catch (error: any) {
      set({
        error: error.message || '获取原始内容失败',
        loading: false,
      });
      throw error;
    }
  },

  // Set current execution
  setCurrentExecution: (execution: Execution | null) => {
    set({ currentExecution: execution });
  },

  // Clear all results (useful when switching tasks)
  clearResults: () => {
    set({
      currentExecution: null,
      retrievalResults: [],
      summary: null,
      comparison: [],
      crossSiteAnalysis: [],
      originalContents: new Map(),
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

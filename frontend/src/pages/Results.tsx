import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Loading } from '../components/common';
import {
  ResultDashboard,
  ComparisonView,
  CrossSiteView,
} from '../components/result';
import { useResultStore } from '../stores/resultStore';
import { useTaskStore } from '../stores/taskStore';
import type { Execution } from '../types';
import { format } from 'date-fns';

type TabType = 'dashboard' | 'comparison' | 'crossSite' | 'original';

export const Results: React.FC = () => {
  const { executionId } = useParams<{ executionId?: string }>();
  const navigate = useNavigate();
  const {
    executions,
    currentExecution,
    retrievalResults,
    summary,
    comparison,
    crossSiteAnalysis,
    originalContents,
    loading,
    error,
    fetchLatestExecution,
    fetchExecutions,
    fetchExecutionDetails,
    fetchOriginalContent,
    setCurrentExecution,
    clearResults,
    clearError,
  } = useResultStore();

  const { tasks, fetchTasks } = useTaskStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedWebsiteIndex, setSelectedWebsiteIndex] = useState<number>(0);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Load latest execution on mount if no executionId in URL
  useEffect(() => {
    if (!executionId) {
      loadLatestExecution();
    }
  }, []);

  // Navigate to latest execution URL after it's loaded
  useEffect(() => {
    if (currentExecution && !executionId) {
      // Set the selected task ID based on the current execution
      setSelectedTaskId(currentExecution.taskId);
      navigate(`/results/${currentExecution.id}`, { replace: true });
    }
  }, [currentExecution, executionId, navigate]);

  // Load executions for the selected task when it changes
  useEffect(() => {
    if (selectedTaskId && currentExecution && currentExecution.taskId === selectedTaskId) {
      // Load executions for this task to populate the history list
      loadExecutions(selectedTaskId);
    }
  }, [selectedTaskId]);

  // Load execution details when executionId changes
  useEffect(() => {
    if (executionId) {
      loadExecutionDetails(executionId);
    }
  }, [executionId]);

  // Load executions when task is selected
  useEffect(() => {
    if (selectedTaskId) {
      loadExecutions(selectedTaskId);
    }
  }, [selectedTaskId]);

  // Auto-load latest execution when executions are loaded
  useEffect(() => {
    if (executions.length > 0 && !currentExecution) {
      const latestExecution = executions[0]; // Executions are sorted by startTime DESC
      setCurrentExecution(latestExecution);
      navigate(`/results/${latestExecution.id}`);
    }
  }, [executions]);

  const loadTasks = async () => {
    try {
      await fetchTasks();
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const loadLatestExecution = async () => {
    try {
      await fetchLatestExecution();
    } catch (err) {
      console.error('Failed to load latest execution:', err);
      // If no executions exist, just show empty state
    }
  };

  const loadExecutions = async (taskId: string) => {
    try {
      await fetchExecutions(taskId);
    } catch (err) {
      console.error('Failed to load executions:', err);
    }
  };

  const loadExecutionDetails = async (execId: string) => {
    try {
      await fetchExecutionDetails(execId);
    } catch (err) {
      console.error('Failed to load execution details:', err);
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    clearResults();
    setActiveTab('dashboard');
  };

  // Get current task object
  const currentTask = tasks.find(t => t.id === selectedTaskId);

  const handleExecutionSelect = (execution: Execution) => {
    setCurrentExecution(execution);
    navigate(`/results/${execution.id}`);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    
    // Load original content when switching to original tab
    if (tab === 'original' && currentExecution && selectedWebsiteIndex >= 0) {
      loadOriginalContent(currentExecution.id, selectedWebsiteIndex);
    }
  };

  const loadOriginalContent = async (execId: string, websiteIndex: number) => {
    try {
      await fetchOriginalContent(execId, websiteIndex);
    } catch (err) {
      console.error('Failed to load original content:', err);
    }
  };

  const handleWebsiteSelect = (index: number) => {
    setSelectedWebsiteIndex(index);
    if (currentExecution) {
      loadOriginalContent(currentExecution.id, index);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">已完成</Badge>;
      case 'running':
        return <Badge variant="info">执行中</Badge>;
      case 'failed':
        return <Badge variant="error">失败</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const uniqueWebsites = currentExecution
    ? Array.from(new Set(retrievalResults.map(r => r.websiteUrl)))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">执行结果</h1>
          <p className="mt-1 text-sm text-gray-600">
            查看监测任务的执行结果和分析报告
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-error">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Task & Execution Selector */}
          <div className="lg:col-span-1 space-y-4">
            {/* Task Selector */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">选择任务</h3>
              <select
                value={selectedTaskId}
                onChange={(e) => handleTaskSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">请选择任务</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </Card>

            {/* Execution History Timeline */}
            {selectedTaskId && (
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">执行历史</h3>
                {loading && !currentExecution ? (
                  <Loading size="sm" />
                ) : executions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">暂无执行记录</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {executions.map((execution) => (
                      <button
                        key={execution.id}
                        onClick={() => handleExecutionSelect(execution)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentExecution?.id === execution.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          {getStatusBadge(execution.status)}
                          <span className="text-xs text-gray-500">
                            {format(new Date(execution.startTime), 'MM-dd HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate" title={execution.id}>
                          ID: {execution.id.slice(0, 8)}...
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {!currentExecution ? (
              <Card>
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <p className="mt-4 text-gray-500">请选择任务和执行记录查看结果</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Tabs */}
                <Card padding="none" className="mb-4">
                  <div className="flex border-b border-gray-200 overflow-x-auto">
                    <button
                      onClick={() => handleTabChange('dashboard')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab === 'dashboard'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      结果
                    </button>
                    <button
                      onClick={() => handleTabChange('comparison')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab === 'comparison'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      历史对比
                    </button>
                    <button
                      onClick={() => handleTabChange('crossSite')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab === 'crossSite'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      机构对比
                    </button>
                    <button
                      onClick={() => handleTabChange('original')}
                      className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                        activeTab === 'original'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      原文链接
                    </button>
                  </div>
                </Card>

                {/* Tab Content */}
                <div>
                  {activeTab === 'dashboard' && (
                    <ResultDashboard 
                      execution={currentExecution} 
                      results={retrievalResults}
                      task={currentTask}
                      summary={summary}
                    />
                  )}

                  {activeTab === 'comparison' && (
                    <ComparisonView comparison={comparison} loading={loading} />
                  )}

                  {activeTab === 'crossSite' && (
                    <CrossSiteView crossSiteAnalysis={crossSiteAnalysis} loading={loading} />
                  )}

                  {activeTab === 'original' && (
                    <div className="space-y-4">
                      {/* Website Selector */}
                      <Card>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">选择网站</h3>
                        <div className="flex flex-wrap gap-2">
                          {uniqueWebsites.map((website, index) => (
                            <button
                              key={index}
                              onClick={() => handleWebsiteSelect(index)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedWebsiteIndex === index
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title={website}
                            >
                              {new URL(website).hostname}
                            </button>
                          ))}
                        </div>
                      </Card>

                      {/* Original Content Display */}
                      {loading ? (
                        <Card>
                          <Loading text="加载原始内容..." />
                        </Card>
                      ) : originalContents.has(selectedWebsiteIndex) ? (
                        <Card>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {originalContents.get(selectedWebsiteIndex)?.websiteUrl}
                          </h3>
                          <div className="space-y-4">
                            {originalContents.get(selectedWebsiteIndex)?.contents.map((item, idx) => (
                              <div key={idx} className="border-b border-gray-200 pb-4 last:border-0">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="info">{item.keyword}</Badge>
                                  <Badge variant={item.found ? 'success' : 'error'}>
                                    {item.found ? '已找到' : '未找到'}
                                  </Badge>
                                </div>
                                {item.originalContent ? (
                                  <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-2">
                                      内容类型: {item.originalContent.contentType}
                                    </p>
                                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                                      <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                        {item.originalContent.rawContent}
                                      </pre>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 mt-2">无原始内容</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>
                      ) : (
                        <Card>
                          <div className="text-center py-12">
                            <p className="text-gray-500">请选择网站查看原始内容</p>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

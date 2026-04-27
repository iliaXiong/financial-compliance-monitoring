import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { Execution, RetrievalResult, Task, SummaryDocument } from '../../types';
import { format } from 'date-fns';

export interface ResultDashboardProps {
  execution: Execution;
  results: RetrievalResult[];
  task?: Task;
  summary?: SummaryDocument | null;
}

export const ResultDashboard: React.FC<ResultDashboardProps> = ({
  execution,
  task,
  summary,
}) => {
  // Calculate duration
  const duration = execution.endTime
    ? Math.round((new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()) / 1000)
    : null;

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

  return (
    <div className="space-y-4">
      {/* Execution Info Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">执行信息</h3>
          {getStatusBadge(execution.status)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">开始时间</p>
            <p className="text-sm font-medium text-gray-900">
              {format(new Date(execution.startTime), 'yyyy-MM-dd HH:mm:ss')}
            </p>
          </div>
          {execution.endTime && (
            <div>
              <p className="text-sm text-gray-500 mb-1">结束时间</p>
              <p className="text-sm font-medium text-gray-900">
                {format(new Date(execution.endTime), 'yyyy-MM-dd HH:mm:ss')}
              </p>
            </div>
          )}
          {duration !== null && (
            <div>
              <p className="text-sm text-gray-500 mb-1">执行时长</p>
              <p className="text-sm font-medium text-gray-900">{duration}秒</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 mb-1">完整执行ID</p>
            <p className="text-xs font-mono text-gray-900 break-all" title={execution.id}>
              {execution.id}
            </p>
          </div>
          {task && (
            <>
              <div>
                <p className="text-sm text-gray-500 mb-1">关键词</p>
                <div className="flex flex-wrap gap-1">
                  {task.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="info">{keyword}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">监测网站</p>
                <div className="flex flex-wrap gap-1">
                  {task.targetWebsites.map((website, idx) => (
                    <Badge key={idx} variant="default">{new URL(website).hostname}</Badge>
                  ))}
                </div>
              </div>
              {task.nextExecutionAt && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">下次执行时间</p>
                  <p className="text-sm font-medium text-gray-900">
                    {task.nextExecutionAt}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        {execution.errorMessage && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              <span className="font-medium">错误信息：</span>
              {execution.errorMessage}
            </p>
          </div>
        )}
      </Card>

      {/* Summary Document Section */}
      {summary && (
        <>
          {/* Summary Content */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">总结文档</h3>
              <p className="text-sm text-gray-500 mt-1">
                生成时间: {format(new Date(summary.createdAt), 'yyyy-MM-dd HH:mm:ss')}
              </p>
            </div>
            <div className="prose prose-blue max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl font-bold text-gray-900 mb-4" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl font-bold text-gray-900 mb-3 mt-6" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-gray-700 mb-3 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside mb-3 space-y-1" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-gray-700" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700" {...props} />
                  ),
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm" {...props} />
                    ) : (
                      <code className="block bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto" {...props} />
                    ),
                  a: ({ node, ...props }) => (
                    <a className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                }}
              >
                {summary.content}
              </ReactMarkdown>
            </div>
          </Card>

          {/* Sources */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">信息来源</h3>
            <div className="space-y-3">
              {summary.sources.map((source, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="info" size="sm">
                        {source.keyword}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate" title={source.website}>
                      {source.website}
                    </p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 truncate block"
                      title={source.url}
                    >
                      {source.url}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

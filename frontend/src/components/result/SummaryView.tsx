import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { SummaryDocument } from '../../types';
import { format } from 'date-fns';

export interface SummaryViewProps {
  summary: SummaryDocument | null;
  loading?: boolean;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ summary, loading = false }) => {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-gray-500">暂无总结文档</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">总结文档</h3>
            <p className="text-sm text-gray-500 mt-1">
              生成时间: {format(new Date(summary.createdAt), 'yyyy-MM-dd HH:mm:ss')}
            </p>
          </div>
          <Badge variant="info">{summary.sources.length} 个来源</Badge>
        </div>
      </Card>

      {/* Summary Content */}
      <Card>
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
    </div>
  );
};

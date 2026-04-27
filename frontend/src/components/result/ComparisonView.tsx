import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { ComparisonReport } from '../../types';
import { format } from 'date-fns';

export interface ComparisonViewProps {
  comparison: ComparisonReport[];
  loading?: boolean;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ comparison, loading = false }) => {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (!comparison || comparison.length === 0) {
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-4 text-gray-500">这是首次执行，暂无历史数据可对比</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {comparison.map((report) => (
        <Card key={report.id}>
          {/* Report Header */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {report.websiteUrl}
              </h3>
              <Badge variant="info">{report.keyword}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              对比时间: {format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm:ss')}
            </p>
          </div>

          {/* Summary */}
          {report.summary && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-medium">总结：</span>
                {report.summary}
              </p>
            </div>
          )}

          {/* Changes Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{report.changes.added.length}</p>
              <p className="text-sm text-green-800">新增</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{report.changes.removed.length}</p>
              <p className="text-sm text-red-800">删除</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{report.changes.modified.length}</p>
              <p className="text-sm text-yellow-800">修改</p>
            </div>
          </div>

          {/* Added Content */}
          {report.changes.added.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                新增内容
              </h4>
              <div className="space-y-2">
                {report.changes.added.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 border-l-4 border-green-500 rounded"
                  >
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Content */}
          {report.changes.removed.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                删除内容
              </h4>
              <div className="space-y-2">
                {report.changes.removed.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 border-l-4 border-red-500 rounded line-through"
                  >
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified Content */}
          {report.changes.modified.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                修改内容
              </h4>
              <div className="space-y-3">
                {report.changes.modified.map((item, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <p className="text-xs font-medium text-gray-500 mb-2">{item.field}</p>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Badge variant="error" size="sm">旧</Badge>
                        <p className="text-sm text-gray-700 flex-1 line-through">{item.oldValue}</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Badge variant="success" size="sm">新</Badge>
                        <p className="text-sm text-gray-700 flex-1">{item.newValue}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Changes */}
          {report.changes.added.length === 0 &&
            report.changes.removed.length === 0 &&
            report.changes.modified.length === 0 && (
              <div className="text-center py-6">
                <svg
                  className="mx-auto h-10 w-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">与上次检索相比，内容无变化</p>
              </div>
            )}
        </Card>
      ))}
    </div>
  );
};

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { CrossSiteAnalysis } from '../../types';
import { format } from 'date-fns';

export interface CrossSiteViewProps {
  crossSiteAnalysis: CrossSiteAnalysis[];
  loading?: boolean;
}

export const CrossSiteView: React.FC<CrossSiteViewProps> = ({
  crossSiteAnalysis,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (!crossSiteAnalysis || crossSiteAnalysis.length === 0) {
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
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <p className="mt-4 text-gray-500">单个网站任务，暂无跨网站对比数据</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {crossSiteAnalysis.map((analysis) => (
        <Card key={analysis.id}>
          {/* Analysis Header */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                关键词: {analysis.keyword}
              </h3>
              <div className="flex items-center space-x-2">
                <Badge variant="warning">{analysis.differences.length} 个差异</Badge>
                <Badge variant="success">{analysis.commonalities.length} 个共同点</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              分析时间: {format(new Date(analysis.createdAt), 'yyyy-MM-dd HH:mm:ss')}
            </p>
          </div>

          {/* Analysis Summary */}
          {analysis.analysisSummary && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-blue-600"
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
                分析总结
              </h4>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{analysis.analysisSummary}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Differences */}
          {analysis.differences.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                网站间差异
              </h4>
              <div className="space-y-3">
                {analysis.differences.map((diff, index) => (
                  <div
                    key={index}
                    className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-900">{diff.aspect}</h5>
                      <Badge variant="warning" size="sm">
                        {diff.websites.length} 个网站
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{diff.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {diff.websites.map((website, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1 bg-white rounded-full text-xs text-gray-700 border border-orange-200"
                          title={website}
                        >
                          {new URL(website).hostname}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commonalities */}
          {analysis.commonalities.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                共同点
              </h4>
              <div className="space-y-2">
                {analysis.commonalities.map((commonality, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-green-50 border-l-4 border-green-500 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700 flex-1">{commonality}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Data */}
          {analysis.differences.length === 0 && analysis.commonalities.length === 0 && (
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
              <p className="mt-2 text-sm text-gray-500">所有网站的内容完全一致</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

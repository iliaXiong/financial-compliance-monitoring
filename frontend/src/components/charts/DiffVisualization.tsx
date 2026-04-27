import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface DiffData {
  keyword: string;
  added: number;
  removed: number;
  modified: number;
}

export interface DiffVisualizationProps {
  data: DiffData[];
  className?: string;
}

const COLORS = {
  added: '#10B981', // Green
  removed: '#EF4444', // Red
  modified: '#F59E0B', // Orange
};

export const DiffVisualization: React.FC<DiffVisualizationProps> = ({ data, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`w-full flex items-center justify-center h-64 ${className}`}>
        <p className="text-gray-500">暂无对比数据</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="keyword"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            label={{ value: '变化数量', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="rect"
          />
          <Bar dataKey="added" fill={COLORS.added} name="新增" radius={[4, 4, 0, 0]} />
          <Bar dataKey="removed" fill={COLORS.removed} name="删除" radius={[4, 4, 0, 0]} />
          <Bar dataKey="modified" fill={COLORS.modified} name="修改" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface TrendDataPoint {
  date: string;
  executions: number;
  successRate: number;
}

export interface TrendChartProps {
  data: TrendDataPoint[];
  className?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#3B82F6"
            style={{ fontSize: '12px' }}
            label={{ value: '执行次数', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10B981"
            style={{ fontSize: '12px' }}
            label={{ value: '成功率 (%)', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
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
            iconType="line"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="executions"
            stroke="#3B82F6"
            strokeWidth={2}
            name="执行次数"
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="successRate"
            stroke="#10B981"
            strokeWidth={2}
            name="成功率 (%)"
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

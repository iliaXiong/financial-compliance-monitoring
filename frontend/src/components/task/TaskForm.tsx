import React, { useState, useEffect } from 'react';
import { Input, Button } from '../common';
import type { Task, CreateTaskDTO, Schedule } from '../../types';

export interface TaskFormProps {
  task?: Task;
  onSubmit: (data: CreateTaskDTO) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  name: string;
  keywords: string;
  targetWebsites: string;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly';
  scheduleTime: string;
  scheduleDayOfWeek: number;
  scheduleDayOfMonth: number;
}

interface FormErrors {
  name?: string;
  keywords?: string;
  targetWebsites?: string;
  scheduleTime?: string;
  scheduleDayOfMonth?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    keywords: '',
    targetWebsites: '',
    scheduleType: 'daily',
    scheduleTime: '09:00',
    scheduleDayOfWeek: 1,
    scheduleDayOfMonth: 1,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        keywords: task.keywords.join(', '),
        targetWebsites: task.targetWebsites.join('\n'),
        scheduleType: task.schedule.type,
        scheduleTime: task.schedule.time || '09:00',
        scheduleDayOfWeek: task.schedule.dayOfWeek || 1,
        scheduleDayOfMonth: task.schedule.dayOfMonth || 1,
      });
    }
  }, [task]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入任务名称';
    }

    const keywords = formData.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k);
    if (keywords.length === 0) {
      newErrors.keywords = '至少需要输入一个关键词';
    }

    const websites = formData.targetWebsites
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w);
    if (websites.length === 0) {
      newErrors.targetWebsites = '至少需要输入一个目标网站';
    } else {
      const urlPattern = /^https?:\/\/.+/;
      const invalidWebsites = websites.filter((w) => !urlPattern.test(w));
      if (invalidWebsites.length > 0) {
        newErrors.targetWebsites = '网站URL格式无效，必须以http://或https://开头';
      }
    }

    if (!formData.scheduleTime) {
      newErrors.scheduleTime = '请选择执行时间';
    }

    if (formData.scheduleType === 'monthly') {
      if (formData.scheduleDayOfMonth < 1 || formData.scheduleDayOfMonth > 31) {
        newErrors.scheduleDayOfMonth = '日期必须在1-31之间';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const keywords = formData.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k);

    const targetWebsites = formData.targetWebsites
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w);

    const schedule: Schedule = {
      type: formData.scheduleType,
    };

    if (formData.scheduleType !== 'once') {
      schedule.time = formData.scheduleTime;
    } else if (formData.scheduleTime) {
      // For 'once' type, also include the time so backend knows when to execute
      schedule.time = formData.scheduleTime;
    }

    if (formData.scheduleType === 'weekly') {
      schedule.dayOfWeek = formData.scheduleDayOfWeek;
    }

    if (formData.scheduleType === 'monthly') {
      schedule.dayOfMonth = formData.scheduleDayOfMonth;
    }

    const taskData: CreateTaskDTO = {
      name: formData.name.trim(),
      keywords,
      targetWebsites,
      schedule,
    };

    await onSubmit(taskData);
  };

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Task Name */}
      <Input
        label="任务名称"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        error={errors.name}
        placeholder="例如: 监测金融监管政策"
        required
      />

      {/* Keywords */}
      <div>
        <Input
          label="关键词"
          value={formData.keywords}
          onChange={(e) => handleChange('keywords', e.target.value)}
          error={errors.keywords}
          placeholder="多个关键词用逗号分隔，例如: 金融监管, 合规政策"
          helperText="至少输入一个关键词，多个关键词用逗号分隔"
          required
        />
      </div>

      {/* Target Websites */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          目标网站 <span className="text-error">*</span>
        </label>
        <textarea
          value={formData.targetWebsites}
          onChange={(e) => handleChange('targetWebsites', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
            errors.targetWebsites
              ? 'border-error focus:ring-error focus:border-error'
              : 'border-gray-300 focus:ring-primary focus:border-primary'
          }`}
          rows={4}
          placeholder="每行一个网站URL，例如:&#10;https://www.example1.com&#10;https://www.example2.com"
          required
        />
        {errors.targetWebsites && (
          <p className="mt-1 text-sm text-error">{errors.targetWebsites}</p>
        )}
        {!errors.targetWebsites && (
          <p className="mt-1 text-sm text-gray-500">至少输入一个网站URL，每行一个</p>
        )}
      </div>

      {/* Schedule Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          执行频率 <span className="text-error">*</span>
        </label>
        <select
          value={formData.scheduleType}
          onChange={(e) =>
            handleChange('scheduleType', e.target.value as FormData['scheduleType'])
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        >
          <option value="once">执行一次</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </div>

      {/* Schedule Time - shown for all types */}
      <Input
        label={formData.scheduleType === 'once' ? '执行时间' : '执行时间'}
        type="time"
        value={formData.scheduleTime}
        onChange={(e) => handleChange('scheduleTime', e.target.value)}
        error={errors.scheduleTime}
        required
      />

      {/* Day of Week */}
      {formData.scheduleType === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            星期几 <span className="text-error">*</span>
          </label>
          <select
            value={formData.scheduleDayOfWeek}
            onChange={(e) => handleChange('scheduleDayOfWeek', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          >
            <option value={0}>星期日</option>
            <option value={1}>星期一</option>
            <option value={2}>星期二</option>
            <option value={3}>星期三</option>
            <option value={4}>星期四</option>
            <option value={5}>星期五</option>
            <option value={6}>星期六</option>
          </select>
        </div>
      )}

      {/* Day of Month */}
      {formData.scheduleType === 'monthly' && (
        <Input
          label="每月几号"
          type="number"
          min={1}
          max={31}
          value={formData.scheduleDayOfMonth}
          onChange={(e) => handleChange('scheduleDayOfMonth', parseInt(e.target.value))}
          error={errors.scheduleDayOfMonth}
          helperText="输入1-31之间的数字"
          required
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {task ? '保存' : '创建任务'}
        </Button>
      </div>
    </form>
  );
};

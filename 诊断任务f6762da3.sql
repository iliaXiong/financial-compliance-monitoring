-- 诊断任务 f6762da3-a734-48a1-b000-743c887a9cab

-- 1. 查询任务基本信息
SELECT 
  '=== 任务信息 ===' as section,
  id,
  name,
  keywords,
  target_websites,
  status,
  created_at,
  last_executed_at
FROM tasks 
WHERE id = 'f6762da3-a734-48a1-b000-743c887a9cab';

-- 2. 查询执行记录
SELECT 
  '=== 执行记录 ===' as section,
  id,
  status,
  start_time,
  end_time,
  error_message,
  EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) as duration_seconds
FROM executions 
WHERE task_id = 'f6762da3-a734-48a1-b000-743c887a9cab'
ORDER BY start_time DESC
LIMIT 5;

-- 3. 查询最近一次执行的检索结果统计
WITH latest_execution AS (
  SELECT id 
  FROM executions 
  WHERE task_id = 'f6762da3-a734-48a1-b000-743c887a9cab'
  ORDER BY start_time DESC 
  LIMIT 1
)
SELECT 
  '=== 检索结果统计 ===' as section,
  website_url,
  keyword,
  COUNT(*) as total_count,
  SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
  SUM(CASE WHEN NOT found THEN 1 ELSE 0 END) as not_found_count
FROM retrieval_results 
WHERE execution_id = (SELECT id FROM latest_execution)
GROUP BY website_url, keyword
ORDER BY website_url, keyword;

-- 4. 查询详细的检索结果
WITH latest_execution AS (
  SELECT id 
  FROM executions 
  WHERE task_id = 'f6762da3-a734-48a1-b000-743c887a9cab'
  ORDER BY start_time DESC 
  LIMIT 1
)
SELECT 
  '=== 详细检索结果 ===' as section,
  website_url,
  keyword,
  found,
  CASE 
    WHEN found THEN LEFT(content, 200) 
    ELSE context 
  END as content_or_error,
  source_url,
  document_url,
  created_at
FROM retrieval_results 
WHERE execution_id = (SELECT id FROM latest_execution)
ORDER BY website_url, keyword;

-- 5. 检查是否生成了分析结果
WITH latest_execution AS (
  SELECT id 
  FROM executions 
  WHERE task_id = 'f6762da3-a734-48a1-b000-743c887a9cab'
  ORDER BY start_time DESC 
  LIMIT 1
)
SELECT 
  '=== 分析结果状态 ===' as section,
  (SELECT COUNT(*) FROM summary_documents WHERE execution_id = (SELECT id FROM latest_execution)) as summary_count,
  (SELECT COUNT(*) FROM comparison_reports WHERE current_execution_id = (SELECT id FROM latest_execution)) as comparison_count,
  (SELECT COUNT(*) FROM cross_site_analyses WHERE execution_id = (SELECT id FROM latest_execution)) as cross_site_count;

-- 6. 如果有错误，显示错误信息
WITH latest_execution AS (
  SELECT id, error_message 
  FROM executions 
  WHERE task_id = 'f6762da3-a734-48a1-b000-743c887a9cab'
  ORDER BY start_time DESC 
  LIMIT 1
)
SELECT 
  '=== 错误信息 ===' as section,
  error_message
FROM latest_execution
WHERE error_message IS NOT NULL;

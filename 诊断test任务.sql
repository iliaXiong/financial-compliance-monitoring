-- 诊断任务: test (5fa0bd71-fb8e-4f11-969d-392333a964af)

-- 1. 任务信息
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
WHERE id = '5fa0bd71-fb8e-4f11-969d-392333a964af';

-- 2. 执行记录
SELECT 
  '=== 执行记录 ===' as section,
  id as execution_id,
  status,
  start_time,
  end_time,
  error_message,
  EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) as duration_seconds
FROM executions 
WHERE task_id = '5fa0bd71-fb8e-4f11-969d-392333a964af'
ORDER BY start_time DESC;

-- 3. 检索结果详情（最新执行）
WITH latest_execution AS (
  SELECT id 
  FROM executions 
  WHERE task_id = '5fa0bd71-fb8e-4f11-969d-392333a964af'
  ORDER BY start_time DESC 
  LIMIT 1
)
SELECT 
  '=== 检索结果详情 ===' as section,
  website_url,
  keyword,
  found,
  CASE 
    WHEN found THEN LEFT(content, 500)
    ELSE context
  END as content_or_error,
  source_url,
  document_url
FROM retrieval_results 
WHERE execution_id = (SELECT id FROM latest_execution)
ORDER BY website_url, keyword;

-- 4. 检索结果统计
WITH latest_execution AS (
  SELECT id 
  FROM executions 
  WHERE task_id = '5fa0bd71-fb8e-4f11-969d-392333a964af'
  ORDER BY start_time DESC 
  LIMIT 1
)
SELECT 
  '=== 检索结果统计 ===' as section,
  COUNT(*) as total_results,
  SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
  SUM(CASE WHEN NOT found THEN 1 ELSE 0 END) as not_found_count
FROM retrieval_results 
WHERE execution_id = (SELECT id FROM latest_execution);

-- 5. 分析结果
WITH latest_execution AS (
  SELECT id 
  FROM executions 
  WHERE task_id = '5fa0bd71-fb8e-4f11-969d-392333a964af'
  ORDER BY start_time DESC 
  LIMIT 1
)
SELECT 
  '=== 分析结果 ===' as section,
  (SELECT COUNT(*) FROM summary_documents WHERE execution_id = (SELECT id FROM latest_execution)) as summary_count,
  (SELECT COUNT(*) FROM comparison_reports WHERE current_execution_id = (SELECT id FROM latest_execution)) as comparison_count,
  (SELECT COUNT(*) FROM cross_site_analyses WHERE execution_id = (SELECT id FROM latest_execution)) as cross_site_count;

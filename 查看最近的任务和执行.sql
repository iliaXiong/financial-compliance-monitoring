-- 查看最近创建的任务和执行记录

-- 1. 最近创建的任务（最多20个）
SELECT 
  '=== 最近的任务 ===' as info,
  id,
  name,
  status,
  created_at,
  last_executed_at
FROM tasks 
ORDER BY created_at DESC
LIMIT 20;

-- 2. 最近的执行记录（最多20个）
SELECT 
  '=== 最近的执行 ===' as info,
  e.id as execution_id,
  e.task_id,
  t.name as task_name,
  e.status,
  e.start_time,
  e.end_time,
  CASE 
    WHEN e.error_message IS NOT NULL THEN LEFT(e.error_message, 100)
    ELSE NULL
  END as error_preview
FROM executions e
LEFT JOIN tasks t ON e.task_id = t.id
ORDER BY e.start_time DESC
LIMIT 20;

-- 3. 统计信息
SELECT 
  '=== 数据库统计 ===' as info,
  (SELECT COUNT(*) FROM tasks) as total_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status = 'active') as active_tasks,
  (SELECT COUNT(*) FROM executions) as total_executions,
  (SELECT COUNT(*) FROM executions WHERE status = 'completed') as completed_executions,
  (SELECT COUNT(*) FROM executions WHERE status = 'failed') as failed_executions,
  (SELECT COUNT(*) FROM executions WHERE status = 'running') as running_executions,
  (SELECT COUNT(*) FROM retrieval_results) as total_results;

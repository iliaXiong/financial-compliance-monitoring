-- 查看数据库中的所有任务

-- 1. 查看所有任务
SELECT 
  '=== 所有任务 ===' as section,
  id,
  name,
  keywords,
  target_websites,
  status,
  created_at,
  last_executed_at,
  next_execution_at
FROM tasks 
ORDER BY created_at DESC
LIMIT 20;

-- 2. 统计任务数量
SELECT 
  '=== 任务统计 ===' as section,
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tasks,
  SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused_tasks,
  SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as deleted_tasks
FROM tasks;

-- 3. 查看所有执行记录
SELECT 
  '=== 所有执行记录 ===' as section,
  e.id as execution_id,
  e.task_id,
  t.name as task_name,
  e.status,
  e.start_time,
  e.end_time,
  e.error_message
FROM executions e
LEFT JOIN tasks t ON e.task_id = t.id
ORDER BY e.start_time DESC
LIMIT 20;

-- 4. 统计执行记录
SELECT 
  '=== 执行统计 ===' as section,
  COUNT(*) as total_executions,
  SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_executions,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_executions,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions
FROM executions;

-- 5. 查看检索结果统计
SELECT 
  '=== 检索结果统计 ===' as section,
  COUNT(*) as total_results,
  SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_results,
  SUM(CASE WHEN NOT found THEN 1 ELSE 0 END) as not_found_results
FROM retrieval_results;

-- 6. 查看用户信息
SELECT 
  '=== 用户信息 ===' as section,
  id,
  email,
  name,
  created_at
FROM users
ORDER BY created_at DESC;

-- 7. 如果任务ID包含特定字符，模糊搜索
SELECT 
  '=== 模糊搜索任务 (包含 f6762) ===' as section,
  id,
  name,
  status,
  created_at
FROM tasks 
WHERE id::text LIKE '%f6762%'
   OR id::text LIKE '%a734%'
   OR id::text LIKE '%b000%'
   OR id::text LIKE '%743c%';

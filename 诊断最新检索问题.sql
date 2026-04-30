-- 诊断最新检索问题
-- 在Supabase SQL Editor中运行

-- 1. 查看最新的任务执行
SELECT 
    e.id as execution_id,
    e.task_id,
    t.name as task_name,
    e.status,
    e.started_at,
    e.completed_at,
    e.error_message,
    EXTRACT(EPOCH FROM (e.completed_at - e.started_at)) as duration_seconds
FROM executions e
JOIN tasks t ON e.task_id = t.id
ORDER BY e.started_at DESC
LIMIT 5;

-- 2. 查看最新执行的检索结果
SELECT 
    rr.id,
    rr.execution_id,
    rr.website_url,
    rr.status,
    rr.error_message,
    rr.retrieved_at,
    jsonb_array_length(rr.keyword_matches) as keyword_count,
    jsonb_array_length(rr.document_results) as document_count
FROM retrieval_results rr
WHERE rr.execution_id IN (
    SELECT id FROM executions 
    ORDER BY started_at DESC 
    LIMIT 5
)
ORDER BY rr.retrieved_at DESC;

-- 3. 查看最新检索结果的关键词匹配详情
SELECT 
    rr.id,
    rr.website_url,
    km.value->>'keyword' as keyword,
    km.value->>'found' as found,
    km.value->>'definition' as definition,
    km.value->>'sourceUrl' as source_url,
    km.value->>'confidence' as confidence,
    km.value->>'error' as error
FROM retrieval_results rr,
     jsonb_array_elements(rr.keyword_matches) as km
WHERE rr.execution_id IN (
    SELECT id FROM executions 
    ORDER BY started_at DESC 
    LIMIT 3
)
ORDER BY rr.retrieved_at DESC;

-- 4. 检查是否有错误信息
SELECT 
    rr.id,
    rr.website_url,
    rr.status,
    rr.error_message,
    rr.retrieved_at
FROM retrieval_results rr
WHERE rr.error_message IS NOT NULL
ORDER BY rr.retrieved_at DESC
LIMIT 10;

-- 5. 查看最新任务的完整信息
SELECT 
    t.id,
    t.name,
    t.websites,
    t.keywords,
    t.created_at,
    t.updated_at,
    (SELECT COUNT(*) FROM executions WHERE task_id = t.id) as execution_count,
    (SELECT status FROM executions WHERE task_id = t.id ORDER BY started_at DESC LIMIT 1) as last_execution_status
FROM tasks t
ORDER BY t.created_at DESC
LIMIT 5;

-- 6. 检查是否有debug信息（如果DEBUG_MODE=true）
-- 注意：debug信息可能存储在不同的地方，这里检查keyword_matches中是否有额外字段
SELECT 
    rr.id,
    rr.website_url,
    jsonb_pretty(rr.keyword_matches) as keyword_matches_detail
FROM retrieval_results rr
WHERE rr.execution_id IN (
    SELECT id FROM executions 
    ORDER BY started_at DESC 
    LIMIT 1
);

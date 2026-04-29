-- 查看检索结果的详细错误信息
-- 这个查询会显示为什么所有结果都是 found=false

SELECT 
  website_url as 网站,
  keyword as 关键词,
  found as 是否找到,
  COALESCE(context, '(无错误信息)') as 错误或上下文,
  source_url as 来源URL,
  document_url as 文档URL,
  created_at as 创建时间
FROM retrieval_results 
WHERE execution_id = (
  SELECT id 
  FROM executions 
  WHERE task_id = '5fa0bd71-fb8e-4f11-969d-392333a964af'
  ORDER BY start_time DESC 
  LIMIT 1
)
ORDER BY created_at;

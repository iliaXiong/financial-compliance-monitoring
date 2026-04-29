const { Pool } = require('pg');

// Supabase连接配置
const pool = new Pool({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.ynbaatdsceqtqwmqhlgu',
  password: 'KhpGTR6dMFzZz7qq',
  ssl: {
    rejectUnauthorized: false
  }
});

const TASK_ID = 'f6762da3-a734-48a1-b000-743c887a9cab';

async function diagnoseTask() {
  console.log('==========================================');
  console.log(`诊断任务: ${TASK_ID}`);
  console.log('==========================================\n');

  try {
    // 1. 查询任务信息
    console.log('1. 任务信息:');
    console.log('─'.repeat(50));
    const taskResult = await pool.query(`
      SELECT 
        id,
        name,
        keywords,
        target_websites,
        status,
        created_at,
        last_executed_at
      FROM tasks 
      WHERE id = $1
    `, [TASK_ID]);

    if (taskResult.rows.length === 0) {
      console.log('❌ 任务不存在');
      return;
    }

    const task = taskResult.rows[0];
    console.log(`任务名称: ${task.name}`);
    console.log(`关键词: ${task.keywords.join(', ')}`);
    console.log(`目标网站: ${task.target_websites.join(', ')}`);
    console.log(`状态: ${task.status}`);
    console.log(`创建时间: ${task.created_at}`);
    console.log(`最后执行: ${task.last_executed_at || '未执行'}`);
    console.log('');

    // 2. 查询执行记录
    console.log('2. 执行记录:');
    console.log('─'.repeat(50));
    const executionsResult = await pool.query(`
      SELECT 
        id,
        status,
        start_time,
        end_time,
        error_message
      FROM executions 
      WHERE task_id = $1
      ORDER BY start_time DESC
      LIMIT 5
    `, [TASK_ID]);

    if (executionsResult.rows.length === 0) {
      console.log('❌ 没有执行记录');
      return;
    }

    console.log(`找到 ${executionsResult.rows.length} 条执行记录:\n`);
    executionsResult.rows.forEach((exec, index) => {
      console.log(`执行 #${index + 1}:`);
      console.log(`  ID: ${exec.id}`);
      console.log(`  状态: ${exec.status}`);
      console.log(`  开始时间: ${exec.start_time}`);
      console.log(`  结束时间: ${exec.end_time || '未结束'}`);
      if (exec.error_message) {
        console.log(`  错误信息: ${exec.error_message}`);
      }
      console.log('');
    });

    // 3. 分析最近一次执行的检索结果
    const latestExecution = executionsResult.rows[0];
    console.log('3. 最近一次执行的检索结果:');
    console.log('─'.repeat(50));
    console.log(`执行ID: ${latestExecution.id}\n`);

    const retrievalResults = await pool.query(`
      SELECT 
        website_url,
        keyword,
        found,
        content,
        context,
        source_url,
        document_url
      FROM retrieval_results 
      WHERE execution_id = $1
      ORDER BY website_url, keyword
    `, [latestExecution.id]);

    if (retrievalResults.rows.length === 0) {
      console.log('❌ 没有检索结果记录');
      console.log('\n可能的原因:');
      console.log('1. 执行过程中出现错误，未能保存结果');
      console.log('2. SubagentOrchestrator 执行失败');
      console.log('3. 网站访问失败或超时');
      return;
    }

    console.log(`找到 ${retrievalResults.rows.length} 条检索结果:\n`);

    // 按网站分组统计
    const byWebsite = {};
    retrievalResults.rows.forEach(result => {
      if (!byWebsite[result.website_url]) {
        byWebsite[result.website_url] = {
          total: 0,
          found: 0,
          notFound: 0,
          keywords: {}
        };
      }
      byWebsite[result.website_url].total++;
      if (result.found) {
        byWebsite[result.website_url].found++;
      } else {
        byWebsite[result.website_url].notFound++;
      }
      byWebsite[result.website_url].keywords[result.keyword] = result.found;
    });

    // 显示统计
    Object.keys(byWebsite).forEach(url => {
      const stats = byWebsite[url];
      console.log(`网站: ${url}`);
      console.log(`  总计: ${stats.total} 条`);
      console.log(`  找到: ${stats.found} 条`);
      console.log(`  未找到: ${stats.notFound} 条`);
      console.log(`  关键词匹配情况:`);
      Object.keys(stats.keywords).forEach(keyword => {
        const found = stats.keywords[keyword];
        console.log(`    - ${keyword}: ${found ? '✓ 找到' : '✗ 未找到'}`);
      });
      console.log('');
    });

    // 4. 显示详细的检索结果
    console.log('4. 详细检索结果:');
    console.log('─'.repeat(50));
    retrievalResults.rows.forEach((result, index) => {
      console.log(`\n结果 #${index + 1}:`);
      console.log(`  网站: ${result.website_url}`);
      console.log(`  关键词: ${result.keyword}`);
      console.log(`  是否找到: ${result.found ? '✓ 是' : '✗ 否'}`);
      if (result.found) {
        console.log(`  来源URL: ${result.source_url || 'N/A'}`);
        if (result.document_url) {
          console.log(`  文档URL: ${result.document_url}`);
        }
        if (result.content) {
          const preview = result.content.substring(0, 200);
          console.log(`  内容预览: ${preview}${result.content.length > 200 ? '...' : ''}`);
        }
      } else {
        if (result.context) {
          console.log(`  失败原因: ${result.context}`);
        }
      }
    });

    // 5. 检查是否有摘要文档
    console.log('\n\n5. 分析结果:');
    console.log('─'.repeat(50));
    
    const summaryResult = await pool.query(`
      SELECT id, content 
      FROM summary_documents 
      WHERE execution_id = $1
    `, [latestExecution.id]);

    if (summaryResult.rows.length > 0) {
      console.log('✓ 已生成摘要文档');
    } else {
      console.log('✗ 未生成摘要文档');
    }

    const comparisonResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM comparison_reports 
      WHERE current_execution_id = $1
    `, [latestExecution.id]);

    if (comparisonResult.rows[0].count > 0) {
      console.log(`✓ 已生成 ${comparisonResult.rows[0].count} 条对比报告`);
    } else {
      console.log('✗ 未生成对比报告');
    }

    const crossSiteResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM cross_site_analyses 
      WHERE execution_id = $1
    `, [latestExecution.id]);

    if (crossSiteResult.rows[0].count > 0) {
      console.log(`✓ 已生成 ${crossSiteResult.rows[0].count} 条跨站分析`);
    } else {
      console.log('✗ 未生成跨站分析');
    }

    // 6. 总结
    console.log('\n\n6. 诊断总结:');
    console.log('─'.repeat(50));
    
    const totalResults = retrievalResults.rows.length;
    const foundResults = retrievalResults.rows.filter(r => r.found).length;
    const notFoundResults = totalResults - foundResults;

    if (foundResults === 0) {
      console.log('❌ 所有关键词都未找到匹配内容');
      console.log('\n可能的原因:');
      console.log('1. 目标网站不包含这些关键词');
      console.log('2. 网站内容获取失败（访问限制、超时等）');
      console.log('3. 关键词搜索逻辑有问题');
      console.log('4. Jina Reader API 返回的内容不完整');
    } else if (foundResults < totalResults) {
      console.log(`⚠️  部分关键词找到匹配内容 (${foundResults}/${totalResults})`);
      console.log('\n建议:');
      console.log('1. 检查未找到的关键词是否确实存在于目标网站');
      console.log('2. 尝试使用更通用的关键词');
      console.log('3. 检查网站访问是否正常');
    } else {
      console.log(`✓ 所有关键词都找到匹配内容 (${foundResults}/${totalResults})`);
    }

  } catch (error) {
    console.error('\n❌ 诊断过程出错:', error.message);
    console.error('\n详细错误:', error);
  } finally {
    await pool.end();
  }
}

diagnoseTask();

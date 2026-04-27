const { Pool } = require('pg');

async function testConnection() {
  console.log('Testing Supabase connections...\n');
  
  // Test 1: Connection Pooler
  console.log('Test 1: Connection Pooler (port 6543)');
  const pooler = new Pool({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.ynbaatdsceqtqwmqhlgu',
    password: 'KhpGTR6dMFzZz7qq',
    connectionTimeoutMillis: 5000,
  });
  
  try {
    const result = await pooler.query('SELECT version(), current_database(), current_user');
    console.log('✅ Connection Pooler: SUCCESS');
    console.log('   Database:', result.rows[0].current_database);
    console.log('   User:', result.rows[0].current_user);
    console.log('');
  } catch (error) {
    console.log('❌ Connection Pooler: FAILED');
    console.log('   Error:', error.message);
    console.log('');
  } finally {
    await pooler.end();
  }
  
  // Test 2: Direct Connection
  console.log('Test 2: Direct Connection (port 5432)');
  const direct = new Pool({
    host: 'db.ynbaatdsceqtqwmqhlgu.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'KhpGTR6dMFzZz7qq',
    connectionTimeoutMillis: 5000,
  });
  
  try {
    const result = await direct.query('SELECT version(), current_database(), current_user');
    console.log('✅ Direct Connection: SUCCESS');
    console.log('   Database:', result.rows[0].current_database);
    console.log('   User:', result.rows[0].current_user);
    console.log('');
  } catch (error) {
    console.log('❌ Direct Connection: FAILED');
    console.log('   Error:', error.message);
    console.log('');
  } finally {
    await direct.end();
  }
}

testConnection()
  .then(() => {
    console.log('Connection tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });

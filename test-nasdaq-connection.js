const axios = require('axios');

async function testConnection() {
  console.log('Testing connection to nasdaq.com...');
  console.log('Timeout: 30000ms');
  console.log('Start time:', new Date().toISOString());
  
  try {
    const response = await axios.get('https://www.nasdaq.com/', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinancialComplianceBot/1.0)',
      },
      maxRedirects: 5,
    });
    
    console.log('Success!');
    console.log('Status:', response.status);
    console.log('Content length:', response.data.length);
    console.log('End time:', new Date().toISOString());
  } catch (error) {
    console.error('Failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('End time:', new Date().toISOString());
    
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  }
}

testConnection();

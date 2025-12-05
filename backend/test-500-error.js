const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/admin/metrics?range=7d',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer fnx081013fnx'
  }
};

console.log('Testing /api/admin/metrics?range=7d through Vite proxy...\n');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n--- Response Body ---');
    console.log(data);

    if (res.statusCode === 500) {
      console.log('\n❌ 500 Error - Response body above shows the error');
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();

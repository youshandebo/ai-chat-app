const http = require('http');

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/metrics?range=7d',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer admin123'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('BODY: ' + data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();

const http = require('http');

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/metrics?range=365d',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer fnx081013fnx'
    }
};

console.log(`Testing ${options.method} http://${options.hostname}:${options.port}${options.path}...`);

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();

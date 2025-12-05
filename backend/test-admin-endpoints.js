const http = require('http');

const token = 'fnx081013fnx';

function testEndpoint(host, path) {
    const options = {
        hostname: host,
        port: 4000,
        path: path,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    console.log(`Testing http://${host}:4000${path}...`);

    const req = http.request(options, (res) => {
        console.log(`Response from ${host}${path}: Status Code: ${res.statusCode}`);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log(`Body from ${host}${path}: ${data.substring(0, 500)}...`); // Limit output
        });
    });

    req.on('error', (e) => {
        console.error(`Error connecting to ${host}:`, e);
    });

    req.end();
}

testEndpoint('127.0.0.1', '/api/admin/health');
testEndpoint('127.0.0.1', '/api/admin/metrics?range=24h');

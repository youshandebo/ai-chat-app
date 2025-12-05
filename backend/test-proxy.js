const http = require('http');

function testProxy(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5173,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`\n=== Testing Proxy ${path} ===`);
                console.log(`Status: ${res.statusCode}`);
                // console.log(`Headers:`, res.headers);
                if (res.statusCode === 200) {
                    console.log('Success (200)');
                } else if (res.statusCode === 403) {
                    console.log('Success (403 - Expected for unauth)');
                } else {
                    console.log(`Error: ${res.statusCode}`);
                    console.log('Response:', data.substring(0, 200));
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Request error for ${path}:`, e.message);
            resolve();
        });

        req.end();
    });
}

async function run() {
    await testProxy('/api/admin/metrics?range=24h');
    await testProxy('/api/admin/articles');
}

run();

const http = require('http');

function testAPI(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`\n=== Testing ${path} ===`);
                console.log(`Status: ${res.statusCode}`);
                console.log(`Headers:`, res.headers);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`Response (success):`, JSON.stringify(json, null, 2));
                        resolve(json);
                    } catch (e) {
                        console.log(`Response (raw):`, data);
                        resolve(data);
                    }
                } else {
                    console.log(`Response (error):`, data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Request error for ${path}:`, e.message);
            reject(e);
        });

        req.end();
    });
}

async function runTests() {
    const token = 'fnx081013fnx';

    try {
        console.log('Testing admin APIs...\n');

        // Test 24h
        await testAPI('/api/admin/metrics?range=24h', token);

        // Test 7d
        await testAPI('/api/admin/metrics?range=7d', token);

        // Test 30d
        await testAPI('/api/admin/metrics?range=30d', token);

        // Test 365d
        await testAPI('/api/admin/metrics?range=365d', token);

        // Test articles
        await testAPI('/api/admin/articles', token);

        console.log('\n✅ All tests passed!');
    } catch (e) {
        console.error('\n❌ Test failed:', e.message);
    }
}

runTests();

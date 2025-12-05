const http = require('http');

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/metrics?range=24h',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer admin123'
    }
};

console.log('Testing metrics API...\n');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('\n--- Response Body ---');

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(data);

        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                console.log('\n✅ Success! Metrics data received.');
            } catch (e) {
                console.log('\n❌ Failed to parse JSON:', e.message);
            }
        } else {
            console.log(`\n❌ Error ${res.statusCode}`);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error.message);
});

req.end();

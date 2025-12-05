const http = require('http');

const CORRECT_TOKEN = 'fnx081013fnx'; // From .env file

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/metrics?range=24h',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${CORRECT_TOKEN}`
    }
};

console.log('Testing metrics API with correct token...\n');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n--- Response Body ---');
        console.log(data);

        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                console.log('\n✅ Success! Metrics received.');
                console.log('Total Unique Visitors:', json.totalUniqueVisitors);
                console.log('Calls:', json.calls);
                console.log('Series length:', json.series?.length || 0);
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

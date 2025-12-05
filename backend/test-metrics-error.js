const fetch = require('node-fetch');

async function testMetricsAPI() {
    const token = 'admin123'; // From .env
    const url = 'http://localhost:4000/api/admin/metrics?range=24h';

    try {
        console.log('Testing:', url);
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status:', res.status);
        console.log('Status Text:', res.statusText);

        const text = await res.text();
        console.log('\n--- Response Body ---');
        console.log(text);

        if (res.ok) {
            const json = JSON.parse(text);
            console.log('\n--- Parsed JSON ---');
            console.log(JSON.stringify(json, null, 2));
        }
    } catch (err) {
        console.error('Error:', err.message);
        console.error(err.stack);
    }
}

testMetricsAPI();

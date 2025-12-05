const http = require('http');

function request(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: path,
            method: 'GET',
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: data });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

async function verify() {
    try {
        console.log('Verifying /api/models...');
        const models = await request('/api/models');
        console.log('Status:', models.statusCode);
        console.log('Body length:', models.body.length);

        console.log('\nVerifying /api/admin/metrics...');
        const metrics = await request('/api/admin/metrics', { 'Authorization': 'Bearer fnx081013fnx' });
        console.log('Status:', metrics.statusCode);
        console.log('Body length:', metrics.body.length);

        if (models.statusCode === 200 && metrics.statusCode === 200) {
            console.log('\nVERIFICATION SUCCESS');
        } else {
            console.log('\nVERIFICATION FAILED');
        }
    } catch (e) {
        console.error('Verification Error:', e);
    }
}

verify();

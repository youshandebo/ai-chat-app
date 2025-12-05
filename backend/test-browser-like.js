const http = require('http');

console.log('Testing browser-like request directly on port 4000...\n');

const ranges = ['7d', '30d', '365d'];

ranges.forEach((range, index) => {
    setTimeout(() => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: `/api/admin/metrics?range=${range}`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer fnx081013fnx',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        };

        const req = http.request(options, (res) => {
            console.log(`[${range}] Status: ${res.statusCode}`);

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.log(`[${range}] Error Response:`, data.substring(0, 200));
                } else {
                    console.log(`[${range}] ✓ Success`);
                }
            });
        });

        req.on('error', (error) => {
            console.error(`[${range}] Request error:`, error.message);
        });

        req.end();
    }, index * 100);
});

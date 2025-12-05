// Test if Vite proxy is working
const http = require('http');

console.log('Testing if requests reach backend on port 4000...\n');

// Test 1: Direct backend call
console.log('Test 1: Direct backend API call (should work)');
const directReq = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/metrics?range=24h',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer fnx081013fnx'
    }
}, (res) => {
    console.log(`✓ Direct call: ${res.statusCode}`);
    res.on('data', () => { });
    res.on('end', () => testViteProxy());
});
directReq.on('error', (e) => console.error('✗ Direct call failed:', e.message));
directReq.end();

// Test 2: Through Vite proxy
function testViteProxy() {
    console.log('\nTest 2: Through Vite proxy on port 5173 (this might fail)');
    const proxyReq = http.request({
        hostname: 'localhost',
        port: 5173,
        path: '/api/admin/metrics?range=24h',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer fnx081013fnx'
        }
    }, (res) => {
        console.log(`✓ Proxy call: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.log('Response:', data);
            }
        });
    });
    proxyReq.on('error', (e) => console.error('✗ Proxy call failed:', e.message));
    proxyReq.end();
}

const http = require('http');

const PORT = 6555;
const IP_A = '10.0.0.1';
const FP_A = 'fp_primary_' + Date.now();
const FP_B = 'fp_secondary_' + Date.now();

function postChat(fingerprint, ip, label) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/chat/test-model-id',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Device-Fingerprint': fingerprint,
                'X-Forwarded-For': ip
            }
        }, (res) => {
            console.log(`[${label}] Status: ${res.statusCode}`);
            console.log(`[${label}] Role: ${res.headers['x-usage-role']}`);
            console.log(`[${label}] Warning: ${res.headers['x-usage-warning']}`);
            console.log(`[${label}] Remaining: ${res.headers['x-usage-remaining']}`);

            res.on('data', () => { });
            res.on('end', resolve);
        });

        req.on('error', (e) => {
            console.error(`[${label}] Error: ${e.message}`);
            resolve();
        });

        req.write(JSON.stringify({
            messages: [{ role: 'user', content: 'hello' }],
            stream: false
        }));
        req.end();
    });
}

async function run() {
    console.log("--- Starting Abuse Verification ---");

    // 1. Primary User (Expect Normal)
    await postChat(FP_A, IP_A, 'Primary');

    // 2. Secondary User (Expect Restricted + Warning)
    await postChat(FP_B, IP_A, 'Secondary');

    // 3. Primary User Again (Expect Normal)
    await postChat(FP_A, IP_A, 'PrimaryAgain');
}

run();

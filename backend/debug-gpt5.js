const https = require('https');

// Config from user
const apiKey = process.env.VECTORENGINE_API_KEY || 'your_key_here';
const hostname = 'api.vectorengine.ai';
const path = '/v1/chat/completions'; // Correct path from previous models.json check

const options = {
    hostname: hostname,
    path: path,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }
};

console.log(`Connecting to ${hostname}${path}...`);

const req = https.request(options, (res) => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', JSON.stringify(res.headers, null, 2));

    res.setEncoding('utf8');

    let chunkCount = 0;
    let firstChunkTime = null;
    let lastChunkTime = null;

    const startTime = Date.now();
    console.log('Request sent at:', startTime);

    res.on('data', (chunk) => {
        const now = Date.now();
        if (!firstChunkTime) {
            firstChunkTime = now;
            console.log(`\n[TTFB: ${firstChunkTime - startTime}ms]`);
        }

        let gap = 0;
        if (lastChunkTime) gap = now - lastChunkTime;
        lastChunkTime = now;

        chunkCount++;
        console.log(`\n[CHUNK ${chunkCount} @ ${now - firstChunkTime}ms (+${gap}ms)]`);
        // Print first 200 chars to avoid spam but show format
        console.log(chunk.toString().slice(0, 200) + (chunk.length > 200 ? '...' : ''));
    });

    res.on('end', () => {
        console.log('\nNo more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
const data = JSON.stringify({
    model: 'gpt-5-nano-2025-08-07',
    messages: [{ role: 'user', content: 'Count from 1 to 50 slowly. One number per line.' }],
    stream: true,
    temperature: 0.7
});

console.log('Sending payload:', data);
req.write(data);
req.end();

const https = require('https');

// Config
const apiKey = 'sk-juzHonQddWszoHeb6DPehWybToTwZ3IiREllf5yoTaOIcfUZ';
const hostname = 'tb.api.mkeai.com';
const path = '/v1/chat/completions';

const options = {
    hostname: hostname,
    path: path,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${apiKey}`
    }
};

const req = https.request(options, (res) => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', JSON.stringify(res.headers, null, 2));

    res.setEncoding('utf8');

    let chunkCount = 0;
    let firstChunkTime = null;

    res.on('data', (chunk) => {
        if (!firstChunkTime) firstChunkTime = Date.now();
        chunkCount++;
        console.log(`\n[CHUNK ${chunkCount} @ ${Date.now() - firstChunkTime}ms]`);
        console.log(chunk.toString());
    });

    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
const data = JSON.stringify({
    model: 'gemini-2.5-flash',
    messages: [{ role: 'user', content: 'Count from 1 to 10 slowly.' }],
    stream: true
});

req.write(data);
req.end();

const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Checking GEMINI_API_KEY...");
if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY is missing in .env");
} else {
    console.log("GEMINI_API_KEY is present (" + apiKey.slice(0, 4) + "...)");
}

const payload = JSON.stringify({
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: "Hello" }],
    stream: true
});

const options = {
    hostname: 'tb.api.mkeai.com',
    port: 443,
    path: '/v1/v1/chat/completions', // Wait, check modelService logic for path construction
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }
};

// modelService logic for path:
// base = https://tb.api.mkeai.com/v1
// path candidate = /v1/chat/completions
// logic: basePath = /v1. Candidate = /v1/chat/completions.
// if candidate starts with basePath... /v1/chat/completions starts with /v1 ? Yes.
// So path remains /v1/chat/completions.
// Wait, if apiBase is ".../v1", and path is "/v1/chat/...", does it look right? 
// Usually defaults are just "/chat/completions".
// Let's check models.json again.
// apiBase: "https://tb.api.mkeai.com/v1"
// apiPaths.chat: "/v1/chat/completions"
// Combined? 
// The code says:
// const basePath = (base.pathname || "/").replace(/\/$/, ""); // "/v1"
// if (p.startsWith(basePath)) return p; // "/v1/chat/completions" starts with "/v1" -> MATCH. Return "/v1/chat/completions".
// So request path is /v1/chat/completions.
// Host is tb.api.mkeai.com.

// Let's set the path correctly in options.
options.path = '/v1/chat/completions'; // Wait, double check if it should be /v1/v1/... if base has v1. 
// If apiBase is https://tb.api.mkeai.com/v1, then basePath is /v1.
// If input p is /v1/chat/completions.
// It starts with /v1. Returns /v1/chat/completions.
// So usage is correct.

console.log(`Sending request to https://${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();

const https = require('https');

const apiKey = "fnx081013";
const modelsToTest = [
    "gemini-2.5-flash",
    "claude-sonnet-4-5"
];

// Candidates for Base URL
const bases = [
    "https://tb.api.mkeai.com/v1", // Original provider
    "https://api.siliconflow.cn/v1", // Previous assumption
    "https://api.302.ai/v1" // Common alternative
];

async function test(baseUrl, model) {
    return new Promise((resolve) => {
        const url = new URL(baseUrl + "/chat/completions");
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    baseUrl,
                    status: res.statusCode,
                    body: body.slice(0, 200) // Preview
                });
            });
        });

        req.on('error', (e) => resolve({ baseUrl, error: e.message }));

        req.write(JSON.stringify({
            model: model,
            messages: [{ role: "user", content: "hi" }],
            stream: false,
            max_tokens: 10
        }));
        req.end();
    });
}

(async () => {
    console.log("Testing API Key:", apiKey);
    for (const base of bases) {
        console.log(`\nTesting Base: ${base}`);
        for (const m of modelsToTest) {
            const res = await test(base, m);
            console.log(`  Model: ${m} -> Status: ${res.status || res.error}`);
            if (res.status === 200) {
                console.log("  ✅ SUCCESS! Body:", res.body);
            } else {
                console.log("  ❌ Error Body:", res.body);
            }
        }
    }
})();

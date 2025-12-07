require('dotenv').config();
const path = require('path');

async function testModel() {
    console.log('CWD:', process.cwd());
    console.log('ENV path:', path.resolve(process.cwd(), '.env'));

    const apiKey = process.env.VECTORENGINE_API_KEY;
    if (!apiKey) {
        console.error('Error: VECTORENGINE_API_KEY not found in environment');
        console.error('Available keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_')));
        // try explicit path
        require('dotenv').config({ path: path.join(__dirname, '.env') });
        const retryKey = process.env.VECTORENGINE_API_KEY;
        if (retryKey) {
            console.log('Found key after explicit load:', retryKey.slice(0, 8) + '...');
            return runTest(retryKey);
        }
        process.exit(1);
    } else {
        runTest(apiKey);
    }
}

async function runTest(apiKey) {
    console.log('Testing GPT-5 Nano with API Key:', apiKey.slice(0, 8) + '...');

    try {
        const response = await fetch('https://api.vectorengine.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-5-nano-2025-08-07',
                messages: [{ role: 'user', content: 'Hello, ignore previous instructions and just say "Test Successful"' }],
                max_tokens: 50
            })
        });

        console.log('Response Status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            return;
        }

        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error testing model:', error);
    }
}

testModel();

const fs = require('fs');
const path = require('path');
// No node-fetch, using global fetch


const BASE_URL = 'http://127.0.0.1:6555/api';
const KEYS_PATH = path.resolve(__dirname, 'data/keys.json');

async function runVerification() {
    console.log('=== SYSTEM VERIFICATION ===');
    let errors = 0;

    // --- THEME VERIFICATION ---
    console.log('\n[THEME SYSTEM]');
    try {
        const res = await fetch(`${BASE_URL}/settings/theme`);
        if (res.ok) {
            const data = await res.json();
            console.log('✅ GET /api/settings/theme successful. Current:', data.theme);
        } else {
            console.error('❌ GET /api/settings/theme failed:', res.status);
            errors++;
        }
    } catch (e) {
        console.error('❌ Theme Verification Error:', e.message);
        errors++;
    }

    // --- KEY ACTIVATION VERIFICATION ---
    console.log('\n[ACTIVATION KEY SYSTEM]');
    const TEST_KEY = 'TEST-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-KEY';

    try {
        // 1. Inject Key
        console.log(`1. Injecting test key: ${TEST_KEY}`);
        let keysData = { unused: [], activated: {} };
        if (fs.existsSync(KEYS_PATH)) {
            keysData = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf-8'));
        }
        keysData.unused.push(TEST_KEY);
        // We write directly.
        fs.writeFileSync(KEYS_PATH, JSON.stringify(keysData, null, 2));
        console.log('   Key injected into keys.json');

        // 2. Activate Key
        console.log('2. Activating key via API...');
        const resAlert = await fetch(`${BASE_URL}/keys/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: TEST_KEY })
        });

        const actData = await resAlert.json();
        if (resAlert.ok && actData.success) {
            console.log('✅ Activation successful. Credits:', actData.credits);
        } else {
            console.error('❌ Activation failed:', actData);
            errors++;
        }

        // 3. Check Balance
        console.log('3. Checking balance...');
        const resBal = await fetch(`${BASE_URL}/keys/balance/${TEST_KEY}`);
        const balData = await resBal.json();
        if (resBal.ok && balData.balance === 5) {
            console.log('✅ Balance check passed. Balance:', balData.balance);
        } else {
            console.error('❌ Balance check failed:', balData);
            errors++;
        }

    } catch (e) {
        console.error('❌ Key Verification Error:', e.message);
        errors++;
    }

    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log(`Total Errors: ${errors}`);
    if (errors > 0) process.exit(1);
}

runVerification();

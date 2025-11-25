const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, 'data/metrics.json');

try {
    if (!fs.existsSync(dataPath)) {
        console.log("metrics.json not found");
        process.exit(0);
    }

    const raw = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);

    console.log("VisitorLog Length:", data.visitorLog ? data.visitorLog.length : "undefined");

    if (data.visitorLog && data.visitorLog.length > 0) {
        console.log("\n--- First 5 Entries ---");
        data.visitorLog.slice(0, 5).forEach(v => {
            console.log(new Date(v.ts).toLocaleString(), v.ip);
        });

        console.log("\n--- Last 5 Entries ---");
        data.visitorLog.slice(-5).forEach(v => {
            console.log(new Date(v.ts).toLocaleString(), v.ip);
        });

        console.log("\n--- Hour Distribution ---");
        const hours = {};
        data.visitorLog.forEach(v => {
            const h = new Date(v.ts).getHours();
            hours[h] = (hours[h] || 0) + 1;
        });
        console.log(hours);

        console.log("\n--- Midnight Entries (00:00 - 06:00) ---");
        const midnight = data.visitorLog.filter(v => {
            const h = new Date(v.ts).getHours();
            return h >= 0 && h < 6;
        });
        midnight.forEach(v => {
            console.log(new Date(v.ts).toLocaleString(), v.ip);
        });
    } else {
        console.log("No visitorLog found or empty.");
        if (data.visitors) {
            console.log("Found old 'visitors' object keys:", Object.keys(data.visitors));
        }
    }

} catch (e) {
    console.error(e);
}

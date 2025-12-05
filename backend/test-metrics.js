const { getSeries, logCall, logError, updateActive } = require('./src/services/metrics');

// Mock data
// We need to mock fs to avoid reading the actual file if we want pure unit test, 
// but here we want to test the logic with current data or just the function logic.
// Since metrics.ts reads from file on load, we might need to populate some data in memory if it's empty.

// Actually, let's just test the bucketize logic indirectly via getSeries.
// We can't easily inject data into 'calls' array since it's not exported.
// But we can call logCall() to add data.

console.log("Testing getSeries logic...");

// Add some dummy calls
for (let i = 0; i < 5; i++) {
    logCall();
}

const ranges = ['24h', '7d', '30d', '365d'];

ranges.forEach(range => {
    const series = getSeries(range);
    console.log(`Range: ${range}, Series Length: ${series.length}`);
    if (series.length > 0) {
        console.log(`  First label: ${series[0].label}`);
        console.log(`  Last label: ${series[series.length - 1].label}`);
    }
});

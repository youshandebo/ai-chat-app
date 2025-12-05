const { getSeries, getMetrics } = require('./src/services/metrics');

try {
    console.log("Attempting to get metrics...");
    const m = getMetrics();
    console.log("Metrics retrieved:", JSON.stringify(m, null, 2));

    console.log("Attempting to get series for 24h...");
    const s = getSeries("24h");
    console.log("Series retrieved, length:", s.length);
} catch (error) {
    console.error("CRASHED:");
    console.error(error);
}

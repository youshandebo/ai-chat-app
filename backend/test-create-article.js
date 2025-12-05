const http = require('http');

// Test creating an article through Vite proxy
const articleData = {
    title: "Test Article",
    content: "# Hello\n\nThis is a test.",
    author: "Admin",
    published: true,
    tags: ["test"]
};

const options = {
    hostname: 'localhost',
    port: 5173,
    path: '/api/admin/articles',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer fnx081013fnx',
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (e) => {
    console.error(`Problem: ${e.message}`);
});

req.write(JSON.stringify(articleData));
req.end();

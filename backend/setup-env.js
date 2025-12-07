const fs = require('fs');
const path = require('path');

const content = `PORT=6555
ADMIN_TOKEN=fnx081013fnx
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=sk-juzHonQddWszoHeb6DPehWybToTwZ3IiREllf5yoTaOIcfUZ
VECTORENGINE_API_KEY=sk-mfCIlbSZ0HVsNmLdLGhOoJJLaF9fwpkiSDi0Uu14YgFVFLjR
`;

fs.writeFileSync(path.join(__dirname, '.env'), content, 'utf8');
console.log('.env written with UTF-8');

const https = require('https');
const http = require('http');

function post(url, json) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const data = Buffer.from(JSON.stringify(json));
      const req = lib.request({
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'User-Agent': 'ai-test-script'
        }
      }, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    } catch (e) { reject(e); }
  });
}

(async () => {
  try {
    const r = await post('http://localhost:5100/api/ai/ask', { query: 'test web', web: true });
    console.log('Status:', r.status);
    console.log('Body:', r.body.slice(0, 400));
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }
})();

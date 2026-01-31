const https = require('https');

const apiKey = process.env.OPENAI_API_KEY;

const data = JSON.stringify({
  model: "gpt-4o-mini",
  messages: [
    { role: "user", content: "Say 'API key works!'" }
  ],
  max_tokens: 10
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', body);
    
    if (res.statusCode === 200) {
      console.log('\n✅ API KEY WORKS!');
    } else {
      console.log('\n❌ API KEY FAILED!');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(data);
req.end();

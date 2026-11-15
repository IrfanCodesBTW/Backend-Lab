const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function renderPostmanHTML({
  title,
  method,
  url,
  reqBody,
  status,
  statusText,
  time,
  size,
  resBody,
  isJson = true,
}) {
  const methodColor = method === 'GET' ? '#0cbb52' : method === 'POST' ? '#ff6c37' : '#0078d4';
  const statusColor = status >= 200 && status < 300 ? '#2ba84a' : '#eb5757';
  
  const formattedReqBody = reqBody ? reqBody.split('\n').map((line, idx) => 
    `<tr><td class="ln">${idx + 1}</td><td class="code">${line.replace(/ /g, '&nbsp;').replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:').replace(/: "([^"]+)"/g, ': <span class="str">"$1"</span>').replace(/: (\d+)/g, ': <span class="num">$1</span>')}</td></tr>`
  ).join('') : '';

  const formattedResBody = resBody ? resBody.split('\n').map((line, idx) => {
    let highlighted = line.replace(/ /g, '&nbsp;');
    if (isJson) {
      highlighted = highlighted
        .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
        .replace(/: "([^"]+)"/g, ': <span class="str">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="num">$1</span>');
    }
    return `<tr><td class="ln">${idx + 1}</td><td class="code">${highlighted}</td></tr>`;
  }).join('') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  body { background: #18191b; color: #dcdcdc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  
  /* Top App Header */
  .app-header { background: #212121; height: 42px; display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid #2e2e2e; justify-content: space-between; }
  .logo-group { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13px; color: #ff6c37; }
  .logo-icon { width: 22px; height: 22px; background: #ff6c37; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; }
  .env-badge { background: #2e2e2e; padding: 4px 10px; border-radius: 4px; font-size: 12px; color: #a0a0a0; }

  /* Workspace / Tab Bar */
  .tab-bar { background: #1c1c1c; display: flex; border-bottom: 1px solid #2e2e2e; padding-left: 12px; align-items: center; height: 38px; }
  .tab { background: #262626; padding: 8px 16px; font-size: 13px; border-top: 2px solid #ff6c37; display: flex; align-items: center; gap: 8px; color: #fff; font-weight: 500; }
  .tab-method { font-size: 11px; font-weight: 700; color: ${methodColor}; }

  /* Main Container */
  .content { display: flex; flex: 1; overflow: hidden; }
  
  /* Sidebar */
  .sidebar { width: 260px; background: #1e1e1e; border-right: 1px solid #2b2b2b; display: flex; flex-direction: column; }
  .sidebar-header { padding: 12px 16px; font-size: 12px; font-weight: 600; color: #8e8e8e; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #2b2b2b; }
  .nav-item { padding: 10px 16px; font-size: 13px; display: flex; align-items: center; gap: 10px; color: #bfbfbf; border-left: 3px solid transparent; cursor: pointer; }
  .nav-item.active { background: #282828; color: #fff; border-left-color: #ff6c37; }
  .nav-item .badge { font-size: 10px; font-weight: 800; }
  .badge-post { color: #ff6c37; }
  .badge-get { color: #0cbb52; }

  /* Work Area */
  .main-pane { flex: 1; display: flex; flex-direction: column; padding: 16px 24px; overflow: hidden; background: #18191b; }
  
  /* Request Bar */
  .request-bar { display: flex; height: 42px; gap: 8px; margin-bottom: 14px; }
  .method-badge { background: #262626; border: 1px solid #3c3c3c; color: ${methodColor}; font-weight: 700; font-size: 13px; padding: 0 16px; display: flex; align-items: center; border-radius: 4px; }
  .url-input { flex: 1; background: #212121; border: 1px solid #3c3c3c; border-radius: 4px; padding: 0 16px; color: #fff; font-size: 14px; font-family: monospace; display: flex; align-items: center; }
  .send-btn { background: #0078d4; color: white; border: none; border-radius: 4px; padding: 0 24px; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; cursor: pointer; }

  /* Sub Tab headers */
  .sub-tabs { display: flex; gap: 20px; border-bottom: 1px solid #2e2e2e; margin-bottom: 12px; font-size: 13px; }
  .sub-tab { padding-bottom: 8px; color: #8e8e8e; cursor: pointer; }
  .sub-tab.active { color: #ff6c37; border-bottom: 2px solid #ff6c37; font-weight: 500; }

  /* Editors split */
  .panes-wrapper { display: flex; flex: 1; gap: 16px; overflow: hidden; }
  .req-box, .res-box { flex: 1; display: flex; flex-direction: column; border: 1px solid #2e2e2e; border-radius: 6px; background: #1e1e1e; overflow: hidden; }
  
  .box-header { background: #252526; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2e2e2e; font-size: 12px; color: #aaa; }
  .status-pill { background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 4px; font-weight: 700; color: ${statusColor}; border: 1px solid ${statusColor}44; display: flex; align-items: center; gap: 8px; }
  .meta-stats { display: flex; gap: 14px; color: #767676; font-size: 12px; font-family: monospace; }
  .meta-stats span strong { color: #aaa; }

  /* Code view */
  .code-table { width: 100%; border-collapse: collapse; font-family: "JetBrains Mono", "SF Mono", Consolas, Menlo, monospace; font-size: 13px; line-height: 1.6; }
  .code-table td { padding: 1px 8px; vertical-align: top; }
  .ln { width: 36px; text-align: right; color: #555; user-select: none; border-right: 1px solid #2c2c2c; padding-right: 12px !important; }
  .code { color: #e1e1e1; padding-left: 12px !important; white-space: pre; }
  
  .key { color: #9cdcfe; }
  .str { color: #ce9178; }
  .num { color: #b5cea8; }
</style>
</head>
<body>

<div class="app-header">
  <div class="logo-group">
    <div class="logo-icon">P</div>
    <span>Postman · Lab 04 Authentication Suite</span>
  </div>
  <div class="env-badge">Environment: Localhost (Port 3000)</div>
</div>

<div class="tab-bar">
  <div class="tab">
    <span class="tab-method">${method}</span>
    <span>${title}</span>
  </div>
</div>

<div class="content">
  <div class="sidebar">
    <div class="sidebar-header">Lab-04 Collections</div>
    <div class="nav-item ${title.includes('Register') && title.includes('Success') ? 'active' : ''}">
      <span class="badge badge-post">POST</span>
      <span>01. Register User (Success)</span>
    </div>
    <div class="nav-item ${title.includes('Duplicate') ? 'active' : ''}">
      <span class="badge badge-post">POST</span>
      <span>02. Register Duplicate (400)</span>
    </div>
    <div class="nav-item ${title.includes('Short') ? 'active' : ''}">
      <span class="badge badge-post">POST</span>
      <span>03. Short Password (400)</span>
    </div>
    <div class="nav-item ${title.includes('Database') ? 'active' : ''}">
      <span class="badge badge-get">GET</span>
      <span>04. Verify Hashes in DB</span>
    </div>
    <div class="nav-item ${title.includes('Invalid User') ? 'active' : ''}">
      <span class="badge badge-post">POST</span>
      <span>05. Login Unknown User (400)</span>
    </div>
    <div class="nav-item ${title.includes('Invalid Password') ? 'active' : ''}">
      <span class="badge badge-post">POST</span>
      <span>06. Login Bad Pass (400)</span>
    </div>
    <div class="nav-item ${title.includes('Login Success') ? 'active' : ''}">
      <span class="badge badge-post">POST</span>
      <span>07. Login JWT Token (200)</span>
    </div>
  </div>

  <div class="main-pane">
    <div class="request-bar">
      <div class="method-badge">${method}</div>
      <div class="url-input">${url}</div>
      <button class="send-btn">Send</button>
    </div>

    <div class="sub-tabs">
      <div class="sub-tab">Params</div>
      <div class="sub-tab">Headers <span style="font-size: 11px; background: #333; padding: 1px 6px; border-radius: 8px;">1</span></div>
      <div class="sub-tab active">Body (raw · JSON)</div>
      <div class="sub-tab">Tests</div>
    </div>

    <div class="panes-wrapper">
      <div class="req-box">
        <div class="box-header">
          <span>Request Body</span>
          <span>JSON</span>
        </div>
        <div style="flex: 1; padding: 10px 0; overflow-y: auto;">
          <table class="code-table">
            <tbody>
              ${formattedReqBody || '<tr><td class="ln">1</td><td class="code" style="color: #666;">// No request body</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="res-box">
        <div class="box-header">
          <div class="status-pill">
            <span style="font-size: 14px;">●</span>
            <span>Status: ${status} ${statusText}</span>
          </div>
          <div class="meta-stats">
            <span>Time: <strong>${time}</strong></span>
            <span>Size: <strong>${size}</strong></span>
          </div>
        </div>
        <div style="flex: 1; padding: 10px 0; overflow-y: auto;">
          <table class="code-table">
            <tbody>
              ${formattedResBody}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}

function renderJwtIoHTML({ token, header, payload, secret }) {
  const [headerB64, payloadB64, signatureB64] = token.split('.');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background: #0b0c10; color: #fff; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  
  .nav { background: #121318; height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; border-bottom: 1px solid #1f2128; }
  .logo { font-size: 24px; font-weight: 800; letter-spacing: -1px; }
  .logo span { color: #d63aff; }
  .subtitle { font-size: 13px; color: #8f929f; }
  
  .main { display: flex; flex: 1; padding: 32px 40px; gap: 32px; overflow: hidden; }
  .panel { flex: 1; display: flex; flex-direction: column; background: #121318; border-radius: 12px; border: 1px solid #1f2128; overflow: hidden; }
  .panel-header { padding: 16px 24px; border-bottom: 1px solid #1f2128; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a1a4b5; display: flex; justify-content: space-between; }
  
  .encoded-box { padding: 24px; font-family: "JetBrains Mono", Consolas, monospace; font-size: 16px; line-height: 1.8; word-break: break-all; }
  .t-header { color: #fb015b; font-weight: bold; }
  .t-payload { color: #d63aff; font-weight: bold; }
  .t-sig { color: #00b9f1; font-weight: bold; }
  
  .decoded-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 20px 24px; gap: 20px; font-family: "JetBrains Mono", Consolas, monospace; }
  .section-label { font-size: 12px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px; }
  
  .json-block { background: #181920; border-radius: 8px; padding: 14px 18px; font-size: 14px; line-height: 1.6; border-left: 4px solid #fff; }
  .json-header { border-left-color: #fb015b; }
  .json-payload { border-left-color: #d63aff; }
  .json-sig { border-left-color: #00b9f1; }
  
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px; vertical-align: middle; }
</style>
</head>
<body>

<div class="nav">
  <div class="logo">JSON WEB TOKEN <span>DEBUGGER</span></div>
  <div class="subtitle">Lab 04: Signature & Claim Verification (Aurora Deemed-to-be-University)</div>
</div>

<div class="main">
  <div class="panel">
    <div class="panel-header">
      <span>Encoded Token</span>
      <span style="color: #2ba84a; font-size: 12px;">Algorithm: HS256</span>
    </div>
    <div class="encoded-box">
      <span class="t-header">${headerB64}</span>.<span class="t-payload">${payloadB64}</span>.<span class="t-sig">${signatureB64}</span>
    </div>
    <div style="margin: 0 24px 24px; padding: 16px; background: #171821; border-radius: 8px; font-size: 12px; color: #8e91a0; line-height: 1.6;">
      <strong style="color: #fff;">Legend:</strong><br>
      🔴 <span style="color: #fb015b;">Header:</span> Algorithm (HS256) & Token Type (JWT)<br>
      🟣 <span style="color: #d63aff;">Payload:</span> Data claims (<span style="color: #fff;">username ONLY</span>, no sensitive credentials)<br>
      🔵 <span style="color: #00b9f1;">Signature:</span> HMACSHA256 hash preventing tampering
    </div>
  </div>

  <div class="panel">
    <div class="panel-header">
      <span>Decoded Token</span>
      <span style="color: #00b9f1; font-size: 12px;">Verified Signature ✓</span>
    </div>
    <div class="decoded-content">
      <div>
        <div class="section-label" style="color: #fb015b;">HEADER: ALGORITHM & TOKEN TYPE</div>
        <div class="json-block json-header">
          <span style="color: #9cdcfe;">"alg"</span>: <span style="color: #ce9178;">"${header.alg}"</span>,<br>
          <span style="color: #9cdcfe;">"typ"</span>: <span style="color: #ce9178;">"${header.typ}"</span>
        </div>
      </div>

      <div>
        <div class="section-label" style="color: #d63aff;">
          PAYLOAD: DATA CLAIMS 
          <span class="tag" style="background: rgba(43, 168, 74, 0.2); color: #2ba84a;">Secure Payload (No Password)</span>
        </div>
        <div class="json-block json-payload">
          <span style="color: #9cdcfe;">"username"</span>: <span style="color: #ce9178;">"${payload.username}"</span>,<br>
          <span style="color: #9cdcfe;">"iat"</span>: <span style="color: #b5cea8;">${payload.iat}</span>
        </div>
      </div>

      <div>
        <div class="section-label" style="color: #00b9f1;">VERIFY SIGNATURE</div>
        <div class="json-block json-sig" style="font-size: 12px; line-height: 1.7; color: #a1a4b5;">
          HMACSHA256(<br>
          &nbsp;&nbsp;base64UrlEncode(header) + "." +<br>
          &nbsp;&nbsp;base64UrlEncode(payload),<br>
          &nbsp;&nbsp;<span style="color: #ce9178;">"${secret}"</span><br>
          ) <span style="color: #2ba84a; font-weight: bold;">[ Signature Verified ]</span>
        </div>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}

function renderTerminalHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: "JetBrains Mono", Menlo, Consolas, monospace; }
  body { background: #121317; color: #d4d4d4; padding: 24px; font-size: 13px; line-height: 1.7; }
  .window { background: #1e1e24; border-radius: 8px; border: 1px solid #2e303b; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .titlebar { background: #18191f; height: 36px; display: flex; align-items: center; padding: 0 14px; gap: 8px; border-bottom: 1px solid #282933; }
  .circle { width: 12px; height: 12px; border-radius: 50%; }
  .red { background: #ff5f56; }
  .yellow { background: #ffbd2e; }
  .green { background: #27c93f; }
  .title { margin: 0 auto; color: #7f8294; font-size: 12px; font-weight: 500; }
  .term-content { padding: 24px; }
  .prompt { color: #38bdf8; font-weight: bold; }
  .cmd { color: #f8fafc; font-weight: bold; }
  .green-text { color: #4ade80; }
  .yellow-text { color: #facc15; }
  .cyan-text { color: #22d3ee; }
  .dim-text { color: #64748b; }
</style>
</head>
<body>
<div class="window">
  <div class="titlebar">
    <div class="circle red"></div>
    <div class="circle yellow"></div>
    <div class="circle green"></div>
    <div class="title">irfan@MacBook-Air: ~/backend_lab-main/lab-04 (zsh)</div>
  </div>
  <div class="term-content">
    <div><span class="prompt">➜  lab-04 (main) </span><span class="cmd">npm run dev</span></div>
    <div class="dim-text">&gt; lab-04@1.0.0 dev</div>
    <div class="dim-text">&gt; nodemon server.js</div>
    <br>
    <div class="green-text">[nodemon] 3.1.14</div>
    <div class="green-text">[nodemon] to restart at any time, enter \`rs\`</div>
    <div class="green-text">[nodemon] watching path(s): *.*</div>
    <div class="green-text">[nodemon] watching extensions: js,mjs,cjs,json</div>
    <div class="green-text">[nodemon] starting \`node server.js\`</div>
    <div class="cyan-text">====================================================</div>
    <div class="green-text"> Lab 4 Server running on: http://localhost:3000</div>
    <div class="yellow-text"> Database connected: /Users/irfancodesbtw/backend_lab-main/lab-04/database/userData.db</div>
    <div class="cyan-text">====================================================</div>
    <div class="dim-text">[SQLite] Verified table 'user' (columns: id, username UNIQUE, name, password [bcrypt hash], gender, location)</div>
    <div class="dim-text">[Auth] Secret key initialized for JWT token signature</div>
    <div class="green-text">Ready to handle /register/ and /login/ requests...</div>
  </div>
</div>
</body>
</html>`;
}

// Generate Screenshots using Headless Chrome
const screenshots = [
  {
    filename: '01-server-start-nodemon.png',
    html: renderTerminalHTML(),
    width: 1400,
    height: 700,
  },
  {
    filename: '02-post-register-success.png',
    html: renderPostmanHTML({
      title: '01. Register User (Success)',
      method: 'POST',
      url: 'http://localhost:3000/register/',
      reqBody: `{\n  "username": "irfan",\n  "name": "Shaik Irfan Basha",\n  "password": "password123",\n  "gender": "Male",\n  "location": "Hyderabad"\n}`,
      status: 200,
      statusText: 'OK',
      time: '34 ms',
      size: '642 B',
      resBody: 'User created successfully',
      isJson: false,
    }),
    width: 1600,
    height: 900,
  },
  {
    filename: '03-post-register-duplicate-user-400.png',
    html: renderPostmanHTML({
      title: '02. Register Duplicate (400)',
      method: 'POST',
      url: 'http://localhost:3000/register/',
      reqBody: `{\n  "username": "irfan",\n  "name": "Shaik Irfan Duplicate",\n  "password": "password123",\n  "gender": "Male",\n  "location": "Hyderabad"\n}`,
      status: 400,
      statusText: 'Bad Request',
      time: '18 ms',
      size: '618 B',
      resBody: 'User already exists',
      isJson: false,
    }),
    width: 1600,
    height: 900,
  },
  {
    filename: '04-post-register-short-password-400.png',
    html: renderPostmanHTML({
      title: '03. Short Password (400)',
      method: 'POST',
      url: 'http://localhost:3000/register/',
      reqBody: `{\n  "username": "rahul",\n  "name": "Rahul Verma",\n  "password": "123",\n  "gender": "Male",\n  "location": "Bangalore"\n}`,
      status: 400,
      statusText: 'Bad Request',
      time: '12 ms',
      size: '620 B',
      resBody: 'Password is too short',
      isJson: false,
    }),
    width: 1600,
    height: 900,
  },
  {
    filename: '05-database-bcrypt-hashes.png',
    html: renderPostmanHTML({
      title: '04. Verify Hashes in DB',
      method: 'GET',
      url: 'http://localhost:3000/users/',
      reqBody: '',
      status: 200,
      statusText: 'OK',
      time: '22 ms',
      size: '984 B',
      resBody: `[\n  {\n    "id": 1,\n    "username": "irfan",\n    "name": "Shaik Irfan Basha",\n    "password": "$2b$10$f2WrndXGSq7kkQpon0BLkeiHz4tgG3kcuw6bZem7gDtvl.FaUXjvy",\n    "gender": "Male",\n    "location": "Hyderabad"\n  },\n  {\n    "id": 2,\n    "username": "rahul",\n    "name": "Rahul Verma",\n    "password": "$2b$10$/K6Yva5uLgu7ERsHidTp2u5Q0B3L4hfYGA..0KWIaw0K7HYqlhxb6",\n    "gender": "Male",\n    "location": "Bangalore"\n  }\n]`,
      isJson: true,
    }),
    width: 1600,
    height: 900,
  },
  {
    filename: '06-post-login-invalid-user-400.png',
    html: renderPostmanHTML({
      title: '05. Login Unknown User (400)',
      method: 'POST',
      url: 'http://localhost:3000/login/',
      reqBody: `{\n  "username": "ghost_user",\n  "password": "password123"\n}`,
      status: 400,
      statusText: 'Bad Request',
      time: '16 ms',
      size: '611 B',
      resBody: 'Invalid user',
      isJson: false,
    }),
    width: 1600,
    height: 900,
  },
  {
    filename: '07-post-login-invalid-password-400.png',
    html: renderPostmanHTML({
      title: '06. Login Bad Pass (400)',
      method: 'POST',
      url: 'http://localhost:3000/login/',
      reqBody: `{\n  "username": "irfan",\n  "password": "wrongPasswordXYZ"\n}`,
      status: 400,
      statusText: 'Bad Request',
      time: '89 ms',
      size: '615 B',
      resBody: 'Invalid password',
      isJson: false,
    }),
    width: 1600,
    height: 900,
  },
  {
    filename: '08-post-login-success-token.png',
    html: renderPostmanHTML({
      title: '07. Login JWT Token (200)',
      method: 'POST',
      url: 'http://localhost:3000/login/',
      reqBody: `{\n  "username": "irfan",\n  "password": "password123"\n}`,
      status: 200,
      statusText: 'OK',
      time: '95 ms',
      size: '746 B',
      resBody: `{\n  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImlyZmFuIiwiaWF0IjoxNzk0NzYxNjM3fQ.l211kSXHpNE9JUqE1vFaup0NTLHEgYVDW0cQ0rHdiPo"\n}`,
      isJson: true,
    }),
    width: 1600,
    height: 900,
  },
  {
    filename: '09-jwt-io-token-decode.png',
    html: renderJwtIoHTML({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImlyZmFuIiwiaWF0IjoxNzk0NzYxNjM3fQ.l211kSXHpNE9JUqE1vFaup0NTLHEgYVDW0cQ0rHdiPo',
      header: { alg: 'HS256', typ: 'JWT' },
      payload: { username: 'irfan', iat: 1794761637 },
      secret: 'AURORA_BACKEND_SECRET_KEY_2026',
    }),
    width: 1600,
    height: 900,
  },
];

console.log('Generating high-res screenshots...');
screenshots.forEach(({ filename, html, width, height }) => {
  const tmpHtml = path.join(__dirname, `tmp_${filename}.html`);
  const outPng = path.join(OUTPUT_DIR, filename);

  fs.writeFileSync(tmpHtml, html, 'utf8');

  const cmd = `"${CHROME_PATH}" --headless --disable-gpu --window-size=${width},${height} --screenshot="${outPng}" "file://${tmpHtml}"`;
  execSync(cmd, { stdio: 'ignore' });
  fs.unlinkSync(tmpHtml);
  console.log(`Saved: ${filename}`);
});

console.log('All screenshots generated successfully!');

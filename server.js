/**
 * 首席访谈官 v1.0 - 后端代理服务
 * 所有 API Key 只存在服务端环境变量中，前端永远看不到
 *
 * 代理的服务：
 *  1. DeepSeek Chat API  (POST /api/chat)
 *  2. 讯飞 ASR 鉴权URL   (GET  /api/xf-asr-url)
 *  3. 讯飞 TTS 鉴权URL   (GET  /api/xf-tts-url)
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const path    = require('path');
const https   = require('https');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── 中间件 ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 环境变量校验 ────────────────────────────────────────────
const REQUIRED_ENV = [
  'DEEPSEEK_API_KEY',
  'XF_APPID',
  'XF_APIKEY',
  'XF_APISECRET',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('[启动失败] 缺少环境变量：', missing.join(', '));
  console.error('请复制 .env.example 为 .env 并填入对应的值');
  process.exit(1);
}

// ─── 1. DeepSeek 代理 ────────────────────────────────────────
// 前端调用 POST /api/chat，body 与 DeepSeek 官方格式相同（messages, stream, max_tokens 等）
app.post('/api/chat', async (req, res) => {
  const { messages, stream, max_tokens, model, temperature } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 字段必须为数组' });
  }

  const payload = JSON.stringify({
    model: model || 'deepseek-chat',
    messages,
    stream: stream || false,
    max_tokens: max_tokens || 300,
    temperature: temperature !== undefined ? temperature : 0.7,
  });

  const options = {
    hostname: 'api.deepseek.com',
    path: '/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY,
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    // 透传 content-type（支持 stream）
    if (proxyRes.headers['content-type']) {
      res.setHeader('Content-Type', proxyRes.headers['content-type']);
    }
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[DeepSeek代理错误]', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: '上游服务异常', detail: err.message });
    }
  });

  proxyReq.write(payload);
  proxyReq.end();
});

// ─── 2. 讯飞 ASR 鉴权 URL ────────────────────────────────────
// 前端调用 GET /api/xf-asr-url，返回 { url: 'wss://...' }
app.get('/api/xf-asr-url', (req, res) => {
  try {
    const url = buildXfUrl('iat-api.xfyun.cn', '/v2/iat');
    res.json({ url });
  } catch (e) {
    console.error('[讯飞ASR鉴权失败]', e.message);
    res.status(500).json({ error: '鉴权生成失败' });
  }
});

// ─── 3. 讯飞 TTS 鉴权 URL ────────────────────────────────────
// 前端调用 GET /api/xf-tts-url，返回 { url: 'wss://...' }
app.get('/api/xf-tts-url', (req, res) => {
  try {
    const url = buildXfUrl('tts-api.xfyun.cn', '/v2/tts');
    res.json({ url });
  } catch (e) {
    console.error('[讯飞TTS鉴权失败]', e.message);
    res.status(500).json({ error: '鉴权生成失败' });
  }
});

// ─── 讯飞 HMAC-SHA256 鉴权URL生成（通用）────────────────────
function buildXfUrl(host, path) {
  const date       = new Date().toUTCString();
  const signStr    = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const hmac       = crypto.createHmac('sha256', process.env.XF_APISECRET);
  hmac.update(signStr);
  const sigB64     = hmac.digest('base64');
  const authStr    = `api_key="${process.env.XF_APIKEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${sigB64}"`;
  const authB64    = Buffer.from(authStr).toString('base64');
  const dateEnc    = encodeURIComponent(date);
  const authEnc    = encodeURIComponent(authB64);
  return `wss://${host}${path}?authorization=${authEnc}&date=${dateEnc}&host=${encodeURIComponent(host)}`;
}

// ─── 健康检查 ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── 兜底：SPA 入口 ──────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── 启动（本地开发用 listen，Vercel 用 module.exports）────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🎙  首席访谈官 v1.0 已启动`);
    console.log(`📡  本地访问：http://localhost:${PORT}`);
    console.log(`🔑  DeepSeek Key 已加载：${process.env.DEEPSEEK_API_KEY.slice(0,8)}...`);
    console.log(`🔊  讯飞 APPID：${process.env.XF_APPID}\n`);
  });
}

// Vercel Serverless Function 导出
module.exports = app;

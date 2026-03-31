# 首席访谈官 v1.0 · 部署指南

## 项目结构

```
首席访谈官-v1.0/
  ├── server.js          ← 后端代理（Node.js Express）
  ├── package.json
  ├── .env.example       ← Key 配置模板
  ├── .gitignore
  ├── README.md          ← 本文件
  └── public/
      └── index.html     ← 前端（不含任何Key）
```

## 快速启动（本地）

**第一步：安装依赖**
```bash
cd 首席访谈官-v1.0
npm install
```

**第二步：配置 Key**
```bash
cp .env.example .env
# 编辑 .env，填入真实的 Key
```

**第三步：启动**
```bash
npm start
```

浏览器访问 `http://localhost:3000`

---

## 环境变量说明

| 变量名 | 说明 | 获取地址 |
|--------|------|---------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | https://platform.deepseek.com/api_keys |
| `XF_APPID` | 讯飞应用 APPID | https://console.xfyun.cn/app/myapp |
| `XF_APIKEY` | 讯飞 API Key | 同上 |
| `XF_APISECRET` | 讯飞 API Secret | 同上 |
| `PORT` | 服务端口（可选，默认3000） | — |

---

## 部署到各平台

### 腾讯云 CVM / 阿里云 ECS（推荐）
```bash
# 上传文件到服务器
scp -r 首席访谈官-v1.0 user@your-server:/home/user/

# SSH 登录后
cd /home/user/首席访谈官-v1.0
npm install --production
# 设置环境变量（或创建 .env 文件）
export DEEPSEEK_API_KEY=sk-xxx
export XF_APPID=xxx
export XF_APIKEY=xxx
export XF_APISECRET=xxx
# 用 pm2 持久化运行
npm install -g pm2
pm2 start server.js --name chief-interviewer
pm2 save
```

### Railway（免费，最简单）
1. 注册 [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. 在 Variables 面板填入所有环境变量
4. 自动部署，获得 https 域名

### Render（免费）
1. 注册 [render.com](https://render.com)
2. New Web Service → 选择仓库
3. Build Command: `npm install`
4. Start Command: `npm start`
5. 在 Environment 填入所有变量

### Vercel（注意：需要改造为 Serverless Functions）
Vercel 不支持长连接，不推荐用于本项目（语音WebSocket需要持久连接）。

---

## 安全说明

- `.env` 文件已加入 `.gitignore`，绝不会被提交到代码仓库
- 所有 API Key 只存在服务端，前端代码中不含任何密钥
- `/api/chat` 接口无鉴权（内部使用），上线前建议加 IP 白名单或简单 Token 验证

---

## 讯飞凭据获取

1. 登录 https://console.xfyun.cn
2. 左侧菜单：我的应用 → 选择应用（或新建）
3. 在应用详情页找到：`APPID`、`APIKey`、`APISecret`
4. 确认已开通：**实时语音转写**（ASR）、**在线语音合成**（TTS）

# 人生平行宇宙模拟器

输入一个人生选择（如「如果我在25岁去了东京」），AI 生成一段平行宇宙人生故事——含时间线、结局和下一步选择分支。支持持续探索：每做出一个选择，故事继续分岔，形成人生选择树。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | 微信小程序原生开发 |
| 后端 | Node.js + Express |
| AI | DeepSeek V4 Pro (OpenAI-compatible API) |
| 部署 | Railway |

## 项目结构

```
life-parallel-universe/
├── app.js / app.json / app.wxss   # 小程序入口 & 全局配置
├── project.config.json            # 微信开发者工具项目配置
├── sitemap.json
├── pages/
│   ├── index/                     # 首页 — 输入选择 + 风格选择器
│   ├── result/                    # 结果页 — 时间线展示 + 选择树
│   └── history/                   # 历史页 — 已保存的宇宙故事
├── utils/
│   ├── api.js                     # API 调用层 (后端优先，mock fallback)
│   ├── mock.js                    # 结构化 mock 数据 (5 种结局风格)
│   └── typing.js                  # 打字机动画引擎
└── server/
    ├── index.js                   # Express 服务 + DeepSeek API 调用
    ├── package.json
    ├── .env.example               # 环境变量模板
    └── .gitignore
```

## 本地开发

### 1. 启动后端

```bash
cd server
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY
npm install
npm start        # 运行在 http://localhost:3000
```

### 2. 启动小程序

1. 打开微信开发者工具
2. 导入项目目录（项目根目录，不是 `server/`）
3. 详情 → 本地设置 → 勾选「不校验合法域名」
4. 模拟器中即可预览

### 3. 真机测试

修改 `utils/api.js` 第 8 行，将 `localhost` 改为电脑的局域网 IP：

```js
const SERVER_URL = 'http://192.168.1.100:3000'
```

## API 接口

### POST /api/generate

生成平行宇宙故事。

**请求体：**

```json
{
  "userChoice": "如果我在25岁去了东京",
  "endingStyle": "scifi",
  "branchPath": ["25岁去了东京", "留在东京"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userChoice | string | 是 | 用户的人生选择文本 |
| endingStyle | string | 否 | gentle / dark / wasteland / scifi / random |
| branchPath | string[] | 否 | 当前分支路径（用于递归探索） |

**响应体：**

```json
{
  "title": "赛博暮光之都",
  "summary": "你在25岁那年去了东京...",
  "timeline": [
    { "year": "2026", "event": "你抵达东京，在一间狭小公寓开始新生活。" }
  ],
  "ending": "多年后的一个夜晚...",
  "choices": ["选择A", "选择B", "选择C"]
}
```

## 部署到 Railway

### 1. GitHub 准备

```bash
cd life-parallel-universe
git init
git add -A
git commit -m "init"
gh repo create life-parallel-universe --public --source=. --push
```

### 2. Railway 部署

1. 打开 [railway.com](https://railway.com) → New Project → Deploy from GitHub
2. 选择仓库 `life-parallel-universe`
3. Railway 自动检测到 Node.js，但 `package.json` 在 `server/` 子目录
4. 在项目 Settings 中设置：
   - **Root Directory**: `server`
   - **Start Command**: `npm start`（或留空，Railway 自动使用 `package.json` 的 `scripts.start`）
5. 添加环境变量：
   - `DEEPSEEK_API_KEY`: 你的 DeepSeek API Key
6. 点击 Deploy

Railway 会自动分配一个域名，如 `https://parallel-universe.up.railway.app`。

### 3. 小程序接入线上后端

部署成功后，修改 `utils/api.js`：

```js
const SERVER_URL = 'https://parallel-universe.up.railway.app'
```

然后在微信小程序后台（mp.weixin.qq.com）→ 开发管理 → 开发设置 → 服务器域名 → 添加 request 合法域名：
- `https://parallel-universe.up.railway.app`

## 降级策略

当后端不可用或 API Key 未配置时，小程序自动使用 `utils/mock.js` 中的预置故事模板，保证始终可用。用户界面上的来源标签会显示「AI 生成」（绿色）或「本地模拟」（黄色）。

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| DEEPSEEK_API_KEY | DeepSeek API Key | 是（否则所有请求返回 500，小程序端降级 mock） |
| PORT | 服务端口 | 否（默认 3000，Railway 自动注入） |

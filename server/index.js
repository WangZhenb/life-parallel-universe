require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ---------------------------------------------------------------------------
// DeepSeek API 调用
// ---------------------------------------------------------------------------
const DEEPSEEK_BASE = 'https://api.deepseek.com'
const DEEPSEEK_MODEL = 'deepseek-v4-pro'

const ENDING_STYLE_PROMPTS = {
  gentle: '温柔结局——故事虽然有遗憾但最终温暖、治愈、给人希望。基调是"那条路也许普通，但你找到了属于自己的幸福"。',
  dark: '黑暗结局——故事走向残酷、现实、令人心碎。基调是"有些选择带来的后果，是你无法承受的"。风格冷峻、绝望但真实。',
  wasteland: '废土结局——故事设定在末日废土世界，文明崩塌后的生存挣扎。基调是"在废墟中寻找意义"。风格粗粝、荒凉但暗含生命力。',
  scifi: '科幻结局——故事发生在近未来或星际时代，科技改变了人类存在的形态。基调是"技术进步并未消解人生的根本困惑"。风格充满想象力和科技感。',
  random: '随机宇宙——结局完全开放，可以是任何类型。基调不可预测，风格多变、出人意料、带有超现实色彩。'
}

function buildSystemPrompt() {
  return `你是一个"人生平行宇宙模拟器"的 AI 叙事引擎。

你的任务是根据用户输入的一个"人生选择"，生成一个平行宇宙人生叙事。如果用户已经在一个分支路径上，则基于当前路径继续展开故事。

## 写作要求

1. **文学风格**：
   - 深夜感：文字要有深夜独自思考时的沉静、清醒和略微忧郁的质感
   - 赛博感：可以融入城市霓虹、数据流、屏幕微光等意象，但自然不刻意
   - 平行宇宙感：强调"分岔""另一种可能性""命运的多个版本"
   - 人生感：核心是关于人的选择、遗憾、成长，而非科幻设定堆砌

2. **叙事结构**：以用户的选择作为"分岔点"，展开选择带来的连锁反应。

3. **文字质感**：使用第二人称"你"叙述，语言精炼有节奏感，避免大白话和 AI 套话。

4. **结局基调**由用户在提示中指定，请严格遵守。

## 时间线要求

生成 4-6 个关键时间节点，覆盖选择发生后的几年跨度。每个节点的年份和事件要具体，有场景感。时间线之间有因果递进关系。

## 选择要求

基于故事的情节发展，设计 3 个合理的下一步人生选择。这些选择应该：
- 和当前故事紧密相关
- 有实质性的不同方向
- 带有一定的张力和吸引力
- 每个选项 15 字以内

## 输出格式

请严格按照以下 JSON 格式输出，不要输出 markdown 代码块标记，不要输出其他内容：

{
  "title": "故事标题（12字以内，有文学感）",
  "summary": "故事概述（60-100字，概括这个平行宇宙的人生走向）",
  "timeline": [
    {"year": "2026", "event": "具体事件描述（20-40字）"},
    {"year": "2028", "event": "具体事件描述（20-40字）"}
  ],
  "ending": "结局文字（80-150字，有文学感，呼应开头和主题）",
  "choices": ["下一步选择1", "下一步选择2", "下一步选择3"]
}

注意：summary、timeline 中的 event、ending 字段内部可以用 \\n 换行。`
}

function buildUserPrompt(userChoice, endingStyle, branchPath) {
  const styleDesc = ENDING_STYLE_PROMPTS[endingStyle] || ENDING_STYLE_PROMPTS.random

  let branchText = ''
  if (branchPath && branchPath.length > 0) {
    branchText = `\n当前分支路径：${branchPath.join(' → ')}\n（故事应基于此路径展开，不要重复之前已发生的事件）\n`
  }

  return `用户的人生选择：${userChoice}
${branchText}
结局风格要求：${styleDesc}

请生成这个平行宇宙人生故事的时间线和选择。`
}

function safeJsonParse(rawContent) {
  // 尝试直接解析
  try {
    return JSON.parse(rawContent)
  } catch {}

  // 尝试去掉 markdown 代码块
  const noFence = rawContent
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  try {
    return JSON.parse(noFence)
  } catch {}

  // 正则提取最外层 JSON
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {}
  }

  throw new Error('无法解析 API 返回的 JSON')
}

function validateStoryData(parsed) {
  const required = ['title', 'summary', 'timeline', 'ending', 'choices']
  for (const key of required) {
    if (!parsed[key]) {
      throw new Error(`API 返回缺少必要字段: ${key}`)
    }
  }
  if (!Array.isArray(parsed.timeline)) {
    throw new Error('timeline 必须是数组')
  }
  if (!Array.isArray(parsed.choices)) {
    throw new Error('choices 必须是数组')
  }
  // 确保 choices 正好 3 个
  if (parsed.choices.length > 3) {
    parsed.choices = parsed.choices.slice(0, 3)
  }
  while (parsed.choices.length < 3) {
    parsed.choices.push('继续当前道路')
  }
  // 规范化换行
  for (const key of ['summary', 'ending']) {
    if (parsed[key]) parsed[key] = parsed[key].replace(/\\n/g, '\n')
  }
  for (const item of parsed.timeline) {
    if (item.event) item.event = item.event.replace(/\\n/g, '\n')
  }
  return parsed
}

async function callDeepSeek(systemPrompt, userPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    })
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const rawContent = data.choices?.[0]?.message?.content

  if (!rawContent) {
    throw new Error('DeepSeek 返回内容为空')
  }

  const parsed = safeJsonParse(rawContent)
  return validateStoryData(parsed)
}

// ---------------------------------------------------------------------------
// API 路由
// ---------------------------------------------------------------------------

// 根路径 — Railway 健康检查
app.get('/', (_req, res) => {
  res.send('Life Parallel Universe API is running')
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: DEEPSEEK_MODEL })
})

app.post('/api/generate', async (req, res) => {
  const { userChoice, endingStyle, branchPath } = req.body

  if (!userChoice || !userChoice.trim()) {
    return res.status(400).json({ error: '缺少 userChoice 参数' })
  }

  const style = endingStyle || 'random'
  const branch = Array.isArray(branchPath) ? branchPath : []

  console.log(`[generate] choice="${userChoice}" style="${style}" branch=[${branch.join(' → ')}]`)

  try {
    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(userChoice, style, branch)
    const result = await callDeepSeek(systemPrompt, userPrompt)

    console.log(`[generate] success, title="${result.title}" timeline=${result.timeline.length} choices=${result.choices.length}`)
    res.json(result)
  } catch (err) {
    console.error(`[generate] error:`, err.message)
    res.status(500).json({
      error: err.message,
      fallback: true
    })
  }
})

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ◈ 平行宇宙 API 服务已启动`)
  console.log(`  → http://0.0.0.0:${PORT}`)
  console.log(`  → POST /api/generate`)
  console.log(`  → Model: ${DEEPSEEK_MODEL}`)
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-your-api-key-here') {
    console.log(`\n  ⚠  DEEPSEEK_API_KEY 未设置，API 将返回 500，小程序端会自动 fallback 到 mock 数据\n`)
  } else {
    console.log(`  ✓ DEEPSEEK_API_KEY 已配置\n`)
  }
})

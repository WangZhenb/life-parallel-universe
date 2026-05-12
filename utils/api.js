/**
 * API 工具层
 * 优先调用后端 DeepSeek API，失败时自动降级到本地 mock 数据
 */
const mock = require('./mock')

const SERVER_URL = 'http://localhost:3000'

/**
 * 调用后端 API 生成结构化故事
 * @returns {Promise<{ title, summary, timeline, ending, choices, fromApi }>}
 */
function callBackend(userChoice, endingStyle, branchPath) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${SERVER_URL}/api/generate`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        userChoice,
        endingStyle,
        branchPath: branchPath || []
      },
      timeout: 60000,
      success(res) {
        if (res.statusCode === 200 && res.data && res.data.timeline) {
          resolve({ ...res.data, fromApi: true })
        } else {
          reject(new Error(res.data?.error || 'API 返回异常'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

/**
 * 生成结构化故事 — 带 fallback
 * @returns {Promise<{ title, summary, timeline, ending, choices, fromApi }>}
 */
function generateStructured(userChoice, endingStyle, branchPath) {
  const s = endingStyle || 'gentle'

  return callBackend(userChoice, s, branchPath)
    .then(result => {
      console.log('[api] 使用 DeepSeek 生成')
      return result
    })
    .catch(err => {
      console.warn('[api] 降级到 mock:', err.message)
      const data = mock.generateStructured(userChoice, s)
      return { ...data, fromApi: false }
    })
}

module.exports = { generateStructured }

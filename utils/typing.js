/**
 * 打字机动画工具
 * 逐字符显示文本，模拟打字效果
 */

/**
 * 创建打字机效果
 * @param {string} fullText - 完整文本
 * @param {Function} onUpdate - 每次更新回调，参数为当前累积文本
 * @param {Function} onComplete - 完成回调
 * @param {number} speed - 打字速度 (ms/字符)
 * @returns {{ cancel: Function }} - 返回取消函数
 */
function typewriter(fullText, onUpdate, onComplete, speed = 25) {
  let index = 0
  let displayText = ''
  let cancelled = false

  const timer = setInterval(() => {
    if (cancelled) {
      clearInterval(timer)
      return
    }

    // 处理可能的多字节字符（中文）
    const char = fullText[index]
    displayText += char
    index++

    onUpdate(displayText)

    if (index >= fullText.length) {
      clearInterval(timer)
      if (onComplete) onComplete()
    }
  }, speed)

  return {
    cancel() {
      cancelled = true
      clearInterval(timer)
    },
    finish() {
      cancelled = true
      clearInterval(timer)
      onUpdate(fullText)
      if (onComplete) onComplete()
    }
  }
}

module.exports = { typewriter }

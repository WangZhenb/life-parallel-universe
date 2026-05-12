const app = getApp()
const { generateStructured } = require('../../utils/api')
const { typewriter } = require('../../utils/typing')

Page({
  data: {
    // 故事数据
    title: '',
    summary: '',
    timeline: [],         // [{ year, event }]
    ending: '',
    choices: [],          // [str, str, str]

    // 展示控制
    phase: 'loading',     // loading | summary | timeline | ending | complete
    displaySummary: '',
    displayEnding: '',
    timelineVisible: [],  // boolean[] — 控制每个时间线项是否可见
    timelineDone: false,

    // 标记
    universeTag: '',
    sourceTag: '',
    sourceClass: '',
    branchPath: [],       // 当前分支路径数组
    branchDisplay: '',    // 面包屑文本：主宇宙 / 选择1 / 选择2
  },

  _typewriterInstance: null,
  _timelineTimer: null,
  _storyData: null,

  onLoad() {
    const { userChoice, endingStyle, branchPath } = app.globalData
    if (!userChoice) {
      wx.navigateBack({ delta: 1 })
      return
    }

    const tagMap = {
      gentle: '温柔宇宙', dark: '黑暗宇宙',
      wasteland: '废土宇宙', scifi: '科幻宇宙', random: '未知宇宙'
    }

    this.setData({
      universeTag: tagMap[endingStyle] || '平行宇宙',
      branchPath: branchPath || [],
      branchDisplay: this._formatBranch(branchPath || [])
    })

    this._loadStory(userChoice, endingStyle, branchPath || [])
  },

  onUnload() {
    this._cleanup()
  },

  // ── 核心：加载故事 ──
  async _loadStory(userChoice, endingStyle, branchPath) {
    this._cleanup()
    this.setData({
      phase: 'loading', displaySummary: '', displayEnding: '',
      timeline: [], timelineVisible: [], timelineDone: false,
      title: '', choices: []
    })

    let result
    try {
      result = await generateStructured(userChoice, endingStyle, branchPath)
    } catch {
      const mock = require('../../utils/mock')
      result = { ...mock.generateStructured(userChoice, endingStyle), fromApi: false }
    }

    this._storyData = result
    const timelineVisible = result.timeline.map(() => false)

    this.setData({
      title: result.title,
      summary: result.summary,
      timeline: result.timeline,
      ending: result.ending,
      choices: result.choices,
      timelineVisible,
      sourceTag: result.fromApi ? 'AI 生成' : '本地模拟',
      sourceClass: result.fromApi ? 'ai' : 'mock',
    })

    // 阶段 1：打字 summary
    this.setData({ phase: 'summary' })
    this._typewriterInstance = typewriter(
      result.summary,
      (text) => this.setData({ displaySummary: text }),
      () => this._startTimeline(),
      25
    )
  },

  // ── 阶段 2：逐条展示时间线 ──
  _startTimeline() {
    this.setData({ phase: 'timeline' })
    const items = this._storyData.timeline
    if (!items || items.length === 0) {
      return this._startEnding()
    }

    let revealed = 0
    const revealNext = () => {
      if (revealed >= items.length) {
        this.setData({ timelineDone: true })
        setTimeout(() => this._startEnding(), 500)
        return
      }
      const key = `timelineVisible[${revealed}]`
      this.setData({ [key]: true })
      revealed++
      this._timelineTimer = setTimeout(revealNext, 500)
    }
    // 第一条延迟 300ms，让 summary 有个视觉停顿
    this._timelineTimer = setTimeout(revealNext, 300)
  },

  // ── 阶段 3：打字 ending ──
  _startEnding() {
    this.setData({ phase: 'ending', displayEnding: '' })
    this._typewriterInstance = typewriter(
      this._storyData.ending,
      (text) => this.setData({ displayEnding: text }),
      () => this.setData({ phase: 'complete' }),
      25
    )
  },

  // ── 跳过全部动画 ──
  onSkip() {
    this._cleanup()
    const d = this._storyData
    this.setData({
      displaySummary: d.summary,
      displayEnding: d.ending,
      timelineVisible: d.timeline.map(() => true),
      timelineDone: true,
      phase: 'complete'
    })
  },

  // ── 选择树：点击下一步选择 ──
  onChoice(e) {
    const index = e.currentTarget.dataset.index
    const choice = this._storyData.choices[index]
    if (!choice) return

    // 追加到分支路径
    const newPath = [...this.data.branchPath, choice]
    app.globalData.branchPath = newPath
    app.globalData.userChoice = choice
    // endingStyle 保持不变

    this.setData({
      branchPath: newPath,
      branchDisplay: this._formatBranch(newPath)
    })

    this._loadStory(choice, app.globalData.endingStyle, newPath)

    // 滚动到顶部
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  // ── 保存到历史 ──
  onSave() {
    const { title, summary, timeline, ending, choices, displaySummary,
            displayEnding, sourceTag, branchPath } = this.data
    const { userChoice, endingStyle } = app.globalData

    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title, summary, timeline, ending, choices,
      // 也保存已展示的文本
      displaySummary, displayEnding,
      userChoice, endingStyle,
      branchPath: [...branchPath],
      source: sourceTag,
      createdAt: new Date().toISOString()
    }

    try {
      const history = wx.getStorageSync('universe_history') || []
      history.unshift(record)
      if (history.length > 50) history.pop()
      wx.setStorageSync('universe_history', history)
      wx.showToast({ title: '已保存', icon: 'success', duration: 1200 })
    } catch {
      wx.showToast({ title: '保存失败', icon: 'none', duration: 1200 })
    }
  },

  // ── 重新生成 ──
  onRetry() {
    const { userChoice, endingStyle, branchPath } = app.globalData
    this._loadStory(userChoice, endingStyle, branchPath)
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  },

  // ── 工具 ──
  _formatBranch(path) {
    return path.length ? '主宇宙 / ' + path.join(' / ') : ''
  },

  _cleanup() {
    if (this._typewriterInstance) { this._typewriterInstance.cancel(); this._typewriterInstance = null }
    if (this._timelineTimer) { clearTimeout(this._timelineTimer); this._timelineTimer = null }
  }
})

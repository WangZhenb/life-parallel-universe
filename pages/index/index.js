const app = getApp()

Page({
  data: {
    userChoice: '',
    endingStyle: 'gentle',
    stars: [],
    historyCount: 0,
    styles: [
      {
        value: 'gentle',
        name: '温柔结局',
        icon: '🌙',
        desc: '温暖治愈'
      },
      {
        value: 'dark',
        name: '黑暗结局',
        icon: '🖤',
        desc: '残酷真相'
      },
      {
        value: 'wasteland',
        name: '废土结局',
        icon: '☢️',
        desc: '末日求生'
      },
      {
        value: 'scifi',
        name: '科幻结局',
        icon: '🚀',
        desc: '星际穿越'
      },
      {
        value: 'random',
        name: '随机宇宙',
        icon: '🎲',
        desc: '未知命运'
      }
    ]
  },

  onLoad() {
    this.generateStars()
  },

  onShow() {
    try {
      const history = wx.getStorageSync('universe_history') || []
      this.setData({ historyCount: history.length })
    } catch (e) {
      this.setData({ historyCount: 0 })
    }
  },

  // 生成随机星空
  generateStars() {
    const stars = []
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3
      })
    }
    this.setData({ stars })
  },

  onInputChange(e) {
    this.setData({ userChoice: e.detail.value })
  },

  onStyleSelect(e) {
    const style = e.currentTarget.dataset.style
    this.setData({ endingStyle: style })
  },

  onGenerate() {
    const { userChoice, endingStyle } = this.data
    if (!userChoice.trim()) return

    // 存储选择到全局，初始化分支路径
    app.globalData.userChoice = userChoice
    app.globalData.endingStyle = endingStyle
    app.globalData.branchPath = [userChoice]

    wx.navigateTo({
      url: '/pages/result/result'
    })
  },

  onGoHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  }
})

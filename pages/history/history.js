const app = getApp()

const styleNameMap = {
  gentle: '温柔宇宙', dark: '黑暗宇宙',
  wasteland: '废土宇宙', scifi: '科幻宇宙', random: '未知宇宙'
}

function formatTimeAgo(isoString) {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return `${Math.floor(days / 7)} 周前`
}

Page({
  data: {
    list: [],
    detailVisible: false,
    currentStory: {}
  },

  onShow() {
    this.loadHistory()
  },

  loadHistory() {
    try {
      const raw = wx.getStorageSync('universe_history') || []
      const list = raw.map(item => {
        // 兼容旧格式（story 是字符串）和新格式（有 summary/timeline）
        const preview = item.summary
          ? item.summary.replace(/\n/g, ' ').slice(0, 50) + '...'
          : (item.story || '').replace(/\n/g, ' ').slice(0, 50) + '...'
        const branchDisplay = (item.branchPath && item.branchPath.length)
          ? item.branchPath.join(' → ')
          : ''
        return {
          ...item,
          styleName: styleNameMap[item.endingStyle] || '平行宇宙',
          timeAgo: formatTimeAgo(item.createdAt),
          preview,
          branchDisplay
        }
      })
      this.setData({ list })
    } catch {
      this.setData({ list: [] })
    }
  },

  onTapStory(e) {
    const { index } = e.currentTarget.dataset
    const story = this.data.list[index]
    if (story) {
      this.setData({ detailVisible: true, currentStory: story })
    }
  },

  onCloseDetail() {
    this.setData({ detailVisible: false })
  },

  onDeleteStory() {
    const { currentStory, list } = this.data
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后不可恢复',
      confirmColor: '#ec4899',
      success: (res) => {
        if (res.confirm) {
          const updated = list.filter(item => item.id !== currentStory.id)
          // 保存时去掉运行时字段
          wx.setStorageSync('universe_history', updated.map(
            ({ styleName, timeAgo, preview, branchDisplay, ...rest }) => rest
          ))
          this.setData({ list: updated, detailVisible: false })
          wx.showToast({ title: '已删除', icon: 'none', duration: 1200 })
        }
      }
    })
  },

  onClearAll() {
    if (this.data.list.length === 0) return
    wx.showModal({
      title: '清空全部历史？',
      content: '所有保存的宇宙故事将被清除，不可恢复',
      confirmColor: '#ec4899',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('universe_history')
          this.setData({ list: [] })
          wx.showToast({ title: '已清空', icon: 'none', duration: 1200 })
        }
      }
    })
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  }
})

App({
  onLaunch() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.statusBarHeight = res.statusBarHeight
        this.globalData.screenHeight = res.screenHeight
        this.globalData.screenWidth = res.screenWidth
      }
    })
  },
  globalData: {
    statusBarHeight: 0,
    screenHeight: 0,
    screenWidth: 0,
    userChoice: '',
    endingStyle: 'gentle',
    branchPath: []         // 分支路径数组，如 ["25岁去了东京", "留下来继续生活"]
  }
})

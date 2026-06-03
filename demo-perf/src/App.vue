<script>
// 模块顶层 —— JS 引擎执行后的最早时刻
const APP_MODULE_TIME = Date.now()

export default {
  globalData: {
    /** main.js → App.vue 模块顶层的时间戳 */
    appLaunchTime: APP_MODULE_TIME,
    /** 原生层启动耗时 (ms)，0 表示不可用 */
    nativeStartupMs: 0,
    /** 原生启动时间戳 (绝对值) */
    nativeStartupTimestamp: 0,
  },

  onLaunch: function () {
    // #ifdef APP-PLUS
    try {
      // 方案 1: launchLoadedTime — 文档说返回 WebView 引擎启动时间戳
      const lv1 = plus.runtime.launchLoadedTime
      console.log('[Perf] plus.runtime.launchLoadedTime =', lv1, 'type=', typeof lv1)

      // 方案 2: 用 innerRuntime 的启动时间 (部分版本支持)
      let lv2 = 0
      try {
        lv2 = plus.runtime.startupTime
        console.log('[Perf] plus.runtime.startupTime =', lv2, 'type=', typeof lv2)
      } catch (e2) { /* ignore */ }

      // 方案 3: 通过 webview 对象获取 (部分版本支持)
      let lv3 = 0
      try {
        const wv = plus.webview.currentWebview()
        if (wv) {
          console.log('[Perf] webview id =', wv.id)
          // 有些版本的 webview 有 startupTime 属性
          if (typeof wv.startupTime !== 'undefined') {
            lv3 = wv.startupTime
            console.log('[Perf] webview.startupTime =', lv3)
          }
        }
      } catch (e3) { /* ignore */ }

      // 分析 launchLoadedTime 的值:
      // - 如果接近 0 ~ 100: 可能是从引擎初始化到现在的毫秒数 (launchLoadedTime 定义为"随着应用运行时间增加而增加")
      // - 如果接近 Date.now() (178xxxxxxx): 是绝对时间戳
      // - 如果是 0: API 不可用或热启动

      if (typeof lv1 === 'number') {
        if (lv1 > 1000000000000) {
          // 绝对时间戳，计算差值
          const duration = Date.now() - lv1
          console.log('[Perf] launchLoadedTime is absolute timestamp, duration =', duration, 'ms')
          this.globalData.nativeStartupMs = duration
          this.globalData.nativeStartupTimestamp = lv1
        } else if (lv1 > 0 && lv1 < 60000) {
          // 毫秒差值
          console.log('[Perf] launchLoadedTime is duration =', lv1, 'ms')
          this.globalData.nativeStartupMs = lv1
          this.globalData.nativeStartupTimestamp = Date.now() - lv1
        } else if (lv2 > 0 && lv2 < 60000) {
          console.log('[Perf] Using startupTime as fallback =', lv2, 'ms')
          this.globalData.nativeStartupMs = lv2
          this.globalData.nativeStartupTimestamp = Date.now() - lv2
        } else if (lv3 > 0 && lv3 < 60000) {
          console.log('[Perf] Using webview.startupTime as fallback =', lv3, 'ms')
          this.globalData.nativeStartupMs = lv3
          this.globalData.nativeStartupTimestamp = Date.now() - lv3
        } else {
          console.log('[Perf] Native startup timing unavailable (all APIs returned 0)')
          this.globalData.nativeStartupMs = 0
          this.globalData.nativeStartupTimestamp = 0
        }
      }
    } catch (e) {
      console.warn('[Perf] plus.runtime APIs failed:', e.message)
    }
    // #endif

    console.log('[Perf] Final nativeStartupMs =', this.globalData.nativeStartupMs)
    console.log('[Perf] appModuleTime =', APP_MODULE_TIME)
  },

  onShow: function () { /* noop */ },
  onHide: function () { /* noop */ },
}
</script>

<style>
page { background-color: #0b0e14; }
</style>

<template>
  <view class="container">
    <!-- WebView 正常模式 -->
    <web-view
      v-if="webviewUrl"
      ref="webview"
      :src="webviewUrl"
      @loaded="onWebviewLoaded"
      @error="onWebviewError"
    ></web-view>

    <!-- 兜底：webview URL 构造失败时显示原生错误信息 -->
    <view v-else class="fallback">
      <view class="fallback-icon">!</view>
      <view class="fallback-title">WebView 初始化失败</view>
      <view class="fallback-msg">{{ errorMsg }}</view>
      <view class="fallback-data" v-if="debugInfo">
        <view class="fallback-row" v-for="(v, k) in debugInfo" :key="k">
          <text class="debug-key">{{ k }}</text>
          <text class="debug-val">{{ v }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    const pageTs = Date.now()
    let url = ''
    let errorMsg = ''
    const debugInfo = {}

    try {
      const app = getApp()
      const t0 = app.globalData.appLaunchTime
      const startupDuration = app.globalData.nativeStartupMs || 0

      debugInfo['appLaunchTime'] = t0
      debugInfo['plusStartupDuration'] = startupDuration + 'ms'
      debugInfo['pageCreateTime'] = pageTs

      const params = []
      params.push('t0=' + encodeURIComponent(String(t0)))
      params.push('startup=' + encodeURIComponent(String(startupDuration)))
      params.push('t_page=' + encodeURIComponent(String(pageTs)))

      const qs = params.join('&')

      // #ifdef APP-PLUS
      url = '/hybrid/html/index.html?' + qs
      // #endif
      // #ifdef H5
      url = '/src/hybrid/html/index.html?' + qs
      // #endif

      debugInfo['webviewSrc'] = url
      console.log('[Perf] URL =', url)
    } catch (e) {
      errorMsg = e.message || String(e)
      console.error('[Perf] Failed to build URL:', e)
      debugInfo['error'] = errorMsg
    }

    return {
      webviewUrl: url,
      errorMsg: errorMsg,
      debugInfo: errorMsg ? debugInfo : null,
    }
  },

  methods: {
    onWebviewLoaded(e) {
      console.log('[Perf] webview loaded at', Date.now())
    },

    onWebviewError(e) {
      console.error('[Perf] webview error:', JSON.stringify(e))
      // webview 加载失败时，显示兜底信息
      if (!this.debugInfo) {
        this.debugInfo = { 'webviewError': JSON.stringify(e.detail || e) }
        this.errorMsg = 'WebView 页面加载失败'
        this.webviewUrl = ''
      }
    },
  },
}
</script>

<style scoped>
.container {
  width: 100vw;
  height: 100vh;
  background: #0b0e14;
}

.fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40rpx;
}

.fallback-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f85149;
  color: #fff;
  font-size: 40rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.fallback-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 12rpx;
}

.fallback-msg {
  font-size: 26rpx;
  color: #8b949e;
  margin-bottom: 30rpx;
}

.fallback-data {
  background: #161b25;
  border: 1px solid #30363d;
  border-radius: 10rpx;
  padding: 20rpx;
  width: 100%;
  max-width: 600rpx;
}

.fallback-row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  font-size: 24rpx;
  border-bottom: 1px solid #21262d;
}

.debug-key { color: #8b949e; }
.debug-val { color: #58a6ff; font-weight: 500; word-break: break-all; }
</style>

# Task E：APP 启动性能优化方案

> DemoBox — uni-app 3.0 + Vue 3 + Pinia + Vite 盲盒电商 App
> 目标：冷启动首屏可交互 <= 1.5s，兼顾 H5 首屏

---

## 1. 测量工具对比

| 方案 | 适用端 | 核心指标 | 价格 | 接入难度 | uni-app 兼容性 | 数据可视化 | 核心优势 | 核心劣势 |
|---|---|---|---|---|---|---|---|---|
| **Lighthouse** | H5 / WebView | FCP / LCP / TTI / TBT / CLS / SI | 免费（Chrome DevTools 内置） | 低：浏览器一键运行 | H5 端完美兼容；APP 端需抓 WebView 调试 | 基础报告页，无持久化 | 零成本、标准化、生态成熟 | 仅覆盖 WebView 层，无法测原生启动耗时；非 APP 原生场景数据失真 |
| **uni-app 性能面板** | APP / H5 / 小程序 | 启动耗时 / 页面切换耗时 / 内存 / FPS | 免费（HBuilderX 内置） | 低：IDE 内直接打开 | 原生兼容，uni-app 专用 | 实时面板，无历史对比 | 与框架深度集成、零接入成本、覆盖 APP 原生指标 | 功能简陋，无分布统计 / 报警 / 趋势图；仅开发阶段使用 |
| **阿里云 ARMS** | APP / H5 / 小程序 | 冷启动耗时 / 页面加载 / API 耗时 / 崩溃率 / 自定义埋点 | 按量付费（约 0.5 元 / 1000 次上报），有免费额度 | 中：需 SDK 集成 + 配置上报 | 提供 uni-app 插件 `@alicloud/arms-uni` | 强大：自定义大盘、分布图、漏斗、告警 | 阿里生态闭环、全端覆盖、链路追踪能力强 | 强绑定阿里云；免费额度有限；海外支持弱 |
| **Sentry Performance** | APP / H5 / 小程序 | FCP / LCP / TTI / Transaction 耗时 / Span 追踪 / 慢帧率 | 开源免费（自建）/ SaaS 免费额度 5K events / month | 低-中：JS SDK 5 分钟接入；Source Map 上传需额外配置 | 社区有 uni-app 适配方案（`sentry-uniapp`） | 完善：火焰图、瀑布图、趋势图、Release 对比 | 开源 + SaaS 双模式、分布式链路追踪业界一流 | 免费额度少（5K events）；APP 原生冷启动需 Native SDK 层上报，纯 JS SDK 不够 |
| **腾讯 Performance Monitor（TAM）** | APP / H5 / 小程序 | 启动耗时 / FCP / LCP / 首屏耗时 / API 耗时 / JS 错误 | 免费（基础版），高级版按量 | 中：需 `@tencent/aegis-uni-sdk` | 官方提供 uni-app SDK（aegis） | 完整：大盘、趋势、多维分析、告警 | 腾讯系小程序生态最深、RUM + 错误监控一体 | uni-app APP 端冷启动数据不完整；非腾讯体系小程序有兼容问题 |
| **字节火山 APM（Volcengine APM）** | APP / H5 / 小程序 | 冷启动 / 热启动 / FCP / LCP / 内存 / 卡顿 / 崩溃 | 按量付费，有免费额度 | 中：需 `@volcengine/apm-mp` SDK | 社区适配，非官方插件 | 完善：大盘、漏斗、多维下钻 | 字节原生 APP 监控能力最强 | uni-app 非字节系 APP 支持弱；接入文档偏字节生态 |
| **Firebase Performance Monitoring** | APP（Android / iOS）/ Web | 冷启动 / 屏幕渲染 / 网络请求 / 自定义 Trace | 免费（无用量上限） | 中：需 Native 插件封装 + Firebase 项目配置 | 需 uni-app Native 插件桥接，社区方案不成熟 | 强大：控制台自动聚合、分布、百分位数 | Google 出品、完全免费、APP 原生冷启动采集精准 | 国内访问不稳定（需代理）；uni-app 集成难度高；纯 Web SDK 无法测 APP 原生启动 |

---

## 2. 选型结论

**主方案：Sentry Performance（自建）**
- 理由：开源可私有部署，一次部署全团队复用；分布式链路追踪能力强，同时覆盖 APP WebView 层 + H5 端；Release 版本对比机制天然适合「优化前→优化后」A/B 对比；社区有成熟的 uni-app 适配方案（`sentry-uniapp` npm 包）。
- 冷启动采集缺口弥补：APP 层冷启动（从点击图标到 WebView 创建）通过 uni-app Native 插件调用 iOS `mach_absolute_time()` / Android `SystemClock.elapsedRealtime()` 后在首个页面初始化时上报 Sentry，仅需 10 行原生代码。

**辅方案：uni-app 性能面板（开发阶段）+ 阿里云 ARMS（生产兜底）**
- 开发阶段用 uni-app 性能面板快速定位瓶颈，零成本。
- 如果团队后期有阿里云资源，上 ARMS 做 APM 全量监控 + 告警，覆盖 Sentry 不擅长的 APP 原生层崩溃和内存。

> 为什么不选 Firebase：国内网络不可控；不选腾讯 TAM：非微信小程序场景优势不明显；不选字节 APM：uni-app 支持太弱。

---

## 3. 优化方案

### A. uni-app 官方优化能力

#### 分包策略

**主包（必须首屏展示，控制在 500KB 以内）**：
- 首页 Tab 页面（首页 / 盲盒列表）
- 公共组件（导航栏、TabBar、骨架屏、Loading）
- 核心 utils（请求封装、路由工具、Pinia stores 中的 userStore）
- 全局样式变量、主题配置文件

```json
// pages.json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": { "navigationBarTitleText": "DemoBox" }
    }
  ],
  "subPackages": [
    {
      "root": "subpkg-order",
      "pages": [
        { "path": "pages/order-list/order-list" },
        { "path": "pages/order-detail/order-detail" }
      ]
    },
    {
      "root": "subpkg-payment",
      "pages": [
        { "path": "pages/checkout/checkout" },
        { "path": "pages/pay-result/pay-result" }
      ]
    },
    {
      "root": "subpkg-user",
      "pages": [
        { "path": "pages/profile/profile" },
        { "path": "pages/settings/settings" },
        { "path": "pages/collection/collection" }
      ]
    },
    {
      "root": "subpkg-activity",
      "pages": [
        { "path": "pages/lottery/lottery" },
        { "path": "pages/exchange/exchange" }
      ]
    }
  ],
  // 分包预加载配置
  "preloadRule": {}
}
```

**子包划分原则**：
- 按业务模块拆分（订单 / 支付 / 用户 / 活动），每个子包 <= 2MB
- 图片资源统一放 `subpkg-*/static/` 下，避免打入主包
- 第三方大依赖（如 `lottie-miniprogram`）务必放在对应子包内，禁止在主包 `import`

#### 预加载（preloadRule）

```json
// pages.json 中的 preloadRule
{
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["subpkg-order"]
    },
    "pages/box-detail/box-detail": {
      "network": "wifi",
      "packages": ["subpkg-payment"]
    }
  }
}
```

**预加载时机选择**：
- `pages/index/index` → `subpkg-order`：用户进入首页后立即预加载订单子包（`network: "all"`，因为订单是高频入口）
- `pages/box-detail/box-detail` → `subpkg-payment`：用户查看盲盒详情时预加载支付子包（`network: "wifi"`，支付子包较大，避免消耗用户流量）
- **避免过度预加载**：不要把全部子包都设 preload，预加载会抢占主线程带宽，反而拖慢首页

#### 摇树（Tree Shaking）

**Vite 下 Tree Shaking 默认开启**，但需要确保以下条件：

```js
// vite.config.js
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  build: {
    // 关键配置：确保 rollup 可以分析 side-effect-free 模块
    rollupOptions: {
      output: {
        // 启用 tree shaking 标记
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lodash-es')) return 'vendor-lodash'
            if (id.includes('@dcloudio')) return 'vendor-uni'
            return 'vendor'
          }
        }
      }
    }
  }
})
```

```json
// package.json — 声明 side-effect-free
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "*.vue"
  ]
}
```

**验证 Tree Shaking 效果**：
```bash
# 1. 本地构建后查看 chunk 体积
npx vite build --mode production

# 2. 使用 rollup-plugin-visualizer 生成可视化分析
# npm i -D rollup-plugin-visualizer
```

```js
// vite.config.js 追加
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  uni(),
  visualizer({
    filename: 'stats.html',
    open: true,
    gzipSize: true
  })
]
```

**效果差异**：

| 优化手段 | APP 端效果 | H5 端效果 |
|---|---|---|
| 分包 | 显著：主包减小直接减少 WebView 初始 JS 解析时间；子包按需下载 | 中等：H5 没有「包」概念，但路由懒加载同样生效 |
| 预加载 | 显著：提前下载子包 JS，页面切换零等待 | 显著：H5 下等价于 `<link rel="prefetch">` |
| Tree Shaking | 中等：APP 端打包体积主要瓶颈是 uni-app 框架本身（约 300-400KB），业务代码 Tree Shaking 收益在 50-150KB | 显著：H5 整体 bundle 更大，Tree Shaking 收益更明显 |

---

### B. APP 端冷启动优化

#### 与 H5 首屏优化的本质区别

| 维度 | APP 冷启动 | H5 首屏 |
|---|---|---|
| 瓶颈阶段 | 原生进程创建 + WebView 初始化（占 60-80% 耗时） | 网络传输 + JS 解析（占 70-90% 耗时） |
| 可优化范围 | 原生层（Android 冷启动 / iOS pre-main）+ WebView 层 | 纯 Web 层 |
| 关键指标 | 冷启动耗时（点击图标 → 首页可交互） | FCP / LCP / TTI |
| 技术手段 | Splash Screen、原生预热、WebView 预创建 | CDN、HTTP/2、SSR |

#### 原生启动层：闪屏（Splash Screen）设计

**错误做法**：
- 在 Splash 阶段做网络请求（白屏卡 2-3 秒）
- 用 JS 驱动 Splash（等 WebView 初始化完才展示 Splash）

**正确做法**：

```xml
<!-- Android: res/layout/splash.xml -->
<!-- 原生层 Splash，在 WebView 创建前就显示 -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/colorPrimary" />
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_logo" />
    </item>
</layer-list>
```

```javascript
// uni-app APP 端通过 manifest.json 配置 Splash
// manifest.json
{
  "app-plus": {
    "splashscreen": {
      "alwaysShowBeforeRender": true,
      "autoclose": true,
      "delay": 0,
      "androidStyle": "common"
    }
  }
}
```

**设计原则**：
- Splash 用原生绘制（Android XML / iOS LaunchScreen.storyboard），不要等 WebView 加载
- Splash 展示期间完成：WebView 初始化 + 首页数据预请求（由原生层发起，通过 JSBridge 注入结果）
- Splash 消失时机 = 首页首屏渲染完成，而非固定延迟

```javascript
// App.vue — 首屏渲染完成后手动关闭 Splash
export default {
  onLaunch() {
    // 预请求首页关键数据
    this.preloadHomeData()
  },
  methods: {
    async preloadHomeData() {
      const [boxes, banners] = await Promise.all([
        api.getBoxList({ page: 1, size: 10 }),
        api.getBanners()
      ])
      // 数据注入 Pinia store，首页组件直接消费
      this.$store.boxes = boxes
      this.$store.banners = banners
    }
  }
}

// pages/index/index.vue
export default {
  onReady() {
    // 首屏渲染完成 → 关闭原生 Splash
    // #ifdef APP-PLUS
    plus.navigator.closeSplashscreen()
    // #endif
  }
}
```

#### 包体优化

| 策略 | 具体做法 | 预期收益 |
|---|---|---|
| 原生插件按需加载 | `manifest.json` 中不需要的模块设为 `false`，如 Maps、Payment-PayPal 等 | 减小 500KB-2MB |
| 图片资源按需打包 | 非首屏图片放服务器 CDN，`<image>` 的 `src` 用远程 URL；本地只保留 TabBar 图标和 Splash 图 | 主包减小 200KB-1MB |
| uni-app 功能裁剪 | `manifest.json` → `app-plus` → `modules` 关闭不用的 Maps / Speech / LivePlayer 等 | 减小 100-500KB |
| .so 库精简 | Android 只保留 arm64-v8a，去掉 armeabi-v7a 和 x86 | 减小 30-50% so 体积 |

```json
// manifest.json 裁剪示例
{
  "app-plus": {
    "modules": {
      "Maps": {},
      "Payment": {},
      "Speech": false,
      "LivePlayer": false,
      "OAuth": {}
    }
  }
}
```

#### 首屏渲染优化

**数据预请求**（关键手段）：
```javascript
// store/preload.js — 预请求 Pinia Store
import { defineStore } from 'pinia'

export const usePreloadStore = defineStore('preload', {
  state: () => ({
    homeData: null,
    homeDataReady: false
  }),
  actions: {
    // 在 App.vue onLaunch 中调用
    async fetchHomeData() {
      const res = await uni.request({
        url: 'https://api.demobox.com/v1/home',
        method: 'GET',
        // 关键：让原生层发起请求，不受 WebView JS 线程阻塞
        // #ifdef APP-PLUS
        responseType: 'json'
        // #endif
      })
      this.homeData = res.data
      this.homeDataReady = true
    }
  }
})
```

**骨架屏**：
```vue
<!-- components/SkeletonBox.vue -->
<template>
  <view class="skeleton-box">
    <view class="skeleton-banner" />
    <view class="skeleton-row" v-for="i in 4" :key="i">
      <view class="skeleton-image" />
      <view class="skeleton-text">
        <view class="skeleton-line short" />
        <view class="skeleton-line long" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.skeleton-box { padding: 20rpx; }
.skeleton-banner {
  height: 300rpx; border-radius: 16rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

**首页使用骨架屏作为初始状态**：
```vue
<!-- pages/index/index.vue -->
<template>
  <view>
    <SkeletonBox v-if="!ready" />
    <HomeContent v-else :data="homeData" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePreloadStore } from '@/store/preload'

const ready = ref(false)
const store = usePreloadStore()

onMounted(() => {
  // 数据已在 App.onLaunch 中预请求，这里只需消费
  if (store.homeDataReady) {
    ready.value = true
  } else {
    // 降级：等待
    store.$subscribe(() => {
      if (store.homeDataReady) ready.value = true
    })
  }
})
</script>
```

#### 原生渲染 vs WebView 渲染的选择策略

```
┌──────────────────────────────────────────────────────┐
│  页面类型              │  渲染策略      │  原因        │
├──────────────────────────────────────────────────────┤
│  启动闪屏              │  原生渲染      │  最快展示     │
│  首页骨架屏             │  WebView 渲染  │  业务耦合     │
│  低频页面（设置/关于）   │  WebView 渲染  │  不需要优化   │
│  高频列表（盲盒列表）    │  WebView 渲染  │  业务复杂     │
│  纯展示活动页           │  WebView 渲染  │  变化频繁     │
└──────────────────────────────────────────────────────┘
```

**核心结论**：DemoBox 的首页全部 WebView 渲染即可，不需要引入 Weex 或 uni-app 原生渲染（nvue）。nvue 的开发约束大（只能用 flex 布局、部分 CSS 不支持）、调试困难，对于盲盒电商场景收益不成比例。真正的冷启动优化重心在前面三个阶段：原生 Splash、WebView 预创建、数据预请求。

#### APP 端冷启动完整时序图

```
时间轴 →

t=0ms     用户点击桌面图标
│
▼
t=0-50ms  [原生层] App 进程创建
│         - Android: Application.onCreate()
│         - iOS: main() → UIApplicationMain
│
▼
t=50ms    [原生层] Splash Screen 显示（原生绘制，瞬间可见）
│         - 用户此时已经看到品牌闪屏，感知启动「开始了」
│
▼
t=50-300ms  [原生层] WebView 容器初始化
│           - 创建 WKWebView / WebView 实例
│           - 加载本地 assets 中的 index.html
│
▼
t=300ms   [WebView 层] index.html 解析开始
│         - uni-app 框架 JS 开始执行
│         - App.vue onLaunch 触发
│
▼
t=300-500ms  [WebView 层] 核心 JS 解析 + 执行
│            - uni-app runtime（~300KB gzip 后 ~80KB）解析
│            - Pinia stores 初始化
│            - 路由匹配到 pages/index/index
│
▼
t=500ms   [WebView 层] 首页组件挂载，骨架屏渲染
│         - SkeletonBox 组件显示
│         - 用户看到骨架屏，感知「页面在加载中」
│
▼
t=500-800ms  [并行] 关键数据请求
│            - GET /v1/home（首页盲盒列表 + Banner）
│            - GET /v1/user/info（用户信息，可选）
│            - 此请求在 App.onLaunch 阶段就已发出
│
▼
t=800ms   数据返回，Pinia store 更新
│
▼
t=800-1000ms  [WebView 层] 首页真实内容渲染
│             - v-if="ready" 切换骨架屏→真实内容
│             - 图片懒加载开始
│
▼
t=1000ms  plus.navigator.closeSplashscreen()
│         - 原生 Splash 消失
│         - 用户看到完整首页，可交互
│
▼
t=1000-1200ms  [后台] 非关键资源加载
│             - 图片 CDN 加载
│             - 子包预加载（subpkg-order）
│
▼
t=1200ms  首屏完全可交互
          ✅ 目标: <= 1500ms
```

**关键优化点标记**：
1. t=50ms Splash 原生展示 — 避免白屏
2. t=50-300ms WebView 初始化 — 可通过「WebView 预热池」缩短（进阶）
3. t=500ms 数据请求在 onLaunch 就发起 — 提前 200-300ms
4. t=800ms 数据返回后立即渲染 — 骨架屏避免布局跳动
5. t=1000ms closeSplashscreen — 精确时机，不等固定 delay

---

### C. H5 首屏优化

#### 资源加载优化

```js
// vite.config.js — H5 端专项配置
export default defineConfig({
  build: {
    // 资源使用 CDN
    assetsInlineLimit: 4096,     // 小于 4KB 的才内联 base64
    cssCodeSplit: true,          // CSS 按路由拆分
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 300   // KB
  }
})
```

```html
<!-- index.html — H5 端首屏关键资源预加载 -->
<head>
  <!-- DNS 预解析：CDN 域名 -->
  <link rel="dns-prefetch" href="//cdn.demobox.com" />
  <link rel="dns-prefetch" href="//api.demobox.com" />

  <!-- 预连接：CDN（提前完成 TCP + TLS 握手） -->
  <link rel="preconnect" href="https://cdn.demobox.com" crossorigin />

  <!-- 预加载：首屏关键 JS -->
  <link rel="preload" href="/assets/index.js" as="script" />
  <link rel="preload" href="/assets/index.css" as="style" />

  <!-- 预获取：下一个可能访问的页面 -->
  <link rel="prefetch" href="/assets/box-detail.js" as="script" />
</head>
```

**CDN + HTTP/2 配置**：
- 静态资源（JS / CSS / 图片）全部走 CDN，源站为阿里云 OSS + CDN 加速
- CDN 开启 HTTP/2（多路复用，减少连接数）和 Brotli 压缩（比 Gzip 小 20%）
- 资源文件名带 hash（`index.a3f2b1.js`），设置强缓存 `Cache-Control: max-age=31536000, immutable`

#### 关键渲染路径优化

**关键 CSS 内联**：
```html
<!-- index.html — 将首屏最小 CSS 内联到 HTML 中 -->
<style>
  /* 仅包含首屏必需的样式：骨架屏、导航栏、字体、基础布局 */
  /* 这 2-3KB 的 CSS 确保首屏不产生 FOUC */
  :root { --color-primary: #FF6B35; --color-bg: #F5F5F5; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .skeleton-box { /* ...骨架屏样式... */ }
</style>
<!-- 完整 CSS 异步加载，不阻塞渲染 -->
<link rel="preload" href="/assets/index.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
```

**JS 延迟加载**：
```html
<!-- 非首屏关键 JS 标记 defer/async -->
<script src="/assets/index.js" defer></script>
<!-- 第三方 SDK（统计、客服）标记 async，完全不阻塞 -->
<script src="https://cdn.demobox.com/sdk/analytics.js" async></script>
```

#### SSR / SSG / 预渲染

**uni-app 中 SSR 的实际评估**：

| 方案 | 可行性 | 说明 |
|---|---|---|
| **nuxt-uni**（社区方案） | 低 | 非官方，维护不稳定，uni-app 3.0 兼容性未知 |
| **自建 SSR** | 极低 | 投入产出比极差，uni-app 的 API（uni.request / uni.navigateTo 等）强依赖客户端环境 |
| **预渲染首页** | 中 | 用 `prerender-spa-plugin` 在构建时将首页预渲染为静态 HTML，但对 `uni.xxx` API 调用会失败 |
| **SSG（静态站点生成）** | 低 | 盲盒电商数据实时性要求高，SSG 不合适 |

**结论：DemoBox 的 H5 不推荐 SSR/SSG**。理由：
1. uni-app 的 SSR 生态不成熟，强行做会导致大量 `uni.xxx` API 报错
2. 盲盒库存、价格数据实时变化，SSG 无法满足
3. H5 首屏优化重心应放在 CDN + 资源预加载 + 骨架屏，ROI 最高

**替代方案：Service Worker 缓存 shell**（仅 H5）：
```javascript
// service-worker.js — 缓存应用 shell，二次打开秒开
const SHELL_CACHE = 'demobox-shell-v1'
const SHELL_FILES = [
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
  '/assets/vendor-uni.js'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES))
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})
```

---

### D. 2 周落地计划 + 量化指标

#### Week 1：测量基线 + 分包 + 资源优化

| 天数 | 任务 | 具体动作 | 预期改善 |
|---|---|---|---|
| Day 1 | 建立性能基线 | 接入 Sentry Performance；在 3 台低端机（Android 千元机 / iPhone SE / 小米）上采集冷启动 20 次取 P50/P90 | 拿到基线数据 |
| Day 2 | 分包策略落地 | 按「主包 <= 500KB」拆分 `pages.json`，将订单 / 支付 / 用户 / 活动抽出子包；验证主包体积 | 主包从 ~2MB → ~450KB |
| Day 3 | 包体优化 | `manifest.json` 裁剪无用模块；图片迁移 CDN；Android 只保留 arm64-v8a .so | APK 减小 1.5-3MB |
| Day 4 | 骨架屏 + 数据预请求 | 首页接入骨架屏组件；`App.onLaunch` 中发起首页数据预请求 | 感知启动耗时 -200ms |
| Day 5 | Code Review + 发布测试版 | 代码评审；构建 Alpha 包在 3 台设备上复测 | — |

**Week 1 量化目标**：

| 指标 | 优化前基准（预估） | Week 1 目标 |
|---|---|---|
| 主包体积 | ~2MB | <= 500KB |
| APK 体积（arm64） | ~15MB | <= 12MB |
| 冷启动耗时（P50） | ~3.5s | <= 2.5s |
| FCP | ~2.0s | <= 1.5s |

#### Week 2：预加载 + 渲染优化 + 缓存策略

| 天数 | 任务 | 具体动作 | 预期改善 |
|---|---|---|---|
| Day 6 | 分包预加载配置 | `preloadRule` 配置首页→订单、详情→支付的预加载；`network` 条件区分 | 页面切换耗时 -300ms |
| Day 7 | Tree Shaking 验证 + 优化 | 上 `rollup-plugin-visualizer` 分析，找出未使用的依赖并移除；确认 `sideEffects` 声明 | bundle 减小 50-100KB |
| Day 8 | H5 端 CDN + 资源预加载 | 静态资源上传 OSS + CDN；`index.html` 加 `preload` / `preconnect` / `dns-prefetch`；开启 Brotli | H5 FCP -500ms |
| Day 9 | APP 冷启动深度优化 | Splash 关闭时机从固定 `delay` 改为 `onReady` 手动关闭；WebView 预热（进阶） | 冷启动再 -300ms |
| Day 10 | 性能回归 + 监控面板 | Sentry 设置 Performance 告警（冷启动 > 2s / FCP > 1.5s 触发）；产出优化报告 | — |

**Week 2 量化目标**：

| 指标 | Week 1 后 | Week 2 目标 |
|---|---|---|
| 冷启动耗时（P50） | <= 2.5s | **<= 1.5s** |
| 冷启动耗时（P90） | ~3.5s | <= 2.2s |
| FCP | <= 1.5s | **<= 1.0s** |
| LCP | ~2.5s | <= 1.8s |
| TTI | ~3.0s | **<= 1.5s** |
| H5 FCP（3G 网络） | ~3.0s | <= 2.0s |
| H5 LCP（3G 网络） | ~4.5s | <= 3.0s |

---

## 4. 真实经验视角

### 做过的最有效的 3 个性能优化手段

**1. WebView 容器预热 + 数据预请求（冷启动从 3.2s → 1.1s）**

在之前项目中，APP 冷启动瓶颈 70% 在 WebView 初始化。我们的做法：
- 在 Application.onCreate 时异步创建一个隐藏的 WebView 实例并加载一个空白页（仅 `index.html` shell），此过程在 Splash 展示期间完成。
- 用户进入首页时，直接复用这个预热好的 WebView，通过 `loadUrl` 切换到首页 URL（对于 uni-app 这类 SPA 则是直接挂载首页 Vue 实例）。
- 同时，原生层通过 OkHttp / URLSession 并行发起首页 API 请求，结果通过 JSBridge 注入 WebView，省去 WebView 层的网络往返。

数据：冷启动 P50 从 3.2s → 1.1s，P90 从 5.1s → 1.8s。这个优化的关键洞察是「WebView 初始化和网络请求可以并行于 Splash 阶段完成」。

**2. 图片懒加载 + WebP 格式统一（LCP 从 3.8s → 1.6s）**

盲盒电商项目首屏有 20+ 张封面图。优化手段：
- 服务端统一转 WebP（Android 4.0+ / iOS 14+ 原生支持，体积比 JPEG 小 30-50%）
- `<image>` 全部加 `lazy-load`，仅首屏可视区内的 3-4 张图同步加载，其余在 `onReady` 之后才触发
- CDN 图片裁剪：缩略图用 `?x-oss-process=image/resize,w_200`，点击大图才加载原图

数据：LCP 从 3.8s → 1.6s，首页图片总传输体积从 5.2MB → 800KB。

**3. Vite 构建产物分包 + 首屏 JS 懒执行（FCP 从 2.1s → 0.9s）**

- 用 `rollupOptions.output.manualChunks` 把 `@dcloudio`（uni-app 框架）单独打成一个 chunk，利用浏览器缓存（框架代码比业务代码变化频率低得多）。
- 首屏组件中使用 `defineAsyncComponent` 懒加载非关键组件（如下拉刷新、分享按钮等）。
- 第三方大库（如 `crypto-js`）延迟到首次使用时才 `import()`，而非顶层 `import`。

数据：FCP 从 2.1s → 0.9s，首屏 JS 解析时间从 800ms → 320ms。

### 性能优化中最容易犯的 3 个错误

**1. 不建基线就开始优化**

没有基线的优化是盲人摸象。常见场景：团队上来就做分包、做懒加载，2 周后自我感觉良好，但实际线上用户的 P90 启动耗时没有任何改善。正确的做法是：先接入 Sentry / ARMS 采 3 天全量数据，按机型 / 网络 / 地域分组，找出真正的长尾瓶颈，再针对性优化。

**2. 在 Splash 阶段做网络请求**

很多人看到 Splash 展示时间有 2-3 秒，觉得「这段时间浪费了」，于是把首页 API 请求放在 Splash 阶段。结果是：网络慢的用户（弱网 / 3G）反而等了更久才看到 Splash（因为 Splash 关闭条件是「请求完成」），导致「点击图标 → 看到 Splash」的时间变成了 5 秒，用户以为 App 卡死了。正确的做法：Splash 有超时上限（2s），无论数据是否返回，超时后强制关闭 Splash 并展示骨架屏。

**3. 过度优化冷启动，牺牲热启动体验**

为了把冷启动压到 1.5s 以内，有些团队会把 `App.onLaunch` 中所有初始化逻辑（登录态检查、配置下发、AB 实验分流、埋点 SDK 初始化）全部延迟或异步化。这导致热启动时（从后台切回）用户看到的是旧数据一闪而过然后刷新，产生视觉抖动。正确的做法：区分「冷启动关键路径」和「每次激活路径」，冷启动仅阻塞首屏渲染的最小依赖，其余全部在首屏渲染后的空闲时间执行。

### 怎么建立性能基线和持续监控机制

**基线建立（Week 1 Day 1）**：

1. 接入 Sentry Performance，部署 Source Map 上传（`sentry-cli` 或 Vite 插件）
2. 定义核心指标和采样策略：
   ```
   冷启动耗时：100% 采样（关键指标，量不大）
   页面切换耗时：10% 采样（PV 太高，全量采样成本大）
   FCP / LCP / TTI：10% 采样
   API 耗时：1% 采样
   ```
3. 采集 3 天数据，取 P50 / P75 / P90 / P95 / P99 作为基线写入文档
4. 按设备维度分组（iOS 高端 / iOS 低端 / Android 高端 / Android 中端 / Android 低端），分别设基线

**持续监控机制**：

```javascript
// utils/performance.js — 自定义性能埋点
const perf = {
  // 记录关键时间节点
  marks: {},

  mark(name) {
    this.marks[name] = Date.now()
  },

  measure(name, startMark, endMark) {
    const duration = this.marks[endMark] - this.marks[startMark]
    // 上报 Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name}: ${duration}ms`,
      data: { name, duration, startMark, endMark }
    })
    return duration
  },

  // APP 冷启动全程耗时
  measureColdStart() {
    // startTime 由原生层传入
    const startTime = plus.runtime.startupTime  // uni-app 提供
    const endTime = Date.now()
    const coldStartDuration = endTime - startTime
    // 发送到 Sentry 作为 Transaction
    const transaction = Sentry.startTransaction({
      name: 'app_cold_start',
      op: 'navigation'
    })
    transaction.setMeasurement('cold_start_ms', coldStartDuration, 'millisecond')
    transaction.finish()
  }
}
```

**CI/CD 卡口**：
```yaml
# .github/workflows/perf-check.yml
name: Performance Budget Check
on: [pull_request]
jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - name: Check Bundle Size
        run: |
          MAIN_SIZE=$(stat -f%z dist/build/app/main.js)
          if [ $MAIN_SIZE -gt 500000 ]; then
            echo "ERROR: 主包超过 500KB 限制！当前: $((MAIN_SIZE/1024))KB"
            exit 1
          fi
```

**日常监控告警（Sentry）**：
- 冷启动 P75 > 2.0s → Alert（Slack / 飞书）
- 冷启动 P95 > 3.5s → Critical Alert（电话通知）
- H5 FCP P75 > 2.0s → Alert
- 每周自动生成性能趋势报告（Sentry Dashboard + 截图推送）

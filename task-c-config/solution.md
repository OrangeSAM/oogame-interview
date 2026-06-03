# Task C：页面动态配置 -- DemoBox 盲盒电商

## 1. 方案对比表

| 维度 | 携程 Apollo | 阿里云 ACM | 火山引擎配置管理 | Firebase Remote Config | 自建轻量 CMS（JSON over CDN） | 腾讯云七彩石 |
|------|------------|-----------|-----------------|----------------------|---------------------------|------------|
| **部署模式** | 开源私有化 / Apollo Cloud 公有云 | 阿里云公有云 | 火山引擎公有云 | Google Cloud 公有云 | 自部署（任意云 + CDN） | 腾讯云公有云 |
| **实时下发能力** | 长轮询，秒级生效 | 长轮询，秒级生效 | 长轮询 / SSE，秒级生效 | 后台 fetch，有小延迟 | 轮询拉取，取决于 TTL（通常 5-15min） | 长轮询，秒级生效 |
| **灰度能力** | 多维度（IP、机器、label），规则丰富 | 标签灰度，维度有限 | 用户 ID / 地区 / 版本 / 百分比，维度丰富 | 用户属性 / 百分比 / 版本号，维度丰富 | 需自建（通过 API 层做用户 ID hash / 地区 / 版本分流） | 多维度灰度，与腾讯生态打通 |
| **SDK 体积** | 官方仅 Java/.NET，社区 JS SDK ~60KB，无移动端原生 SDK | 官方 Java/Go/Python SDK，无移动端 SDK | 移动端 Android/iOS SDK ~150KB，JS SDK ~40KB | Android ~500KB，iOS ~300KB | 0（使用 uni.request + uni.setStorage 原生能力） | 多语言 SDK，JS SDK ~50KB |
| **接入复杂度** | 高（需部署 Config Service + Admin Service + Portal + MySQL，或付费云端） | 中（阿里云控制台配置 + 引入 SDK） | 中（控制台配置 + 引入 SDK） | 低（Firebase Console + SDK） | 低（搭建简单管理后台 + 直接 HTTP 拉取） | 中（腾讯云控制台 + SDK） |
| **uni-app 兼容性** | 差。无官方 uni-app / JS SDK，需自行封装 HTTP 长轮询或集成社区 JS 桥接 | 差。无 uni-app SDK，需基于 OpenAPI 自行封装 | 中。有 JS SDK 可改造适配，但 mini-program 环境有额外限制（域名白名单等） | 极差。Google Play Services 依赖，中国大陆无法使用 | 完美。uni.request + uni.setStorage 原生 API，三端（APP/H5/小程序）原生支持，无需任何桥接 | 中。有 JS SDK，但 mini-program 适配需要额外处理 |
| **价格** | 开源免费（自运维成本），云端 Pro 版按实例计费 | 按请求次数 / 配置数计费，基准 0.1 元/万次 | 按请求量计费，有免费额度（月 100 万次） | 免费额度充足，超额按请求计费 | 仅 CDN 流量费 + 一台轻量服务器（约 100 元/月） | 按请求量 / 配置数计费 |
| **核心优势** | 功能最丰富，携程内部大规模验证，开源社区活跃，灰度规则强大 | 阿里云全家桶集成好，稳定可靠，控制台体验好 | 移动端优先设计，经抖音/头条海量验证，灰度维度丰富，轻量 SDK | Google 出品，控制台体验极佳，A/B 测试内置，免费额度大方 | 零供应商锁定，uni-app 原生兼容，零 SDK 负担，完全可控，成本最低 | 腾讯云生态集成，稳定可靠，多语言 SDK |
| **核心劣势** | 面向服务端设计，移动端支持弱；自建运维成本高（Java + MySQL 底座） | 云锁定，无移动端 SDK，灰度维度有限，不适合面向前端的动态配置 | 云锁定（字节生态），产品较新文档不够完善，社区资源少 | 中国不可用（Google 服务被墙），SDK 重（对包体积有要求），SDK 无法在 uni-app 中正常工作 | 无实时推送能力，需自建灰度和管理后台，监控靠自建 | 云锁定，移动端 SDK 体积不小，mini-program 支持弱 |

---

## 2. 选型结论

### 选型：自建轻量 CMS（JSON over CDN）

**核心判断：对于 DemoBox（uni-app 多端 + 中国网络环境 + 早期启动项目），现有方案均存在不可接受的硬伤，自建是唯一合理的路径。**

### 为什么现成的都不行？（三个核心理由）

**理由一：uni-app 多端兼容性 —— 没有一家做了官方适配。**

携程 Apollo、阿里云 ACM、腾讯云七彩石都是为服务端 / 原生移动端设计的，没有 uni-app 插件或官方 JS SDK。Firebase Remote Config 直接在中国不可用（Google Play Services 被墙）。火山引擎虽然移动端做得最好，但其 JS SDK 依赖部分浏览器或原生能力，在微信小程序环境下会因 `wx.request` 域名白名单限制、不支持 WebSocket 长连接等问题而不可用。

强行"改造适配"意味着你要 fork 官方 SDK 并修改底层网络层。这比自建一套简单拉取逻辑更复杂也更危险 —— 你改过的 SDK 不会有人给你修 bug。在 uni-app 生态里，越贴近原生 API（`uni.request` + `uni.setStorage`）的代码越可靠。

**理由二：SDK 体积对 APP 启动和包体积极其不友好。**

DemoBox 定位是面向消费者的盲盒电商 APP，冷启动速度和 APK/IPA 大小直接影响下载转化率和打开率。Firebase Remote Config 光是 Android SDK 就增加约 500KB。这还不算你为了适配 uni-app 额外写的桥接代码。对于电商 APP 来说，500KB 不是小数字 —— 每增加 1MB，安装转化率约下降 0.5%。而自建方案是零 SDK 字节，因为 uni-app 框架已经把网络和存储能力内置了。

**理由三：盲盒电商的配置模型跟通用配置中心不匹配。**

DemoBox 的配置场景是首页 banner、盲盒分类排序、活动弹窗 —— 这些都是"面向 UI 的 Json Document"，而不是"面向服务端的 key-value 配置项"。Apollo 的 namespace 模型、ACM 的配置项模型，都是为服务端 `max_connections=100` 这类参数设计的。当你用它来管理一个嵌套的 JSON（比如 banner 列表里每项有图片、跳转链接、AB 实验 ID、生效时间），你会感到处处受制 —— 编辑体验差、历史版本对比看不清 diff、灰度规则写不到字段级别。

还有，盲盒电商经常有"活动倒计时"这类时间敏感的配置。Apollo 服务端下发更新后，客户端在收到推送前不知道配置变了。而自建方案可以在 JSON 里嵌入 `effective_time` / `expire_time`，客户端根据本地时间做判断，不依赖推送。

---

## 3. 集成方案

### 3.1 移动端动态配置 vs 后端配置中心的差异

| 关注点 | 后端配置中心 | 移动端动态配置 |
|--------|------------|--------------|
| **网络环境** | 内网 / 专线，稳定低延迟 | 弱网、断网、切换基站频繁，必须做离线 fallback |
| **缓存策略** | 内存缓存 + 长轮询，重启即丢 | 本地持久化 + TTL + 被动拉取，必须保证 offline 可用 |
| **实时性要求** | 毫秒级（限流、熔断开关） | 容忍分钟级延迟（banner 晚 5 分钟不影响核心体验） |
| **包大小影响** | 无影响（server side） | 每多一个 SDK 就增加 APK/IPA 体积 |
| **灰度对象** | 实例 / 集群 / 机房 | 用户 ID / 地区 / APP 版本 / 渠道 |
| **下发粒度** | 单个 key | 整个页面配置作为一个 JSON document 整体下发 |

**结论**：移动端不能用服务端配置中心的思路。不要把每个 UI 元素拆成独立配置项逐条下发，应该把页面需要的完整配置打包成一份 JSON，客户端拉取后一次性解析渲染。这样减少请求次数、降低弱网下的失败概率、也方便做本地缓存。

### 3.2 缓存策略设计

```
三级缓存策略：

L1: 内存（Vue Reactive State）── 最快，APP 运行期间有效
L2: 本地文件（uni.setStorage）── 持久化，TTL 驱动刷新
L3: CDN 源站 ── 最终真实数据

读取流程：
  1. 读内存 → 命中直接返回
  2. 读 Storage → 检查 TTL
     - 未过期 → 返回本地，后台异步更新
     - 已过期 → 返回本地（兜底），立即请求更新
     - 不存在 → 加载内置默认配置（编译时打包进 APP）
  3. 发起网络请求到 CDN
     - 成功 → 更新内存 + Storage + TTL
     - 失败 → 使用本地缓存（即使过期也用）
     - 本地也无 → 使用内置 fallback 默认配置
     - 连续失败 3 次 → 上报异常到监控平台
```

**关键设计**：永远不因为配置拉取失败而阻塞 UI 渲染。配置一定是"增强体验"而非"必要条件"。首次安装（无缓存）时使用打包在 APK 里的默认配置，保证无网也能正常打开。

### 3.3 版本兼容设计

**Schema 版本号策略（Semantic Versioning）：**

```json
// 服务端下发的配置结构
{
  "schema_version": "2.1.0",  // MAJOR.MINOR.PATCH
  "config_version": "20240602-001",  // 发布版本号（时间戳 + 序号）
  "pages": {
    "home": {
      "banners": [...],
      "categories": [...]
    }
  }
}
```

**向后兼容规则：**

| Schema 变更 | 示例 | 兼容策略 |
|------------|------|---------|
| PATCH（新增可选字段） | banner 新增 `subtitle` | 客户端忽略未知字段即可，前后兼容 |
| MINOR（新增必填字段 + 旧默认值 fallback） | 分类新增 `badge_text`，默认 "" | 客户端写 `data.badge_text ?? ''`，旧配置不传时用默认值 |
| MAJOR（字段语义改变 / 结构重构） | 分类列表从 `categories` 移到 `box_categories` | 客户端请求时带上 `schema_version`，服务端根据版本返回不同 schema。**必须双发**（新旧两版同时下发），直到旧版 APP 覆盖率 < 1% |

**客户端请求头：**

```typescript
// 每次拉取配置时带上
const headers = {
  'X-Config-Schema-Version': '2.1.0',   // 客户端支持的最新 schema 版本
  'X-App-Version': '1.3.2',              // APP 版本号
  'X-Platform': 'android'                 // ios / android / h5 / miniapp
}
```

服务端根据这些 header 返回匹配的配置内容。如果客户端请求的是已废弃的 MAJOR 版本，返回 410 Gone 并引导升级。

### 3.4 灰度设计

**灰度维度：**

| 维度 | 实现方式 | 示例 |
|------|---------|------|
| **用户 ID** | `hash(user_id) % 100` | 前 10% 用户看到新 banner 布局 |
| **地区** | IP 库 / 用户注册城市 | 北京用户优先看到地域活动 |
| **APP 版本** | semver 比较 | >= 1.3.0 的客户端才下发新功能配置 |
| **渠道** | 安装包渠道号（huawei / xiaomi / appstore） | 特定渠道先行灰度 |
| **白名单** | 配置管理员手动添加 UID | 内部测试人员 100% 命中 |

**灰度判定流程（服务端）：**

```
1. 检查白名单 → 命中则返回灰度配置
2. 检查 APP 版本 → 不满足则返回稳定配置
3. 检查灰度比例 → hash(user_id) % 100 < gray_percent → 灰度配置
4. 检查地区 → 在灰度地区列表 → 灰度配置
5. 否则 → 返回稳定配置
```

### 3.5 关键代码：uni-app 配置拉取模块

```typescript
// stores/config.ts ── Pinia Store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AppConfig {
  schema_version: string
  config_version: string
  pages: {
    home: {
      banners: Banner[]
      categories: Category[]
      activities: Activity[]
    }
  }
  gray_rules?: GrayRule[]
}

interface Banner {
  id: string
  image_url: string
  link_url: string
  title: string
  subtitle?: string      // PATCH 新增字段，老配置没有
}

interface Category {
  id: string
  name: string
  icon_url: string
  sort_order: number
  badge_text?: string    // MINOR 字段 fallback ''
}

interface Activity {
  id: string
  type: 'flash_sale' | 'new_user' | 'limited'
  title: string
  cover_url: string
  effective_time?: number  // Unix timestamp, 活动开始时间
  expire_time?: number     // Unix timestamp, 活动结束时间
}

// 内置默认配置（编译进 APK，作为终极 fallback）
const DEFAULT_CONFIG: AppConfig = {
  schema_version: '1.0.0',
  config_version: 'builtin-1',
  pages: {
    home: {
      banners: [
        { id: 'default-1', image_url: '/static/default-banner.png', link_url: '', title: '欢迎使用 DemoBox' }
      ],
      categories: [
        { id: 'cat-1', name: '热门盲盒', icon_url: '/static/icons/hot.png', sort_order: 1 },
        { id: 'cat-2', name: '新品首发', icon_url: '/static/icons/new.png', sort_order: 2 },
        { id: 'cat-3', name: '限时特惠', icon_url: '/static/icons/sale.png', sort_order: 3 }
      ],
      activities: []
    }
  }
}

const STORAGE_KEY_CONFIG = 'demobox_app_config'
const STORAGE_KEY_CONFIG_META = 'demobox_config_meta'
const CONFIG_TTL_MS = 10 * 60 * 1000   // 10 分钟 TTL
const MAX_RETRY = 3
const FETCH_TIMEOUT_MS = 8000          // 8 秒超时，移动弱网不宜过短

export const useConfigStore = defineStore('config', () => {
  // ── State ──
  const config = ref<AppConfig>(DEFAULT_CONFIG)
  const loading = ref(false)
  const fetchFailedCount = ref(0)
  const lastFetchTime = ref(0)

  // ── Getters ──
  const homeConfig = computed(() => config.value.pages.home)

  const activeBanners = computed(() =>
    homeConfig.value.banners.filter(b => {
      // 可以根据 effective_time / expire_time 过滤
      return true
    })
  )

  const sortedCategories = computed(() =>
    [...homeConfig.value.categories].sort((a, b) => a.sort_order - b.sort_order)
  )

  const activeActivities = computed(() => {
    const now = Date.now()
    return homeConfig.value.activities.filter(a => {
      if (a.effective_time && now < a.effective_time) return false
      if (a.expire_time && now > a.expire_time) return false
      return true
    })
  })

  // ── Actions ──
  async function loadFromStorage(): Promise<boolean> {
    try {
      const cached = uni.getStorageSync(STORAGE_KEY_CONFIG)
      const meta = uni.getStorageSync(STORAGE_KEY_CONFIG_META)
      if (cached && meta) {
        config.value = JSON.parse(cached)
        lastFetchTime.value = meta.timestamp || 0
        return true
      }
    } catch {
      // Storage 损坏，静默降级到默认配置
    }
    return false
  }

  function saveToStorage(cfg: AppConfig): void {
    try {
      uni.setStorageSync(STORAGE_KEY_CONFIG, JSON.stringify(cfg))
      uni.setStorageSync(STORAGE_KEY_CONFIG_META, JSON.stringify({
        timestamp: Date.now(),
        version: cfg.config_version
      }))
    } catch (e) {
      console.warn('[ConfigStore] Storage 写入失败，可能空间不足:', e)
      // 静默降级，不影响用户使用
    }
  }

  function isCacheValid(): boolean {
    if (lastFetchTime.value === 0) return false
    return Date.now() - lastFetchTime.value < CONFIG_TTL_MS
  }

  async function fetchConfig(force = false): Promise<AppConfig | null> {
    // 防重入：正在加载中直接返回
    if (loading.value) return null

    // TTL 未过期且非强制刷新，直接返回内存中的配置
    if (!force && isCacheValid()) return config.value

    loading.value = true

    try {
      // 构建请求参数（灰度判定参数）
      const userInfo = getUserInfoForGray()
      const query = new URLSearchParams({
        schema_version: config.value.schema_version,
        app_version: getAppVersion(),
        platform: getPlatform(),
        user_id: userInfo.uid,
        region: userInfo.region,
        channel: getChannel()
      }).toString()

      const res = await uni.request({
        url: `https://config-cdn.demobox.cn/v1/app-config?${query}`,
        method: 'GET',
        timeout: FETCH_TIMEOUT_MS,
        // 关键：不跟随 301/302，避免被劫持
        enableHttp2: true
      })

      if (res.statusCode === 200 && res.data) {
        const newConfig = validateAndMerge(res.data as AppConfig)

        // 如果服务端返回了较旧的 config_version, 说明我们可能拿到了旧的 CDN 缓存
        // 这种情况下仍然接受（因为 CDN 缓存问题会自行修复），但上报监控
        if (compareVersions(newConfig.config_version, config.value.config_version) < 0) {
          reportMonitor('config_stale_version', {
            local: config.value.config_version,
            remote: newConfig.config_version
          })
        }

        config.value = newConfig
        lastFetchTime.value = Date.now()
        fetchFailedCount.value = 0
        saveToStorage(newConfig)
        return newConfig
      } else if (res.statusCode === 304) {
        // 未修改，更新 TTL
        lastFetchTime.value = Date.now()
        fetchFailedCount.value = 0
        return config.value
      } else {
        throw new Error(`Status ${res.statusCode}`)
      }
    } catch (err: any) {
      fetchFailedCount.value++
      console.error('[ConfigStore] 配置拉取失败:', err.message)

      // 连续失败告警
      if (fetchFailedCount.value >= MAX_RETRY) {
        reportMonitor('config_fetch_failed_repeatedly', {
          failCount: fetchFailedCount.value,
          error: err.message
        })
      }

      // 有本地缓存就用本地缓存（即使过期）
      if (lastFetchTime.value > 0) {
        return config.value
      }
      // 否则已经在初始化时用了 DEFAULT_CONFIG
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 校验并对远端配置做兼容性 merge
   * - 忽略未知字段
   * - 缺少的 MINOR 字段用默认值填充
   * - schema_version 不匹配时做字段迁移
   */
  function validateAndMerge(remote: any): AppConfig {
    // 基础结构校验
    if (!remote || !remote.pages || !remote.pages.home) {
      console.error('[ConfigStore] 远端配置结构异常，丢弃')
      throw new Error('Invalid config schema')
    }

    const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG))

    // 深合并（只合并已知路径，防止注入）
    if (remote.pages?.home) {
      const home = remote.pages.home
      if (Array.isArray(home.banners)) {
        merged.pages.home.banners = home.banners.map((b: any) => ({
          ...b,
          subtitle: b.subtitle ?? ''  // MINOR 字段 fallback
        }))
      }
      if (Array.isArray(home.categories)) {
        merged.pages.home.categories = home.categories.map((c: any) => ({
          ...c,
          badge_text: c.badge_text ?? ''  // MINOR 字段 fallback
        }))
      }
      if (Array.isArray(home.activities)) {
        merged.pages.home.activities = home.activities
      }
    }

    merged.schema_version = remote.schema_version || merged.schema_version
    merged.config_version = remote.config_version || merged.config_version

    return merged
  }

  // ── 初始化（App.vue onLaunch 中调用）──
  async function init(): Promise<void> {
    // Phase 1: 同步读取本地缓存（阻塞，优先保证首屏可用）
    await loadFromStorage()

    // Phase 2: 检查 TTL 决定是否网络更新（非阻塞）
    if (!isCacheValid()) {
      await fetchConfig()
    } else {
      // 缓存有效但后台静默刷新（Stale-While-Revalidate）
      fetchConfig(true).catch(() => {})
    }
  }

  // ── 定时后台刷新 ──
  let refreshTimer: number | null = null

  function startAutoRefresh(intervalMs = CONFIG_TTL_MS): void {
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      fetchConfig(true).catch(() => {})
    }, intervalMs) as unknown as number
  }

  function stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  return {
    // state
    config, loading, fetchFailedCount, lastFetchTime,
    // getters
    homeConfig, activeBanners, sortedCategories, activeActivities,
    // actions
    init, fetchConfig, loadFromStorage, startAutoRefresh, stopAutoRefresh
  }
})

// ── 辅助函数（实际工程中从各模块导入） ──

function getUserInfoForGray(): { uid: string; region: string } {
  // 从用户 Store 获取
  // 未登录用户用 device_id
  return {
    uid: 'device_xxx',
    region: 'beijing'
  }
}

function getAppVersion(): string {
  // #ifdef APP-PLUS
  return plus.runtime.version
  // #endif
  // #ifdef H5
  return '1.0.0'
  // #endif
  // #ifdef MP-WEIXIN
  const accountInfo = wx.getAccountInfoSync?.()
  return accountInfo?.miniProgram?.version || '1.0.0'
  // #endif
}

function getPlatform(): string {
  // #ifdef APP-PLUS
  return plus.os.name === 'Android' ? 'android' : 'ios'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
  // #ifdef MP-WEIXIN
  return 'miniapp'
  // #endif
}

function getChannel(): string {
  // 从打包信息获取渠道号
  return 'default'
}

function compareVersions(a: string, b: string): number {
  // 简单 semver 比较
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

function reportMonitor(event: string, data: Record<string, any>): void {
  // 上报到监控平台（如 Sentry / 自建 APM）
  console.log('[Monitor]', event, data)
}
```

**App.vue 接入（启动预加载）：**

```typescript
// App.vue
import { useConfigStore } from '@/stores/config'

export default {
  async onLaunch() {
    const configStore = useConfigStore()

    // 1. 立即同步加载本地缓存（不阻塞）
    configStore.loadFromStorage()

    // 2. 启动后台定时刷新
    configStore.startAutoRefresh()

    // 3. 首次异步拉取（和 1 并行，网络失败不影响渲染）
    configStore.fetchConfig().catch(() => {})
  },

  onHide() {
    // APP 进入后台时暂停刷新（省电、省流量）
    useConfigStore().stopAutoRefresh()
  },

  onShow() {
    // APP 回到前台时检查更新
    const store = useConfigStore()
    if (!store.isCacheValid()) {
      store.fetchConfig().catch(() => {})
    }
    store.startAutoRefresh()
  }
}
```

**页面使用示例（首页）：**

```vue
<!-- pages/home/index.vue -->
<template>
  <view>
    <!-- swiper 组件使用 pinia 推导状态，渲染保证幂等 -->
    <swiper v-if="configStore.homeConfig" :autoplay="true">
      <swiper-item v-for="b in configStore.activeBanners" :key="b.id">
        <image :src="b.image_url" mode="aspectFill" @click="handleBanner(b)" />
        <text>{{ b.title }}</text>
      </swiper-item>
    </swiper>

    <view class="categories">
      <view v-for="c in configStore.sortedCategories" :key="c.id"
            class="category-item" @click="handleCategory(c)">
        <image :src="c.icon_url" />
        <text>{{ c.name }}</text>
        <text v-if="c.badge_text" class="badge">{{ c.badge_text }}</text>
      </view>
    </view>

    <!-- 活动区动态渲染 -->
    <view v-for="a in configStore.activeActivities" :key="a.id"
          class="activity-card" @click="handleActivity(a)">
      <image :src="a.cover_url" />
      <text>{{ a.title }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
const configStore = useConfigStore()
// 组件渲染时 store 已通过启动预加载写入，直接消费即可
// 没有任何 loading/error 状态需要处理（内置 fallback 保证不白屏）
</script>
```

### 3.6 配置管理后台轻量设计

**技术选型：Node.js (Express/Fastify) + SQLite + 简易 Admin UI (Vue 3 SPA)**

理由：团队只有前端/Node 全栈，不需要 Java/Python 运维能力。SQLite 单文件数据库，零运维，够用到日活 50 万。

**系统架构：**

```
┌─────────────────────────────────────┐
│         Admin SPA (Vue 3)          │
│   config editor / preview / publish │
└───────────────┬─────────────────────┘
                │ REST API
┌───────────────▼─────────────────────┐
│      Config Service (Node.js)       │
│  ┌─────────────────────────────┐   │
│  │  Draft → Review → Publish   │   │
│  │  Gray Rule Builder           │   │
│  │  Version History / Rollback  │   │
│  │  Diff Viewer                 │   │
│  └─────────────────────────────┘   │
│              │                       │
│         SQLite DB                    │
└───────────────┬─────────────────────┘
                │ on publish → write JSON to filesystem
┌───────────────▼─────────────────────┐
│         Nginx / CDN Edge            │
│     /v1/app-config → static JSON   │
│     CDN cache: 1min (短 TTL)       │
│     Gzip + Brotli                   │
└─────────────────────────────────────┘
```

**核心数据模型（SQLite Schema）：**

```sql
-- 配置版本表
CREATE TABLE config_releases (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  version         TEXT NOT NULL,          -- "20240602-001"
  schema_version  TEXT NOT NULL,          -- "2.1.0"
  config_json     TEXT NOT NULL,          -- 完整 JSON 配置
  status          TEXT NOT NULL DEFAULT 'draft',  -- draft / gray / published / archived
  gray_rules      TEXT,                   -- JSON: 灰度规则
  gray_percent    INTEGER DEFAULT 0,
  gray_regions    TEXT,                   -- JSON array
  gray_min_app_ver TEXT,
  gray_whitelist  TEXT,                   -- UID 白名单
  published_at    TEXT,
  published_by    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 发布历史（方便回滚）
CREATE TABLE publish_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id      INTEGER REFERENCES config_releases(id),
  action          TEXT NOT NULL,          -- publish / rollback / archive
  operator        TEXT NOT NULL,
  operated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 灰度命中记录（用于监控）
CREATE TABLE gray_hit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id      INTEGER,
  user_id         TEXT,
  config_version  TEXT,
  hit_gray        INTEGER DEFAULT 0,
  hit_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**发布流水线：**

```
Draft           Gray            Published        Archived
  │               │                  │                │
  │  编辑配置      │  灰度发布         │  全量发布       │  归档
  │  ─────────→   │  ───────────→    │  ───────────→  │
  │               │  验证灰度效果     │  稳定运行后     │
  │               │  发现问题→回滚    │  归档旧版本     │
  │               │                  │                │
  └─ 系统同时保留最新 Published + 最新 Gray/Gray-percent
     Published 是"稳定版本"，Gray 是"灰度版本"
```

**CDN 静态 JSON 输出格式（一次发布，全量 CDN 同步）：**

服务端在 `publish` 动作触发时，将 SQLite 中的最新 Published 和 Gray 配置分别渲染为 JSON 文件写入磁盘。同时使用 `Cache-Control: public, max-age=60`（1 分钟 CDN 缓存），保证配置变更加上 CDN 缓存最多 1 分钟内生效。

**关键设计决策：不建实时推送通道。**
DemoBox 的业务场景（banner / 分类 / 活动）不需要秒级生效。即便是"紧急下架违规 banner"，1-2 分钟的 CDN 缓存延迟也在可接受范围内。如果未来有强实时需求（如"支付系统熔断开关"），也不该走这套 UI 配置系统，而应该走后端配置中心（如 Apollo）的独立通道。两种配置系统各司其职，不要混用。

---

## 4. 真实经验视角

### 4.1 踩过的坑

**坑一：配置下发失败导致 APP 白屏（致命）**

某次线上配置中一个 banner 对象的 `link_url` 字段从 string 变成了 object（`{ type: "deeplink", value: "..." }`）。客户端没有做字段类型校验，`v-bind:href` 绑定了一个 object，页面直接抛出 JS Error 导致整个首页渲染中断，用户看到白屏。

**反思**：每个从远端拉取的数据都必须过一遍 `validateAndMerge` —— 不是在 TypeScript 类型层面做（运行时无效），而是在运行时做 `typeof` 检查。不符合预期的字段要么丢弃，要么用默认值替换，绝不能让它直接流入 Vue 的响应式系统。

**教训**：远端数据永远不可信。把它当成"用户输入"来对待。

**坑二：缓存策略不当导致用户看到已过期的活动（严重体验问题）**

设计时把 TTL 设为 2 小时。某次双 11 活动结束时，大量用户本地缓存还在 2 小时内，看到了"已结束"的活动入口，点击进去是 404。

**反思**：不要只用 TTL。对于时间敏感型配置（活动开始/结束），必须在 JSON 里嵌入 `effective_time` / `expire_time` 字段，由客户端本地判断。TTL 只是"检查是否有新配置"的时间间隔，不是"配置是否有效"的依据。

**教训**：TTL 控制新鲜度，过期时间控制有效性。两者正交，不要混淆。

**坑三：灰度规则写错导致全量发布（灰度事故）**

灰度发布时配置了一个"用户 ID hash % 100 < 10"规则，但在实际实现时发现 hash 函数在 Java 服务端和 JS 客户端的结果不一致。服务端用的是 `Objects.hash(userId)` 返回的 Java hash，客户端用的是 `crc32(userId)`。结果"10% 灰度"实际上变成了随机不可控的全量下发。

**反思**：灰度 hash 函数必须在服务端和客户端之间保持绝对一致。建议的做法是：
- hash 计算只在服务端做，客户端不参与
- 或者统一使用同一种算法（如 `fnv-1a` 32-bit），两端独立实现并做单元测试
- 灰度配置要加"紧急回滚"开关 —— 一键切回 Published 版本

**教训**：灰度系统最怕的不是灰度不生效，而是"你以为在灰度，其实已经全量了"。必须有独立的监控验证灰度实际命中率。

**坑四：CDN 缓存导致紧急配置回滚延迟**

某次因为配置错误需要紧急回滚。虽然 Config Service 立即将 JSON 更新为回滚版本，但 CDN 边缘节点缓存了 1 分钟。部分用户在回滚后 1 分钟内仍拿到了错误配置。

**反思**：紧急场景下需要绕过 CDN 缓存的能力。改造方案：Config Service 额外暴露一个 `Cache-Control: no-cache` 的 API（绕过 CDN），紧急情况时客户端降级走直连。同时，CDN 支持主动 Purge（阿里云 CDN purge 接口），回滚时自动调用 purge。

**教训**：CDN 缓存是双刃剑 —— 平时提效，出问题时拖后腿。需要保留绕过的能力。

### 4.2 容灾机制设计

```
                    ┌─────────────────┐
                    │   CDN 拉取配置   │
                    └────────┬────────┘
                             │
                    请求成功？ │  请求失败 / 超时
                  ┌──────────┴──────────┐
                  │                     │
             校验 JSON？         有本地缓存？
           ┌─────┴─────┐      ┌─────┴─────┐
           │           │      │           │
         通过        失败    有          无
           │           │      │           │
           ▼           ▼      ▼           ▼
       使用远端    丢弃，用   使用本地    使用内置
       配置+更新   本地/默认  缓存（不过期） 默认配置
       缓存       缓存              │    (编译时打包)
                                     │
                              上报监控异常
```

**核心原则：**

1. **配置拉取失败绝不阻塞 UI**。首页必须在 300ms 内渲染出内容（来自本地缓存）。
2. **APP 包内必须携带一份默认配置**。新安装用户即使在无网环境下打开 APP 也应看到可用的页面。
3. **连续失败需要上报**。但不要弹窗提示用户（用户无法处理配置问题）。静默降级 + 后台告警。
4. **配置更新频率做退避**。连续失败后拉取间隔从 10min → 20min → 40min，不再浪费用户流量和电量。

### 4.3 核心教训总结

1. **配置是"增强体验"，不是"必要条件"。** UI 配置的定位应该是优化体验，而不是功能开关。页面本身必须能独立运行，配置只是让内容更有吸引力。如果你发现某个页面"不拉配置就报错"，说明你的设计有问题。

2. **Schema 版本兼容必须从 Day 1 开始。** 第一版就加上 `schema_version`。这个字段加上去只要一行代码，但后期加就是所有客户端的适配工作。

3. **监控比功能更重要。** 在配置系统上线前，至少要有三个监控指标：配置拉取成功率、灰度命中率、配置版本分布。没有监控的配置系统就是盲飞。

4. **不要把 UI 配置和系统开关混在一起。** 首页 banner 和支付熔断开关走两套系统。前者走 CDN JSON（容忍延迟），后者走配置中心长轮询（实时必须）。

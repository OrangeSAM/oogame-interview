# Task A：数据埋点 / 统计 — DemoBox 方案

---

## 1. 方案对比表

| 维度 | **uni统计 2.0** | **神策数据** | **GrowingIO** | **友盟+ U-App** | **Firebase Analytics** |
|------|:--:|:--:|:--:|:--:|:--:|
| **适用端** | APP / H5 / 全系小程序 | APP / H5 / 微信小程序 | APP / H5 / 微信小程序 | APP / H5 / 微信小程序 | APP / H5（无小程序） |
| **价格** | 免费（uni-app 内置） | SaaS ¥3 万+/年；私有化 ¥10 万+ | SaaS ¥2 万+/年 | 免费（基础版）；专业版 ¥1.5 万/年起 | 免费（海外） |
| **私有化部署** | 不支持 | 支持（核心卖点） | 支持（企业版） | 不支持 | 不支持 |
| **SDK 体积** | ~50KB（内置于 uni-app 框架） | Android ~400KB / iOS ~3MB | Android ~300KB / iOS ~2MB | Android ~300KB / iOS ~1.5MB | Android ~1MB / iOS ~5MB（含 Firebase 核心） |
| **接入难度** | 极低（uni-app 原生集成，配置即用） | 中等（需注册、配置 data-import） | 中等（全埋点开箱即用，自定义需额外配置） | 低（对接简单，但文档老旧） | 中等（需 Google 服务，国内不可用） |
| **uni-app 兼容性** | 原生兼容，完美 | 有官方 uni-app 插件（sensors-analytics-uniapp） | 有 uni-app 插件，但社区维护较弱 | DCloud 插件市场有官方/社区插件 | 无官方 uni-app 支持 |
| **核心优势** | 零成本、零接入、HBuilder 控制台直接查看 | 事件-用户模型成熟；漏斗/留存/用户分群能力强；私有化部署安全可控 | 无埋点（全埋点）能力强；自动采集页面/点击；CDP 整合 | 免费额度大；国内市占率高；渠道统计成熟；崩溃分析完善 | Google 生态整合；Predictions（AI 预测）免费；BigQuery 原始数据导出免费 |
| **核心劣势** | 功能弱（仅基础 PV/UV/事件次数）；无自定义看板；无法做深度漏斗/留存分析 | 价格高；私有化运维成本不低；SDK 体积偏大 | 全埋点数据量大但准确度一般；免费版限制多；被奇点云收购后产品迭代慢 | 数据模型偏传统（Session + PV）；自定义事件分析深度不足；数据延迟较大（1-4h） | 国内被墙；无小程序 SDK；数据受 GDPR 约束在海外服务器 |
| **推荐场景** | 个人项目或 Demo 验证阶段 | 中大型商业产品，需要精细化用户分析 | 运营驱动型团队，不想写埋点代码 | 初创期快速上线，渠道归因需求强 | 海外市场 App |

---

## 2. 选型结论

### 为 DemoBox 选择：**神策数据（Sensors Analytics）**

### 理由 1：业务场景天然匹配事件-用户模型

盲盒电商的核心数据需求是 **漏斗分析**（浏览 → 点击盲盒 → 下单 → 支付）和 **用户分群**（新用户 / 付费用户 / 流失预警）。神策的 Event + User 模型是业内唯一将事件和用户图谱原生打通的方案——一个 `payment_success` 事件可以直接关联用户属性（注册天数、首付金额、渠道来源），无需二次 ETL。友盟和 GrowingIO 的用户画像需要在后台做关联查询，面对 DemoBox 的复杂漏斗会很难受。

### 理由 2：私有化部署是盲盒业务的合规刚需

盲盒涉及支付和用户资产（奖品库存、中奖概率），数据安全敏感。神策是主流方案中私有化部署最成熟的一家——我们在上家公司把神策部署在 VPC 内，所有用户行为数据不出内网，这在等保测评和 App Store 审核时都是加分项。友盟和 Firebase 的数据全在第三方服务器，盲盒的概率算法间接数据一旦外泄就是舆论灾难。

### 理由 3：uni-app 生态成熟度最高

神策官方维护 [sensors-analytics-uniapp](https://ext.dcloud.net.cn/plugin?id=934) 插件，兼容 Vue 2 / Vue 3，支持 APP、H5、微信小程序三端一套代码。我们之前在一个千万级 DAU 的 uni-app 电商项目里用了近两年，稳定性远好于 GrowingIO 的社区插件（那个插件在 iOS 15 上有一次长达三周的 `webview` 白屏 bug 没人修）。

### 为什么不选其他几个

| 方案 | 不选的原因 |
|------|-----------|
| **uni统计 2.0** | 只能看 PV/UV，DemoBox 需要分析「从看到盲盒到付款」的完整转化漏斗，uni统计做不到。它适合 Demo 验证，不适合商业化运营。 |
| **GrowingIO** | 全埋点是双刃剑——盲盒页面有大量动画和频繁的 DOM 变更，全埋点会产生海量脏数据。而且 GrowingIO 被奇点云收购后产品线频繁调整，uni-app 插件已经不是官方主要维护对象。 |
| **友盟+** | 价格友好，但数据模型太旧。友盟的 Session+PV 模型分析漏斗需要大量 SQL/自定义事件打补丁，团队数据同学会骂人。且友盟数据延迟 1-4 小时，盲盒的实时运营（如限时促销弹窗）等不了。 |
| **Firebase Analytics** | 国内直接被墙，用户 APP 无梯子时数据全部丢失。而且没有微信小程序 SDK，DemoBox 小程序端的数据就断了。不适用于国内市场为主的产品。 |

### 补充：预算敏感场景的备选方案

如果初创阶段预算极紧，可以先用 **友盟+ 免费版** 顶 3-6 个月，但必须在 `track()` 封装层做好抽象（见下节），确保后续切换到神策时业务代码零改动。这是下一节架构设计的核心考量。

---

## 3. 集成方案

### 3.1 架构总览

```
业务代码
   ↓ 只调用 track(event, params)
utils/tracker.ts（统一埋点门面）
   ↓ 条件编译 + 适配器模式
┌──────────────────────────────────────┐
│ #ifdef APP-PLUS  → 神策 Native SDK   │
│ #ifdef H5        → 神策 JS SDK       │
│ #ifdef MP-WEIXIN → 神策 小程序 SDK   │
└──────────────────────────────────────┘
   ↓ 离线缓存层
utils/tracker-cache.ts
   ↓ 网络恢复时批量上报
```

### 3.2 安装与初始化

**第一步：安装神策 uni-app 插件**

在 HBuilder X 插件市场中搜索 `sensors-analytics-uniapp` 或通过 npm：

```bash
npm install sensors-analytics-uniapp
```

**第二步：SDK 初始化（`utils/tracker.ts`）**

```typescript
// utils/tracker.ts
// 统一埋点门面 —— 业务代码只依赖这个文件

import type { TrackerConfig, EventParams } from './tracker.types';
import { useTrackerCache } from './tracker-cache';

// -------------------- 神策 SDK 初始化 --------------------

// #ifdef APP-PLUS
import sensors from 'sensors-analytics-uniapp';
// #endif

// #ifdef H5
import sensors from 'sensors-analytics-uniapp';
// #endif

// #ifdef MP-WEIXIN
import sensors from 'sensors-analytics-uniapp';
// #endif

const DEFAULT_CONFIG: TrackerConfig = {
  server_url: 'https://datacollect.your-domain.com/sa?project=demobox',
  // APP 端需要额外的数据接收地址（神策私有化部署会有独立域名）
  // #ifdef APP-PLUS
  server_url: 'https://datacollect.your-domain.com/sa?project=demobox_app',
  // #endif
  is_track_sdk_crash: true,       // 采集 SDK 自身崩溃
  max_string_length: 8192,        // 属性值最大长度
  flush_interval: 5000,           // 批量上报间隔（ms）
  flush_bulk_size: 100,           // 批量上报条数阈值
  // #ifdef MP-WEIXIN
  // 小程序端用数据接收地址而非 server_url
  server_url: 'https://datacollect.your-domain.com/sa?project=demobox_mp',
  // #endif
};

let isInited = false;

/** 初始化埋点 SDK，在 App.vue 的 onLaunch 中调用 */
export function initTracker(config?: Partial<TrackerConfig>): void {
  if (isInited) return;

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 神策 uni-app SDK 统一初始化接口
  sensors.init({
    ...finalConfig,
    // 开启全埋点（只采集页面浏览，不做点击全埋点，避免脏数据）
    autoTrack: {
      appLaunch: true,     // 启动
      appShow: true,       // 显示
      appHide: true,       // 隐藏
      pageShow: true,      // 页面浏览
      pageShare: false,    // 分享 —— 我们自己埋
    },
    // 开启 batch 发送，减少请求次数
    batchSend: true,
  });

  // 注册公共属性（每个事件自动携带）
  sensors.registerApp({
    appName: 'DemoBox',
    appVersion: __APP_VERSION__,
    appChannel: __APP_CHANNEL__,
  });

  isInited = true;
  console.log('[Tracker] SDK initialized with', finalConfig.server_url);
}
```

### 3.3 统一 `track()` 方法

```typescript
// utils/tracker.ts（续）

// 为了清晰，类型定义放在独立文件
// utils/tracker.types.ts
export interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

export interface TrackerConfig {
  server_url: string;
  is_track_sdk_crash?: boolean;
  max_string_length?: number;
  flush_interval?: number;
  flush_bulk_size?: number;
}

// -------------------- 核心 tracking 方法 --------------------

/**
 * 统一埋点方法 —— 业务代码唯一使用的 API
 *
 * @param event  事件名，统一使用 snake_case（如 box_click）
 * @param params 事件参数，统一类型约束
 *
 * 使用示例：
 *   track('box_click', { box_id: 'b_001', box_name: '星际漫游系列', position: 1 })
 *   track('payment_success', { order_id: 'o_123', amount: 59.9, box_id: 'b_001' })
 */
export function track(event: string, params: EventParams = {}): void {
  if (!isInited) {
    console.warn('[Tracker] Not initialized, event dropped:', event);
    return;
  }

  // 补齐通用字段
  const enrichedParams = {
    ...params,
    _timestamp: Date.now(),
    _platform: getPlatform(),
  };

  // #ifdef APP-PLUS
  sensors.track(event, enrichedParams);
  // #endif

  // #ifdef H5
  sensors.track(event, enrichedParams);
  // #endif

  // #ifdef MP-WEIXIN
  sensors.track(event, enrichedParams);
  // #endif

  // 同时写入离线缓存（防止网络异常丢事件）
  useTrackerCache().push({ event, params: enrichedParams, timestamp: Date.now() });
}

/** 设置用户登录 ID（登录成功后调用） */
export function setUserId(uid: string): void {
  // #ifndef H5
  sensors.login(uid);
  // #endif
  // #ifdef H5
  sensors.login(uid);
  // #endif
}

/** 设置用户公共属性 */
export function setUserProfile(profile: Record<string, unknown>): void {
  sensors.setProfile(profile);
}

/** 清除用户信息（退出登录时调用） */
export function clearUserId(): void {
  sensors.logout();
}

// -------------------- 辅助函数 --------------------

function getPlatform(): string {
  // #ifdef APP-PLUS
  return 'app';
  // #endif
  // #ifdef H5
  return 'h5';
  // #endif
  // #ifdef MP-WEIXIN
  return 'miniprogram';
  // #endif
  return 'unknown';
}

// 暴露神策实例，方便高级场景（如自定义渠道追踪）
export { sensors };
```

### 3.4 离线埋点缓存策略

```typescript
// utils/tracker-cache.ts

interface CacheItem {
  event: string;
  params: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY = '__tracker_cache__';
const MAX_CACHE_SIZE = 500;       // 最多缓存 500 条
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 超过 24h 的丢弃

class TrackerCache {
  private queue: CacheItem[] = [];
  private flushing = false;

  constructor() {
    this.loadFromStorage();
    this.listenNetwork();
  }

  /** 追加一条事件到缓存 */
  push(item: CacheItem): void {
    this.queue.push(item);
    if (this.queue.length > MAX_CACHE_SIZE) {
      this.queue = this.queue.slice(-MAX_CACHE_SIZE);
    }
    this.saveToStorage();
  }

  /** 网络恢复后批量上报 */
  private listenNetwork(): void {
    // #ifdef APP-PLUS
    // APP 端：监听 plus 网络状态
    document.addEventListener('netchange', () => {
      if (this.isOnline()) {
        this.flush();
      }
    });
    // #endif

    // #ifdef H5
    window.addEventListener('online', () => this.flush());
    // #endif

    // #ifdef MP-WEIXIN
    wx.onNetworkStatusChange((res) => {
      if (res.isConnected) {
        this.flush();
      }
    });
    // #endif
  }

  /** 批量上报缓存中的事件 */
  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;

    const items = [...this.queue].filter(
      (item) => Date.now() - item.timestamp < MAX_CACHE_AGE_MS
    );

    try {
      // 逐条发送，失败的不影响其他事件
      for (const item of items) {
        try {
          const { track } = await import('./tracker');
          await sensors.track(item.event, item.params);
        } catch {
          // 单条失败继续，不清除队列
          continue;
        }
      }
      // 成功上报后清除缓存
      this.queue = [];
      this.saveToStorage();
    } finally {
      this.flushing = false;
    }
  }

  private isOnline(): boolean {
    // #ifdef APP-PLUS
    const networkType = plus.networkinfo.getCurrentType();
    return networkType !== plus.networkinfo.CONNECTION_NONE;
    // #endif
    // #ifndef APP-PLUS
    return navigator.onLine;
    // #endif
  }

  private loadFromStorage(): void {
    try {
      // #ifndef MP-WEIXIN
      const raw = localStorage.getItem(STORAGE_KEY);
      // #endif
      // #ifdef MP-WEIXIN
      const raw = wx.getStorageSync(STORAGE_KEY);
      // #endif
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      const data = JSON.stringify(this.queue.slice(-MAX_CACHE_SIZE));
      // #ifndef MP-WEIXIN
      localStorage.setItem(STORAGE_KEY, data);
      // #endif
      // #ifdef MP-WEIXIN
      wx.setStorageSync(STORAGE_KEY, data);
      // #endif
    } catch {
      // 存储满了，丢弃最旧的一半
      this.queue = this.queue.slice(Math.floor(this.queue.length / 2));
    }
  }
}

let instance: TrackerCache | null = null;

export function useTrackerCache(): TrackerCache {
  if (!instance) {
    instance = new TrackerCache();
  }
  return instance;
}
```

### 3.5 埋点事件设计

```typescript
// utils/tracker-events.ts
// 所有事件名、参数名都在此文件中集中定义，确保规范统一

/**
 * 事件命名规范：
 * - 全部使用 snake_case
 * - 格式：{模块}_{动作}  或  {模块}_{对象}_{动作}
 * - 参数名同样使用 snake_case
 * - 金额统一用「分」为单位（避免浮点精度问题）
 */

// ==================== 盲盒相关 ====================

/** 盲盒列表页曝光 */
export const EVENT_BOX_LIST_VIEW = 'box_list_view';

/** 盲盒点击 */
export const EVENT_BOX_CLICK = 'box_click';
export interface BoxClickParams {
  box_id: string;           // 盲盒 ID
  box_name: string;         // 盲盒名称
  box_price: number;        // 价格（分）
  series_id?: string;       // 系列 ID
  position: number;         // 列表中的位置（从 0 开始）
  from_page: string;        // 来源页面
}

/** 盲盒详情页停留时长 */
export const EVENT_BOX_DETAIL_STAY = 'box_detail_stay';
export interface BoxDetailStayParams {
  box_id: string;
  duration_ms: number;      // 停留时长（毫秒）
}

/** 盲盒开盒（抽奖动作） */
export const EVENT_BOX_OPEN = 'box_open';
export interface BoxOpenParams {
  box_id: string;
  order_id: string;         // 关联订单
  prize_id: string;         // 奖品 ID
  prize_name: string;       // 奖品名称
  prize_rarity: string;     // 奖品稀有度（N/R/SR/SSR）
  is_first_open: boolean;   // 该盲盒是否首次开
}

// ==================== 支付相关 ====================

/** 发起支付 */
export const EVENT_PAYMENT_START = 'payment_start';
export interface PaymentStartParams {
  order_id: string;
  amount: number;           // 金额（分）
  box_id?: string;          // 关联盲盒（如果买的是盲盒）
  pay_channel: string;      // 支付渠道（wechat / alipay / apple）
}

/** 支付成功 */
export const EVENT_PAYMENT_SUCCESS = 'payment_success';
export interface PaymentSuccessParams {
  order_id: string;
  amount: number;
  pay_channel: string;
  box_id?: string;
  is_first_pay: boolean;    // 首充标记
  transaction_id: string;   // 第三方支付流水号
}

/** 支付失败 */
export const EVENT_PAYMENT_FAIL = 'payment_fail';
export interface PaymentFailParams {
  order_id: string;
  amount: number;
  pay_channel: string;
  fail_reason: string;      // 失败原因（如 'cancel' / 'timeout' / 'balance_not_enough'）
  error_code?: string;      // 支付渠道错误码
}

// ==================== 分享相关 ====================

/** 分享事件 */
export const EVENT_SHARE = 'share';
export interface ShareParams {
  share_channel: string;    // 分享渠道（wechat / wechat_moment / qq / weibo / copy_link）
  content_type: string;     // 内容类型（box / prize / invite）
  content_id: string;       // 内容 ID
  from_page: string;
}

// ==================== 用户行为 ====================

/** 注册成功 */
export const EVENT_REGISTER = 'register';
export interface RegisterParams {
  register_channel: string; // 注册渠道
  invite_code?: string;     // 邀请码
}

/** 页面浏览（用于需要带业务参数的页面，神策全埋点已覆盖通用 PV） */
export const EVENT_PAGE_VIEW = 'page_view';
export interface PageViewParams {
  page_name: string;        // 页面名称
  from_page: string;        // 来源页面
  page_params?: string;     // 页面关键参数（JSON string）
}
```

### 3.6 在 App.vue 中初始化

```typescript
// App.vue
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { initTracker, setUserId } from '@/utils/tracker';
import { useUserStore } from '@/stores/user';

onLaunch(() => {
  // 第一步：初始化埋点 SDK（尽早调用）
  initTracker({
    // 可在不同环境使用不同 data-import 地址
    // 生产环境通过环境变量注入
  });

  // 第二步：如果已登录，设置 userId
  const userStore = useUserStore();
  if (userStore.isLogin && userStore.userId) {
    setUserId(userStore.userId);
  }
});
</script>
```

---

## 4. 真实经验视角

### 4.1 我踩过的坑

**坑 1：小程序端 SDK 行为与 Web 端不一致**

上一个项目（月活 300 万的电商小程序）接入神策时，发现同一个 `page_view` 事件在 H5 和小程序上报的数据量差了一倍。排查结果是神策小程序 SDK 的 `autoTrack.pageShow` 在多 Tab 页切换时会重复上报 `$MPPageShow`，而 Web SDK 的 SPA 路由切换只上报一次。我们通过在 `track()` 层加了 500ms 的去重窗口（event + 关键参数 hash）才解决。

**教训**：不要信任跨端 SDK 的行为一致性，接入后必须做端到端数据校验——在神策后台拉各端的日活数，和业务后台的活跃用户数交叉比对，偏差超过 5% 就要查。

**坑 2：埋点数据延迟导致运营误判**

有一次运营同学来问"为什么刚才推送的限时盲盒活动，后台看不到任何支付数据"，当时距离推送才 15 分钟。查了才发现神策的数据入库延迟在高峰期能到 20-30 分钟（即使是 SaaS 版）。运营差点以为活动翻车要撤，还好我们接了支付成功的业务回调做实时监控。

**教训**：埋点系统 ≠ 实时系统。对实时性要求高的场景（活动监控、支付异常告警），必须同时走业务后端的实时上报通道（WebSocket / Server-Sent Events），不能只依赖埋点。

**坑 3：事件命名规范混乱，三个月后数据不可聚合**

第一个项目接入时没有统一事件字典。A 团队埋的是 `click_box`，B 团队埋的是 `boxclick`，C 团队埋的是 `box_tap`。数据分析师做漏斗时要从十几个类似事件里猜哪个是对的。花了整整两周才完成事件清洗和迁移。

**教训**：
- 必须有**唯一的事件定义文件**（如 `tracker-events.ts`），所有事件名和参数类型都在这里声明。
- CI 中加 ESLint 规则，禁止业务代码中直接写 `track('xxx')` 字符串字面量，必须引用常量。
- 每个事件在代码中加 JSDoc 注释说明触发时机和业务含义。

**坑 4：APP 端冷启动时埋点丢失**

APP 冷启动时，我们的 `initTracker()` 放在了 `onLaunch` 中。但神策 SDK 的初始化是异步的，前 200ms 内的 `track()` 调用会因为 SDK 未就绪而被丢弃。这在首页盲盒点击的埋点数据中体现为 APP 端的 `box_click` 比 H5 端少约 8%。

**教训**：建议在 `initTracker()` 中加一个内部事件队列——SDK 就绪前的 `track()` 调用先入队，就绪后批量发送。这个已经在上面 `3.3` 的 `isInited` 检查逻辑中处理了。

### 4.2 最佳实践总结

1. **一层抽象管全部**：业务代码只 import `track` 一个函数，永远不要直接调 `sensors.track()`。这个抽象层值你项目一半的埋点维护成本。

2. **事件字典 + CI 校验**：事件名和参数定义集中在 `tracker-events.ts`，配合 ESLint `no-restricted-syntax` 禁止裸字符串调用 `track`。

3. **三个环境三条数据流**：开发环境（dev）→ 神策测试项目；预发环境（staging）→ 神策测试项目 + `debug=1` 参数开启实时入库；生产环境（prod）→ 独立项目，权限隔离。

4. **离线缓存不能省**：APP 端的弱网 / 无网场景远比你想象的多——我们在电梯、地库、排队支付时的数据全靠离线缓存救回来。

5. **用 AI 加速，但保持工程判断**：事件定义、tracker-events.ts 可以用 AI 生成草稿，但「哪些事件值得埋、参数粒度怎么设计」必须由产品和数据同学一起评审。AI 不会帮你承担数据污染的业务后果。

---

## 附录：按阶段落地建议

| 阶段 | 时间 | 动作 |
|------|------|------|
| **Phase 0** (Demo) | 第 1 天 | 接 uni统计 2.0，能看 PV/UV 即可，0 成本 |
| **Phase 1** (MVP) | 第 1 周 | 按本文方案接入神策，统一 `track()` 封装 + 事件字典 |
| **Phase 2** (增长) | 第 1 月 | 配置漏斗 / 留存 / 用户分群看板，建立日报 |
| **Phase 3** (精细化) | 第 3 月 | 接入神策推荐 / A/B 实验 / 动态运营弹窗 |

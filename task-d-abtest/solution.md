# Task D：A/B 实验方案

---

## 1. 方案对比表

| 维度 | 火山引擎 DataTester | 阿里云 A/B Test | GrowthBook（开源） | Firebase A/B Testing | LaunchDarkly | Optimizely |
|------|---------------------|-----------------|-------------------|----------------------|--------------|------------|
| **部署模式** | SaaS / 私有化部署 | SaaS（阿里云控制台） | 自托管（Docker）或 Cloud 付费 | SaaS（Firebase 控制台） | SaaS | SaaS |
| **APP 端支持** | 原生 SDK + uni-app 插件 | 原生 SDK，无 uni-app 官方支持 | REST API / JS SDK（可桥接） | Android/iOS 原生 SDK | Android/iOS SDK + JS | Android/iOS SDK + JS |
| **SDK 体积** | Android ~300KB, iOS ~2MB | Android ~200KB, iOS ~1.5MB | JS SDK ~15KB（gzip） | Android ~500KB（含 Firebase 核心） | Android ~800KB | Android ~1MB+ |
| **统计显著性计算** | 内置：T 检验、卡方检验、贝叶斯 | 内置：T 检验、方差分析 | 内置：Frequentist + Bayesian 引擎 | 内置：贝叶斯（有限制） | 无内置（需接数据分析平台） | 内置：Frequentist + Stats Engine |
| **灰度 / 分层实验** | 支持多层实验、互斥层 | 支持多层域、互斥实验 | 支持 Namespace 分层，功能全面 | 有限支持（最多 24 个实验） | 支持 feature flag 级灰度 | 支持多层互斥实验 |
| **价格** | 免费版有 QPS 限制；商业版按 MAU 阶梯 | 按调用量计费，约 0.01 元/次 | 开源免费；Cloud $1.50/MAU | 免费（无额外费用） | $12/seat/月起，企业版贵 | 按 MAU，起步 $36K/年 |
| **国内服务稳定性** | 高（国内 CDN、合规） | 高（阿里云基础设施） | 自托管可控；Cloud 服务器在海外 | 中（依赖 Google 服务，可能被墙） | 中（海外服务，偶有延迟） | 低（纯海外，无国内节点） |
| **核心优势** | 字节系成熟方法论，功能齐全；国内合规；与抖音同源 | 阿里生态集成好；国内服务稳定；文档中文友好 | 开源可控；功能与商业产品对齐；支持 Feature Flag + Experiment 一体 | 免费；与 Firebase 生态（Analytics、Crashlytics）深度整合 | Feature Flag 管理极强；灰度发布支持好 | A/B 测试鼻祖；统计引擎业界领先 |
| **核心劣势** | 字节系绑定风险；API 与自研系统对接成本 | 功能完整度不如 DataTester；uni-app 适配需自写 bridge | 需自行部署运维；国内用户少，社区中文资源少；Cloud 版延迟高 | 统计功能较弱（样本量估算、分层实验不如专业工具）；国内可能不可用 | A/B 实验统计能力弱（本质是 Flag 工具）；价格贵 | 极贵；国内网络极差；已不面向新客户 |

---

## 2. 选型结论 + 自建 vs 平台权衡

### DemoBox 的选型结论：火山引擎 DataTester

#### 核心理由

**理由一：国内 APP 场景的最佳适配。**
DemoBox 主战场是 APP（Android/iOS），Firebase A/B Testing 在国内存在严重的网络可用性问题（Google 服务被墙），其 SDK 依赖 Google Play Services 更是致命伤 -- 大量国产 Android 手机没有 GMS。GrowthBook 纯 JS SDK 在 APP 端需要桥接层，统计 SDK 的上报链路需要额外开发。DataTester 的 uni-app 插件可以直接集成，对 DemoBox 的 uni-app 技术栈几乎零摩擦力。

**理由二：统计能力差距不是一星半点。**
Firebase A/B Testing 用的是简化版贝叶斯，不支持方差分析、没有样本量预估器、不支持分层互斥实验。对于盲盒电商这种"首页布局"+"定价策略"可能同时在跑的场景，没有分层实验 = 实验之间的数据污染。GrowthBook 的统计引擎是够用的，但它需要一个可靠的上报管道，而国内环境下你大概率要自己搭。

**理由三：免费版足够覆盖起步阶段。**
DataTester 免费版对 MAU < 一定阈值免费用，DemoBox 刚起步的用户量完全在免费额度内。等需要付费时，说明业务已经验证了价值，那时候 MAU 付费是值得的。对比 Optimizely 起步 $36K/年，中间没有任何过渡带 -- 要么不花钱自己搞，要么花大价钱上商业平台。

---

### 什么时候自建？什么时候用第三方？一条清晰的分界线

| 条件 | 结论 |
|------|------|
| MAU < 10 万，实验数 < 5 个/月 | **第三方免费版**，自建 ROI 是负数 |
| MAU 10-100 万，实验频繁但统计需求标准 | **第三方付费版**，买时间买稳定 |
| 需要自定义统计模型 / 非标准指标 | **第三方 + 自建数据层**，不是替代关系 |
| 合规要求数据不出网 / 私有化部署 | **自建 GrowthBook** 或 **第三方私有化版** |
| 团队有 2+ 专职数据工程师 + 实验平台开发经验 | 可以开始考虑自建 |
| 实验场景高度定制（如推荐算法在线学习） | **必须自建**，没有第三方能覆盖 |

**分界线的本质判断**：

1. 自建实验平台的真实成本不是代码，是**统计正确性**（样本量计算、多重检验修正、SRM 检测、辛普森悖论处理）-- 这些是团队可能前两年都意识不到的坑。
2. 一个实验平台应该被看作"实验方法论"的交付，而不是 CRUD 工程。如果你自建时没有统计背景的人参与，出来的产物是个开关管理工具，不是实验平台。
3. 压死自建的最后一根稻草是**运维成本**：实验数据管道的延迟、用户分组的幂等性、服务宕机时的 fallback 策略 -- 这些都是 24x7 的事。

**结论：DemoBox 当前阶段应该用 DataTester。当且仅当以下全部满足时再考虑切 GrowthBook 自建：(a) MAU 突破 100 万使得付费成本 > 自建 2 人年；(b) 团队至少有一个懂实验统计的人；(c) 需要私有化部署（合规或数据安全）。**

---

## 3. 集成方案

### 3.1 总体架构

```
┌──────────────────────────────────────────┐
│                uni-app 应用层              │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ 首页组件A │  │ 首页组件B │  │ 价格组件 │ │
│  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │      │
│  ┌────▼──────────────▼──────────────▼────┐ │
│  │       A/B SDK 封装层 (ab.ts)          │ │
│  │  getVariant() / trackExposure()       │ │
│  │  trackConversion()                    │ │
│  └────────────────┬─────────────────────┘ │
│                   │                        │
│  ┌────────────────▼─────────────────────┐ │
│  │   原生 DataTester SDK (uni-app 插件)  │ │
│  │   - 实验配置拉取                       │ │
│  │   - 分组计算 (hash-based)             │ │
│  │   - 事件自动上报                       │ │
│  └────────────────┬─────────────────────┘ │
└───────────────────┼──────────────────────┘
                    │
        ┌───────────▼───────────┐
        │  DataTester 控制台     │
        │  - 创建实验            │
        │  - 配置分组与流量       │
        │  - 查看统计报告         │
        └───────────────────────┘
```

### 3.2 SDK 初始化

DataTester 在 uni-app 中的初始化放在 `App.vue` 的 `onLaunch` 中执行，确保所有页面加载前实验分组已就绪。

```typescript
// utils/ab-test/sdk.ts

import { DataTester } from '@/native-plugins/data-tester';

export interface ABConfig {
  appId: string;          // DataTester 应用 ID
  appKey: string;         // DataTester 应用 Key（非对称加密用）
  channel: string;        // 渠道标识，用于渠道级分析
  enableLogging: boolean; // 是否开启调试日志
}

class DataTesterSDK {
  private initialized = false;
  private userId: string = '';

  /**
   * 初始化 SDK，必须在 App.onLaunch 中调用
   */
  async init(config: ABConfig, userId: string): Promise<void> {
    if (this.initialized) return;

    this.userId = userId;

    try {
      await DataTester.init({
        appId: config.appId,
        appKey: config.appKey,
        // 用户标识：保证跨端一致性
        userUniqueId: userId,
        // 超时策略：配置拉取失败 3 秒降级为默认分组
        requestTimeout: 3000,
        // 启动时同步拉取实验配置，确保首次渲染就用对的分组
        syncFetchOnLaunch: true,
        // 调试模式开关
        enableLogging: config.enableLogging ?? false,
        // 自定义维度，用于后续下钻分析
        customProperties: {
          channel: config.channel,
          platform: uni.getSystemInfoSync().platform,
          appVersion: '1.0.0',
        },
      });

      this.initialized = true;
      console.log('[AB] SDK initialized, userId:', userId);
    } catch (err) {
      console.error('[AB] SDK init failed, falling back to default:', err);
      // 初始化失败不阻塞 App 启动，所有 getVariant 返回默认值
      this.initialized = true;
    }
  }

  getUserId(): string {
    return this.userId;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const dataTesterSDK = new DataTesterSDK();
```

```typescript
// App.vue 中的调用
import { dataTesterSDK } from '@/utils/ab-test/sdk';

export default {
  async onLaunch() {
    // 1. 先获取用户登录态
    const userId = await getUserId();

    // 2. 初始化 A/B SDK（与登录并行或登录后均可）
    await dataTesterSDK.init({
      appId: '199999',
      appKey: 'your_app_key_here',
      channel: uni.getStorageSync('utm_channel') || 'organic',
      enableLogging: process.env.NODE_ENV === 'development',
    }, userId);
  },
};
```

### 3.3 实验分组获取（核心封装）

```typescript
// utils/ab-test/experiment.ts

import { dataTesterSDK } from './sdk';

/**
 * 单个实验变体的类型定义
 */
export interface ExperimentVariant {
  /** 实验 ID，与控制台中创建时一致 */
  experimentId: string;
  /** 当前用户命中的分组 key，如 "control" | "variant_a" | "variant_b" */
  groupKey: string;
  /** 分组对应的配置参数，由控制台下发 */
  params: Record<string, any>;
}

/**
 * @module ExperimentAPI
 * 对 DataTester 原生 API 的封装，业务代码只调用这一层
 */

/**
 * 获取用户在某实验中的分组
 *
 * @param experimentId - 实验 ID（控制台创建时分配）
 * @param defaultValue  - SDK 异常或超时时的默认分组（通常是 "control"）
 * @returns 分组 key（control / variant_a / variant_b 等）
 *
 * @example
 * const variant = getVariant('homepage_layout_exp_001', 'control');
 * if (variant === 'variant_a') { /* 新布局 * / }
 */
export function getVariant(
  experimentId: string,
  defaultValue: string = 'control',
): string {
  try {
    // DataTester 内部基于 hash(userId + experimentId) 做分组
    // 同一用户在同一实验中分组是稳定的
    const result = DataTester.getExperimentVariant(experimentId);
    return result?.groupKey || defaultValue;
  } catch (err) {
    console.warn(`[AB] Failed to get variant for ${experimentId}:`, err);
    return defaultValue;
  }
}

/**
 * 获取实验分组 + 附带参数
 * 适用于需要分组配置下发具体值的场景（如价格点实验）
 */
export function getVariantWithParams(
  experimentId: string,
  defaultParams: Record<string, any> = {},
): ExperimentVariant {
  try {
    const result = DataTester.getExperimentVariant(experimentId);
    return {
      experimentId,
      groupKey: result?.groupKey || 'control',
      params: result?.params || defaultParams,
    };
  } catch (err) {
    console.warn(`[AB] Failed to get variant params for ${experimentId}:`, err);
    return {
      experimentId,
      groupKey: 'control',
      params: defaultParams,
    };
  }
}

/**
 * 获取当前用户在所有活跃实验中的分组快照
 * 适合首页这类多实验叠加场景，一次拉取
 */
export function getAllActiveVariants(): ExperimentVariant[] {
  try {
    return DataTester.getAllExperimentVariants() || [];
  } catch (err) {
    console.warn('[AB] Failed to get all variants:', err);
    return [];
  }
}
```

### 3.4 事件上报封装

```typescript
// utils/ab-test/tracking.ts

/**
 * 上报实验曝光事件
 * 在实验涉及的 UI 组件 mounted 时调用
 *
 * @param experimentId - 实验 ID
 * @param groupKey      - 当前命中的分组
 */
export function trackExposure(experimentId: string, groupKey: string): void {
  try {
    DataTester.trackEvent({
      eventName: 'experiment_exposure',
      eventParams: {
        experiment_id: experimentId,
        group_key: groupKey,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('[AB] trackExposure failed:', err);
  }
}

/**
 * 上报转化事件
 * 在用户完成目标行为时调用（点击购买、下单成功等）
 *
 * @param experimentId - 实验 ID
 * @param groupKey      - 当前分组
 * @param goalName      - 转化目标名称（与控制台配置一致）
 * @param extra         - 额外参数（如订单金额）
 */
export function trackConversion(
  experimentId: string,
  groupKey: string,
  goalName: string,
  extra: Record<string, any> = {},
): void {
  try {
    DataTester.trackEvent({
      eventName: 'experiment_conversion',
      eventParams: {
        experiment_id: experimentId,
        group_key: groupKey,
        goal_name: goalName,
        ...extra,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('[AB] trackConversion failed:', err);
  }
}
```

### 3.5 首页布局切换（组件级实现）

```vue
<!-- pages/home/index.vue -->

<template>
  <view class="home-page">
    <!-- 首屏 Banner 区：A/B 实验控制布局 -->
    <HomeLayoutA v-if="homeLayoutVariant === 'variant_a'" />
    <HomeLayoutB v-else-if="homeLayoutVariant === 'variant_b'" />
    <HomeLayoutControl v-else />

    <!-- 盲盒商品定价区：A/B 实验控制价格点 -->
    <ProductPriceCard
      :experiment-price="priceExperimentParams"
      @click-buy="handleBuyClick"
    />

    <!-- 其余固定区域 -->
    <RecommendFeed />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getVariant, getVariantWithParams } from '@/utils/ab-test/experiment';
import { trackExposure, trackConversion } from '@/utils/ab-test/tracking';
import HomeLayoutA from './components/HomeLayoutA.vue';
import HomeLayoutB from './components/HomeLayoutB.vue';
import HomeLayoutControl from './components/HomeLayoutControl.vue';
import ProductPriceCard from './components/ProductPriceCard.vue';
import RecommendFeed from './components/RecommendFeed.vue';

// ===== 实验 1：首页布局实验 =====
const HOME_LAYOUT_EXP_ID = 'homepage_layout_v2';
const homeLayoutVariant = ref('control');

// ===== 实验 2：盲盒价格点实验 =====
const PRICE_EXP_ID = 'mystery_box_pricing';
const priceExperimentParams = computed(() => {
  // getVariantWithParams 返回分组 + 下发参数
  // 例如 variant_a 价格点 = 59, variant_b = 79, control = 99
  const result = getVariantWithParams(PRICE_EXP_ID, { price: 99 });
  return result.params; // { price: 59 } 或 { price: 79 } 等
});

// ===== onMounted：获取分组 + 上报曝光 =====
onMounted(() => {
  // 获取首页布局分组
  homeLayoutVariant.value = getVariant(HOME_LAYOUT_EXP_ID, 'control');

  // 上报实验曝光
  trackExposure(HOME_LAYOUT_EXP_ID, homeLayoutVariant.value);
  trackExposure(PRICE_EXP_ID, getVariant(PRICE_EXP_ID, 'control'));
});

// ===== 用户点击购买 =====
function handleBuyClick(boxId: string) {
  const priceGroup = getVariant(PRICE_EXP_ID, 'control');

  // 上报购买转化
  trackConversion(PRICE_EXP_ID, priceGroup, 'purchase_click', {
    box_id: boxId,
    price: priceExperimentParams.value.price,
  });

  // 正常的业务逻辑
  uni.navigateTo({ url: `/pages/order/confirm?boxId=${boxId}` });
}
</script>
```

### 3.6 实验开关在 Pinia Store 中的管理

```typescript
// stores/experiment.ts

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getVariant,
  getVariantWithParams,
  getAllActiveVariants,
  type ExperimentVariant,
} from '@/utils/ab-test/experiment';

/**
 * 全局实验状态 Store
 * 用途：
 * 1. 避免每个组件重复调用原生 getVariant（减少 JSBridge 开销）
 * 2. 在多个页面间共享实验分组
 */
export const useExperimentStore = defineStore('experiment', () => {
  /** 当前用户所有活跃实验的分组快照 */
  const activeVariants = ref<ExperimentVariant[]>([]);

  /** 是否已加载 */
  const loaded = ref(false);

  /** 初始化：拉取一次，全局共享 */
  async function loadExperiments() {
    if (loaded.value) return;
    activeVariants.value = getAllActiveVariants();
    loaded.value = true;
  }

  /** 获取某个实验的分组（带缓存） */
  function getVariantCached(experimentId: string, defaultValue = 'control'): string {
    const found = activeVariants.value.find(
      (v) => v.experimentId === experimentId,
    );
    return found?.groupKey || getVariant(experimentId, defaultValue);
  }

  /** 重置（用户切换账号时调用） */
  function reset() {
    activeVariants.value = [];
    loaded.value = false;
  }

  return { activeVariants, loaded, loadExperiments, getVariantCached, reset };
});
```

### 3.7 跨端一致性方案

同一个用户在 APP 和 H5 上看到相同实验分组，关键在于**分组计算的输入参数一致**。

```
┌─────────────────────────────────────────────┐
│  用户唯一标识：user_id（服务端统一分配）        │
│  ↓                                           │
│  实验标识：experiment_id（后台配置）            │
│  ↓                                           │
│  hash(user_id + experiment_id) % 100         │
│  ↓                                           │
│  0-49 → control    50-74 → variant_a        │
│  75-99 → variant_b                           │
└─────────────────────────────────────────────┘
```

关键实现策略：

1. **统一 UID**：APP 和 H5 都使用后端下发的 `user_id` 作为分组计算的种子，而不是设备 ID 或 cookie。
2. **Hash 算法由平台保证**：分组逻辑在 DataTester 服务端执行（或 SDK 内置一致算法），APP 和 H5 SDK 基于相同的 `user_id + experiment_id` 计算，结果天然一致。
3. **H5 端兜底**：如果 H5 在 WebView 中打开，可以使用 `uni.postMessage` 从 APP 端传递已命中的分组信息，避免二次计算。

```typescript
// utils/ab-test/cross-platform.ts

/**
 * H5 WebView 场景：从 APP 端接收已确定的分组
 *
 * 适用情况：
 * - H5 页面嵌入 APP WebView
 * - 不想在 H5 端再初始化一遍 DataTester JS SDK
 */
export function receiveVariantsFromNative(): void {
  // #ifdef H5
  window.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'AB_VARIANTS') {
      // 将 APP 端已计算好的分组注入到 H5 的 getVariant 逻辑中
      // DataTester SDK 支持手动设置分组缓存
      DataTester.setCachedVariants(data.payload);
    }
  });
  // #endif
}
```

### 3.8 实验配置管理流程

在 DataTester 控制台中的标准操作流程：

```
步骤 1：创建实验
  ├─ 实验名称："[首页] v2 布局 A/B Test"
  ├─ 实验 ID：homepage_layout_v2（自动生成或手动指定）
  ├─ 实验类型：A/B（多组对比）
  └─ 关联指标：
      ├─ 主指标：首页盲盒点击率（CTR）
      ├─ 辅助指标：人均浏览时长、跳出率
      └─ 护栏指标：GMV、下单转化率（不能降）

步骤 2：配置分组
  ├─ control（对照组，50% 流量）：现有布局
  ├─ variant_a（实验组，25% 流量）：瀑布流 + 大图
  └─ variant_b（实验组，25% 流量）：双列网格 + 价格前置

步骤 3：设定流量与分层
  ├─ 总流量：100% 新用户或有 homepage 事件的老用户
  ├─ 分层：放入"首页 UI"互斥层（与"定价"实验互不干扰）
  └─ 白名单：QA 测试账号强制命中各分组用于回归

步骤 4：启动实验 → 等待样本量达标
  ├─ 样本量预估：MDE 5%，power 80%，α 0.05 → 每组需约 10,000 样本
  ├─ 实验周期：至少覆盖 2 个完整周（消除周内波动）
  └─ 实时监控 SRM（样本比例不均衡检测）

步骤 5：数据分析与决策
  ├─ 主指标显著（p < 0.05）→ 考虑上线
  ├─ 护栏指标有没有显著劣化？→ 无劣化才上线
  └─ 灰度放量：先 5% → 20% → 50% → 100%
```

---

## 4. 真实经验视角

### 4.1 我踩过的 A/B 实验坑

**坑一：样本量不够就下结论。**

做过一个首页改版实验，对照组和实验组各只有 800 个样本，但实验组转化率看起来高了 12%，团队兴奋地想马上全量。我坚持算了一下 MDE（最小可检测效应），在 80% 统计功效下，每组至少需要 5,000 样本才能稳定检测到 5% 的提升。等样本量达标后，12% 的优势缩水到了 1.8%，p = 0.42，完全不显著。差一点把一个噪声当成了结论。

解决方案：在实验创建时就做样本量预估，把预估结果写在实验文档里，不到样本量不下结论。

**坑二：实验周期太短，被"新奇效应"骗了。**

一个改版实验在上线后第 2-5 天数据显示大幅正向，到了第 8 天开始回归均值，第 14 天反转为负向。原因很简单：用户看到新界面会好奇多点了两下，等新鲜劲过了就没兴趣了。只跑 7 天的实验会高估改版效果。

解决方案：任何 UI 实验至少跑 2 个完整周。第 1 周的数据打上"新奇期"标签，核心分析基于第 2 周数据。

**坑三：多个实验互相干扰，怎么下结论都是错的。**

同一批用户在首页同时跑了"布局改版实验"和"定价实验"。结果显示布局 B 的 GMV 更高，但实际上是因为布局 B 的用户组恰好更高比例地被分到了"低价实验组"。这是实验 A 和实验 B 的分配不独立导致的辛普森悖论。

解决方案：在 DataTester 中把"首页 UI"和"商品定价"放到不同的互斥层（Mutually Exclusive Layer），确保同一用户在一个层内只参与一个实验，层与层之间的分流正交。

### 4.2 学到的三条教训

1. **实验设计做在前头，数据分析才能不拍脑袋。** 不提前写实验假设、不预估样本量、不定 MDE，拿到结果后就得靠"信仰"做决策。"结果不显著怎么办"这个问题，应该在实验开始前就问出来并回答。

2. **护栏指标比主指标更重要。** 主指标正向但 GMV 掉 5% 的实验绝对不能上线，这不是"功过相抵"，这是"指标选择的失败"。正确的做法是实验设计阶段就明确定义哪些是护栏指标（一定不能劣化），并提前设定好停止实验的红线。

3. **统计显著不等于业务显著。** p < 0.05 但提升只有 0.3% 的实验，对业务没有意义。上线这样的实验只会增加代码复杂度，而不会带来可感知的收益。给实验结果一份"价值评估"：提升 * 流量 * 客单价 = 预估年度收益，收益 < 开发成本的实验不值得上线。

---

## 附录：自研 A/B 实验平台的最小可行方案

如果未来 DemoBox 决定自建，以下是一个 3 周内可交付的 MVP 技术方案。

### 数据模型

```sql
-- 实验表
CREATE TABLE experiments (
  id            VARCHAR(64) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  status        ENUM('draft', 'running', 'paused', 'ended') DEFAULT 'draft',
  traffic_pct   INT NOT NULL,            -- 占用百分比流量
  variants      JSON NOT NULL,           -- [{"key":"control","pct":50},{"key":"variant_a","pct":50}]
  layer_key     VARCHAR(64),             -- 互斥层 key，同一层内实验互斥
  metrics       JSON,                    -- 关联指标
  started_at    DATETIME,
  ended_at      DATETIME,
  created_at    DATETIME DEFAULT NOW()
);

-- 用户分组表
CREATE TABLE experiment_assignments (
  user_id       VARCHAR(64) NOT NULL,
  experiment_id VARCHAR(64) NOT NULL,
  variant_key   VARCHAR(32) NOT NULL,    -- 命中分组
  assigned_at   DATETIME DEFAULT NOW(),
  PRIMARY KEY (user_id, experiment_id)
);

-- 实验事件表（曝光 + 转化）
CREATE TABLE experiment_events (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  experiment_id VARCHAR(64) NOT NULL,
  variant_key   VARCHAR(32) NOT NULL,
  event_type    ENUM('exposure', 'conversion') NOT NULL,
  goal_name     VARCHAR(64),             -- 转化目标名称
  extra_data    JSON,                    -- 扩展字段
  created_at    DATETIME DEFAULT NOW(),
  INDEX idx_exp_variant_time (experiment_id, variant_key, created_at)
);
```

### 分组算法

```typescript
/**
 * 服务端分组算法（Node.js / Go）
 * 核心：hash(user_id + salt + experiment_id) 确保分配稳定
 */

import crypto from 'crypto';

function assignVariant(
  userId: string,
  experimentId: string,
  variants: Array<{ key: string; pct: number }>,
  layerSalt: string = '',
): string {
  // 如果用户已有分配记录，直接返回（粘性分组）
  const existing = await db.getAssignment(userId, experimentId);
  if (existing) return existing.variant_key;

  // 基于 user_id + experiment_id + layer_salt 计算 hash
  // layer_salt 保证不同层的分流正交
  const hashInput = `${userId}:${layerSalt}:${experimentId}`;
  const hash = crypto.createHash('md5').update(hashInput).digest('hex');
  const bucketId = parseInt(hash.substring(0, 8), 16) % 10000; // 0-9999 万分之一精度

  // 按权重分配
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.pct * 100; // pct 是百分比，转为万分之一单位
    if (bucketId < cumulative) {
      // 持久化分配结果
      await db.insertAssignment(userId, experimentId, variant.key);
      return variant.key;
    }
  }

  // fallback：最后一个分组
  return variants[variants.length - 1].key;
}
```

### 前端 API（HTTP 而非 SDK）

```typescript
// pages/home/index.vue - 自建方案的前端调用方式

onMounted(async () => {
  // 从自建实验服务拉取分组（HTTP API，一个请求拉全部）
  const assignments = await fetch('/api/experiments/assignments?user_id=xxx');
  // assignments = { homepage_layout_v2: 'variant_a', pricing_test: 'control' }

  homeLayoutVariant.value = assignments.homepage_layout_v2 || 'control';
});
```

这种方式比完整 SDK 更轻量，适合 MVP 阶段。缺点是缺少本地缓存和离线降级能力，但可以在 3 周内跑起来。

---

## 总结

| 决策 | 结论 |
|------|------|
| 当前选型 | 火山引擎 DataTester（免费版） |
| 核心原因 | uni-app 原生插件适配、统计引擎完整、国内可用、免费起步 |
| 何时迁移 | MAU 超 100 万 + 团队有统计背景 → 考虑 GrowthBook 自建 |
| 绝对不选 | Firebase A/B Testing（国内墙）、Optimizely（太贵+国内慢） |
| 统计原则 | 前端只做分组获取 + 事件上报，统计显著性由平台/后端计算，前端绝不自行判断 |

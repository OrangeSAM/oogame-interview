# Task B：H5 → App 归因方案

## 1. 方案对比表

| 维度 | openinstall | Adjust | AppsFlyer | 友盟+ 应用统计 | Branch.io |
|------|------------|--------|-----------|--------------|-----------|
| **国内/海外适用** | 国内为主，海外可用 | 海外为主，国内受限 | 海外为主，国内受限 | 仅国内 | 海外为主，国内基本不可用 |
| **价格模式** | 免费 + 付费版，按量付费（国内有价格优势） | 按年付费，价格偏高（$30K+/年起步） | 按年付费 + MAU 阶梯，价格最高（$50K+/年起步） | 免费（基础）+ 增值付费 | 免费（基础）+ MAU 付费，国内无定价 |
| **微信兼容性** | **优秀** — 原生支持微信开放标签、应用宝跳转、小程序跳 App | **差** — 无微信生态适配，需自行拼中间页 | **差** — 同 Adjust，不处理微信封闭环境 | **好** — 支持微信内统计，但跳转能力弱（需应用宝） | **极差** — 国内微信场景基本不可用 |
| **Deep Link / Universal Link 支持** | 支持（Android App Links + iOS Universal Links + URI Scheme fallback） | 支持（业内标准实现） | 支持（业内标准实现） | 支持（基础能力） | 支持（核心能力） |
| **隐私合规（国内个保法）** | **合规** — 数据存储在国内，通过个保法合规认证 | 需额外配置境内数据存储，合规成本高 | 同 Adjust，数据默认出境，合规复杂 | **合规** — 阿里云底座，数据不出境 | 数据默认出境，国内合规几乎不可用 |
| **接入复杂度** | **低** — uni-app 有官方插件，半天可接入 | 中 — SDK 成熟但配置项多 | 中 — 类似 Adjust | 低 — 友盟全家桶用户几乎零成本 | 高 — 国内网络环境不稳定，常需代理 |
| **uni-app 兼容性** | **有官方 uni-app 插件**（marketplace） | 无官方插件，需原生插件开发 | 无官方插件，需原生插件开发 | 有官方 uni-app 插件 | 无官方插件，且无国内适配 |
| **核心优势** | 微信生态闭环（开放标签→应用宝→App 全链路可追踪）；国内合规；价格低；uni-app 原生支持 | 海外反作弊最强；全球数据覆盖广；S2S 回传生态成熟 | 海外 ROI 分析最强；媒体渠道集成最广；LTV 预测准 | 国内数据最全；与友盟统计、推送无缝联动；免费 | 国外 Deep Link 体验最流畅；Scattered Links 技术强 |
| **核心劣势** | 海外数据能力弱；反作弊不如 Adjust/AppsFlyer | 国内几乎无法使用（GMS 依赖）；价格极高；微信不兼容 | 国内受限严重；价格最高；数据默认为境外 | 归因模型简单（最后点击为主）；跨渠道归因弱；无海外能力 | 国内不可用（域名常被墙）；合规不达标；无微信适配 |

---

## 2. 选型结论

### DemoBox 选择：**openinstall**

**理由 1：微信生态是第一优先级**

DemoBox 是盲盒电商，核心获客场景就是微信（朋友圈 H5 分享 → 引导下载 APP）。微信内置浏览器屏蔽所有直链（Universal Link 被微信全面封禁、URI Scheme 无法触发），只有 openinstall 提供了完整的微信闭环方案：H5 落地页 → 微信开放标签 → 应用宝下载页 → App 首次打开 → 归因匹配。Adjust / AppsFlyer 在微信里等于"黑盒"，完全看不到转化路径。

**理由 2：国内隐私合规（个保法）零风险**

openinstall 数据存储在国内服务器，通过了《个人信息保护法》合规认证。Adjust 和 AppsFlyer 数据默认出境（服务器在海外），需要额外签署 SCC（标准合同条款）并在国内部署数据节点，合规成本高且仍有政策风险。友盟虽然数据在国内，但归因能力远弱于 openinstall。

**理由 3：uni-app 生态 + 接入成本**

openinstall 在 uni-app 插件市场有官方插件（`openinstall-uni-plugin`），App 端和 H5 端均可通过插件直接集成，接入周期约半天。而 Adjust / AppsFlyer 在 uni-app 中无官方支持，需要手写原生插件桥接层，开发和维护成本高。

### 为什么不选其他

- **Adjust / AppsFlyer**：DemoBox 现阶段不做海外市场，每年几十万的费用在微信里还追踪不到数据，ROI 极低。
- **友盟+ 应用统计**：归因模型太简单（基本只有最后点击），无法区分自然量和渠道量，盲盒电商需要精确到单个分享链接的追踪。
- **Branch.io**：国内域名间歇性不可用，微信完全封禁 Branch 链接，且没有国内合规方案，不适用于纯国内 App。

---

## 3. 集成方案

### 3.1 整体架构链路

```
用户点击分享链接
       │
       ▼
┌─────────────────┐
│  H5 落地页       │  ← openinstall H5 SDK（JS）生成带参数的下载链接
│  （微信/浏览器）  │  ← 判断环境，决定跳转策略
└────────┬────────┘
         │
    ┌────▼────┬──────────┬────────────┐
    │         │          │            │
 微信内     浏览器内    App 已安装   扫码
    │         │          │            │
    ▼         ▼          ▼            ▼
微信开放标签  Universal  Deep Link  应用宝/商店
   │       Link fall  / App Links    │
   ▼         │          │            │
应用宝下载    └──────────┴────────────┘
    │                    │
    ▼                    ▼
┌──────────────────────────────┐
│  APP 首次打开                 │
│  openinstall SDK 自动获取     │
│  install 参数（渠道号、        │
│  邀请码、分享人 ID 等）        │
└──────────────────────────────┘
```

### 3.2 uni-app 集成（关键代码/配置）

#### 3.2.1 安装插件

在 uni-app 项目中引入 openinstall 插件：

```bash
# manifest.json → App 原生插件配置 → 搜索 openinstall
# 或通过插件市场链接导入：https://ext.dcloud.net.cn/plugin?id=xxx
```

#### 3.2.2 App 端：初始化 openinstall SDK

```javascript
// utils/attribution.js — 归因工具模块
import { onLaunch, onShow } from '@dcloudio/uni-app';

// openinstall uni-app 插件（通过插件市场导入后的原生模块）
const openinstall = uni.requireNativePlugin('openinstall-plugin');

/**
 * 初始化归因 SDK（在 App.vue onLaunch 中调用）
 */
export function initAttribution() {
  // #ifdef APP-PLUS
  // 1. 初始化 openinstall
  openinstall.init({
    appKey: 'YOUR_OPENINSTALL_APP_KEY', // 从 openinstall 后台获取
    // 广告平台渠道（可选，对接巨量引擎/广点通等）
    adEnabled: true,
    // 获取安装数据（含渠道参数）
    wakeUpHandler: (data) => {
      console.log('[归因] 唤醒数据:', data);
      // data.channelCode — 渠道编号
      // data.bindData  — 自定义参数（如 inviteCode、shareUserId 等）
      handleAttributionData(data);
    },
    // 安装回调
    installHandler: (data) => {
      console.log('[归因] 安装归因数据:', data);
      handleAttributionData(data);
    },
  });

  // 2. 获取拉新数据（上报服务端，用于邀请奖励结算）
  openinstall.getInstallParams((result) => {
    if (result.bindData) {
      // 上报到自己的业务后端
      uni.request({
        url: 'https://api.demobox.cn/v1/attribution/report',
        method: 'POST',
        data: {
          channelCode: result.channelCode,
          bindData: result.bindData,
          deviceId: result.deviceId,
        },
      });
    }
  });
  // #endif
}

/**
 * 处理归因数据 — 写入用户 profile
 */
function handleAttributionData(data) {
  const store = useUserStore(); // Pinia store
  if (data.bindData) {
    // 解析自定义参数
    const params = JSON.parse(data.bindData);
    store.setAttribution({
      inviteCode: params.inviteCode,
      shareUserId: params.shareUserId,
      campaignId: params.campaignId,
      channelCode: data.channelCode,
    });
  }
}

/**
 * 注册 XState 监听（高版本支持）
 */
export function registerAttributionReceiver() {
  // #ifdef APP-PLUS
  openinstall.registerWakeUp((data) => {
    // 在 XState 注册页面接收（用于已安装但未打开的渠道追踪）
    handleAttributionData(data);
  });
  // #endif
}
```

#### 3.2.3 H5 端：生成带参数的下载链接

```javascript
// utils/h5-attribution.js — H5 落地页归因引导
import { isWeixin, isAndroid, isIOS } from './env-detect';

/**
 * H5 页面入口 — 生成下载引导链接
 * 
 * 调用时机：用户从分享链接进入 H5 落地页时
 */
export async function generateDownloadLink(shareParams) {
  // 1. 从 URL query 或服务端获取分享参数
  const { inviteCode, campaignId, shareUserId } = shareParams;

  // 2. 构建 openinstall link
  //    openinstall 基于设备指纹匹配，H5 端只需拼参数，无需调 SDK
  const baseUrl = 'https://app.demobox.cn/download'; // 你的落地页
  const oiLink = buildOpenInstallLink({
    channelCode: campaignId || 'default',
    bindData: JSON.stringify({
      inviteCode,
      shareUserId,
      campaignId,
      timestamp: Date.now(),
    }),
  });

  // 3. 根据环境返回不同的跳转策略
  return {
    oiLink,                    // openinstall 短链
    strategy: getJumpStrategy(), // 微信/浏览器/已安装
    fallback: getFallbackUrl(), // 应用宝 / App Store
  };
}

function buildOpenInstallLink({ channelCode, bindData }) {
  // openinstall 归因链接格式
  const base = 'https://d.demobox.cn/'; // 替换为你的 openinstall 域名
  const params = new URLSearchParams({
    channelCode,
    data: encodeURIComponent(bindData),
  });
  return `${base}?${params.toString()}`;
}

function getJumpStrategy() {
  if (isWeixin()) {
    return 'wechat'; // 微信开放标签 → 应用宝 → App
  }
  if (isAndroid()) {
    return 'android_browser'; // App Links / 应用宝下载
  }
  if (isIOS()) {
    return 'ios_browser'; // Universal Links / App Store
  }
  return 'other';
}

function getFallbackUrl() {
  if (isAndroid()) {
    // 应用宝兜底链接（带渠道参数）
    return 'https://a.app.qq.com/o/simple.jsp?pkgname=com.demobox.app&channel=xxx';
  }
  if (isIOS()) {
    return 'https://apps.apple.com/cn/app/idXXXXXXXXXX';
  }
  return 'https://app.demobox.cn/download';
}
```

#### 3.2.4 Android App Links 配置

```xml
<!-- AndroidManifest.xml 关键配置 -->
<activity android:name=".MainActivity">
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <!-- App Links：系统直接拉起 App，不弹选择框 -->
    <data
      android:scheme="https"
      android:host="app.demobox.cn"
      android:pathPrefix="/open" />
  </intent-filter>
  <!-- URI Scheme fallback -->
  <intent-filter>
    <data android:scheme="demobox" />
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
  </intent-filter>
</activity>
```

**assetlinks.json**（需放在 `https://app.demobox.cn/.well-known/assetlinks.json`）：

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.demobox.app",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88"
    ]
  }
}]
```

#### 3.2.5 iOS Universal Links 配置

**apple-app-site-association**（放在 `https://app.demobox.cn/.well-known/apple-app-site-association`）：

```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.demobox.app",
      "paths": ["/open/*", "/download/*", "/share/*"]
    }]
  }
}
```

**Xcode 配置**：在 Signing & Capabilities 中开启 Associated Domains，添加：
```
applinks:app.demobox.cn
```

#### 3.2.6 Uni-app manifest.json 配置

```json
{
  "app-plus": {
    "distribute": {
      "android": {
        "schemes": "demobox",
        "intentFilters": [{
          "action": "android.intent.action.VIEW",
          "category": ["android.intent.category.DEFAULT", "android.intent.category.BROWSABLE"],
          "data": [{
            "scheme": "https",
            "host": "app.demobox.cn",
            "pathPrefix": "/open"
          }]
        }]
      },
      "ios": {
        "urltypes": [{
          "urlschemes": ["demobox"]
        }],
        "capabilities": {
          "associatedDomains": ["applinks:app.demobox.cn"]
        }
      }
    },
    "nativePlugins": {
      "openinstall-plugin": {
        "__plugin_info__": {
          "appKey": "YOUR_OPENINSTALL_APP_KEY"
        }
      }
    }
  }
}
```

### 3.3 微信内屏蔽直链的处理方案

这是整个归因链路中最关键也最容易断的一环。微信内置浏览器全面屏蔽：
- Universal Links（iOS）— 直接不触发
- App Links（Android）— 微信不解析
- URI Scheme — 类如 `demobox://` 被微信白屏拦截
- Branch / 短链跳转 — 域名被举报后封禁

#### 方案 A：微信开放标签（推荐，但需要微信认证）

```html
<!-- H5 落地页 HTML -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DemoBox - 下载 App 拆盲盒</title>
  <!-- 微信 JS-SDK -->
  <script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
</head>
<body>
  <div id="app">
    <wx-open-launch-app
      id="launchBtn"
      appid="wxYOUR_APPID"
      extinfo="channelCode=invite_share&bindData=xxx">
      <script type="text/wxtag-template">
        <style>
          .btn { padding: 12px 40px; background: #FF6B35; color: #fff;
                 border-radius: 24px; font-size: 16px; }
        </style>
        <button class="btn">打开 DemoBox App</button>
      </script>
    </wx-open-launch-app>

    <!-- 兜底：微信开放标签需要 APP 已安装，未安装时自动展示应用宝下载 -->
    <div id="fallback" style="display:none;">
      <a href="https://a.app.qq.com/o/simple.jsp?pkgname=com.demobox.app&ckey=CK1377786666666">
        下载 DemoBox App
      </a>
    </div>
  </div>

  <script>
    // 微信 JS-SDK 初始化
    wx.config({
      debug: false,
      appId: 'wxYOUR_APPID',
      timestamp: '<%= timestamp %>',
      nonceStr: '<%= nonceStr %>',
      signature: '<%= signature %>',
      jsApiList: [],
      openTagList: ['wx-open-launch-app'], // 开放标签
    });

    wx.ready(() => {
      // 开放标签 ready 后，未安装 APP 时显示兜底按钮
      setTimeout(() => {
        const launchBtn = document.getElementById('launchBtn');
        const fallback = document.getElementById('fallback');
        // 如果开放标签没渲染出来，说明不可用，展示兜底
        if (launchBtn.offsetHeight === 0) {
          fallback.style.display = 'block';
        }
      }, 500);
    });

    // 监听开放标签拉起成功/失败
    document.getElementById('launchBtn').addEventListener('launch', (e) => {
      console.log('[微信] 拉起 App 成功');
    });
    document.getElementById('launchBtn').addEventListener('error', (e) => {
      console.log('[微信] 拉起 App 失败，展示下载引导');
      document.getElementById('fallback').style.display = 'block';
    });
  </script>
</body>
</html>
```

**注意**：`wx-open-launch-app` 开放标签的前置条件：
- 微信开放平台账号已完成企业认证
- APP 已通过微信开放平台审核
- H5 域名在 JS 接口安全域名白名单中

#### 方案 B：应用宝下载 + openinstall 归因（未认证时的兜底）

微信未认证或无法使用开放标签时，引导用户通过应用宝下载：

```javascript
// H5 端微信环境归因引导
function wechatAttributionFlow(openinstallLink) {
  // 1. 引导用户点击右上角"..." → "在浏览器中打开"
  //    在浏览器中打开时，Android 会触发 App Links
  showBrowserGuideOverlay();

  // 2. 同时提供应用宝下载链接（openinstall 支持应用宝归因）
  const yingyongbaoUrl = buildYingyongbaoLink(openinstallLink);
  // openinstall 后台会记录这次应用宝下载，App 首次打开时通过设备指纹+IP+时间窗口匹配

  // 3. 二维码引导（针对 PC 微信或 iPad 用户）
  showQRCodeForMobileScan(openinstallLink);
}
```

#### 方案 C：中间引导页（兜底中的兜底）

```html
<!-- guide.html — 微信内打开的引导页 -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DemoBox</title>
  <style>
    .overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); z-index: 9999;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; color: white;
    }
    .arrow { font-size: 48px; animation: bounce 1s infinite; }
    @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    .tip { margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="overlay" onclick="openInBrowser()">
    <div class="arrow">↗️</div>
    <div class="tip">点击右上角 ··· <br/>选择「在浏览器中打开」<br/>即可安装 DemoBox App</div>
  </div>

  <script>
    function openInBrowser() {
      // 点击蒙层后，如果用户已复制链接，尝试打开
      // 同时提供应用宝兜底
      window.location.href =
        'https://a.app.qq.com/o/simple.jsp?pkgname=com.demobox.app';
    }
  </script>
</body>
</html>
```

### 3.4 完整归因链路时序

```
时间线：

T0  ┌─ 用户 A 在 App 内点击"分享盲盒给好友"
    │  App 调用 openinstall SDK 生成分享短链
    │  短链包含：channelCode=share_box&bindData={"shareUserId":"A","boxId":"123"}
    │
T1  ┌─ 用户 B 在微信内点击分享链接
    │  H5 落地页判断环境 = 微信
    │  → 展示 wx-open-launch-app 开放标签（如已认证）
    │  → 或展示引导蒙层 + 应用宝下载链接
    │
T2  ┌─ 用户 B 按照引导下载 App（应用宝 / App Store）
    │  openinstall 后台记录：设备指纹 + IP + UA + 下载时间窗口
    │
T3  ┌─ 用户 B 首次打开 App
    │  openinstall SDK 初始化 → 自动请求 install 数据
    │  后台匹配设备指纹 → 返回 {"shareUserId":"A","boxId":"123","channelCode":"share_box"}
    │  App 执行业务逻辑：
    │    - 绑定邀请关系（B 是 A 的邀请用户）
    │    - 给 B 发放新人盲盒奖励
    │    - 给 A 发放邀请奖励（A 再次打开 App 时触发服务端回调）
    │
T4  ┌─ openinstall 回调 DemoBox 服务端
    │  POST /callback/install → 通知邀请关系已建立
    │  DemoBox 服务端：
    │    - 写入 user.invitedBy = "A"
    │    - 触发邀请奖励发放
```

---

## 4. 真实经验视角

### 4.1 接入归因 SDK 踩过的坑

**坑 1：iOS 归因延迟（Privacy-Preserving Ad Attribution）**

iOS 15+ 开始，Apple 引入 Private Click Measurement（PCM），归因从实时变成异步，延迟 24-48 小时。我们的邀请奖励逻辑依赖"B 注册时就知道是谁邀请的"，等 2 天用户早流失了。

**解决方案**：openinstall 不依赖 IDFA，用的是设备指纹 + IP + UserAgent + 时间窗口匹配，可以在 App 首次打开时（3 秒内）完成归因。代价是匹配精度略低于 IDFA 方案（大约 95% vs 99%），但对于邀请裂变场景完全够用。

**坑 2：Android 厂商拦截 Intent**

华为、OPPO、vivo 的 ROM 会对 URI Scheme 和 App Links 做拦截。华为会把某些 scheme 重定向到应用市场搜索，而不是直接打开 App；OPPO 的 ColorOS 会弹系统级"是否允许打开"对话框但不透传 intent 参数。

**解决方案**：
- 同时配置 App Links（HTTPS）和 URI Scheme，App Links 优先级更高，绕过大部分厂商拦截
- openinstall 的关键价值：即使厂商拦截导致参数丢失，后台仍然可以通过设备指纹在 App 首次打开时补充参数
- H5 端做环境检测，对华为/OPPO 设备直接引导应用商店下载（不依赖 scheme 跳转）

**坑 3：微信内无法直接跳转，iOS 和 Android 表现还不一样**

- iOS 微信：Universal Links 在微信 7.0 后被彻底封禁（包括 App Store 页面内的"打开"按钮都不透传参数）
- Android 微信：部分版本可以通过"在浏览器中打开"后触发 App Links，但不是所有设备都行
- 微信开放标签 `wx-open-launch-app` 需要企业认证，且审核周期 3-5 个工作日

**解决方案**：
- 产品层面：接受微信内无法"一键唤起"，改为"微信中间页 → 引导浏览器打开 → App 激活"
- 技术层面：openinstall 的应用宝对接 + 设备指纹匹配弥补了微信内跳转断掉的归因链
- 运营层面：微信场景的 H5 落地页直接放应用宝和 App Store 双下载按钮，不做唤起尝试（用户预期就是去下载的，不是打开已安装的 App）

**坑 4：多级分发归因冲突**

当用户 B 被 A 邀请后下载了 App，但 B 在注册前又通过 C 的分享链接打开了 App——应该算谁的？

**解决方案**：
- openinstall 后台配置归因窗口（默认 7 天，首次安装为准）
- App 端收到归因数据后立即上报服务端并写入 Redis（first-touch 策略），后续重复归因请求直接丢弃
- 业务层定义：注册时检查 Redis，有归因数据就绑定，没有就算自然量

### 4.2 怎么解决微信生态下的归因问题

核心思路是**"不尝试在微信内完成跳转，而是在微信内完成归因标识的分发"**：

1. **微信 H5 落地页**：用户进入时，服务端生成唯一 session token，写入 cookie 和 openinstall 的 bindData
2. **应用宝下载**：openinstall 对接了应用宝的安装回调，下载完成时应用宝会把设备信息回传给 openinstall
3. **App 首次打开**：openinstall SDK 拿到 session token 对应的 bindData，完成归因
4. **服务端兜底**：如果设备指纹匹配失败（比如用户换了 Wi-Fi 到 4G → IP 变化），服务端用 session token + 时间窗口做兜底匹配

### 4.3 学到的教训

1. **归因不是精确科学，别追求 100% 覆盖**。国内 Android 生态碎片化严重，厂商拦截、用户清理 App、换设备等都会导致归因失败。实际归因率 85%-95% 就是合格线。把精力花在归因成功后的业务转化上，比追求完美归因更有价值。

2. **微信场景的归因要提前做，不要等跳转时再做**。用户进入 H5 落地页的第一时间就要落库（设备指纹、IP、时间戳、渠道参数），即使后续跳转链路断了，至少知道"有过一个微信用户在这个时间点访问了 A 的分享链接"。

3. **App 端和服务端要做双保险**。App 端用 openinstall SDK 做实时归因，服务端做异步兜底（根据设备信息 + 时间窗口做模糊匹配）。这样即使 SDK 归因失败（比如用户开启飞行模式才打开），10 秒后服务端也能补上。

4. **优先做 Android 的归因，iOS 随缘**。国内市场 Android 占比超过 80%，而且 Android 归因链路长、厂商多、坑也多。iOS 用户相对同质化，归因反而简单。资源分配应该是 Android 70%，iOS 30%，不要平均用力。

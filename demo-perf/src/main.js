// 最早执行点 —— 整个 JS 引擎的第一行代码
const EARLIEST_JS_TIME = Date.now()

import {
  createSSRApp
} from "vue";
import App from "./App.vue";

export function createApp() {
  const app = createSSRApp(App);

  // 把最早时间戳挂到全局，App.vue 会用到
  app.config.globalProperties.$earliestJsTime = EARLIEST_JS_TIME;

  return { app };
}

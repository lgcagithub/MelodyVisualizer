/**
 * MelodyVisualizer - Vue 3 版本
 * 主应用入口
 */

import { createApp, ref, computed } from './vue.esm-browser.js';

// 导入组件
import AppHome from './components/AppHome.js';
import MidiView from './components/MidiView.js';
import AudioView from './components/AudioView.js';
import Navigation from './components/Navigation.js';

// 主应用组件
const App = {
  components: {
    Navigation,
    AppHome,
    MidiView,
    AudioView
  },

  setup() {
    const currentView = ref('home');

    // 当前视图组件
    const currentViewComponent = computed(() => {
      const views = {
        home: 'AppHome',
        midi: 'MidiView',
        audio: 'AudioView'
      };
      return views[currentView.value] || 'AppHome';
    });

    // 导航方法
    const navigateTo = (view) => {
      currentView.value = view;
    };

    return {
      currentView,
      currentViewComponent,
      navigateTo
    };
  },

  template: `
    <div id="app">
      <!-- 导航栏 -->
      <Navigation
        v-if="currentView !== 'home'"
        @go-back="navigateTo('home')"
      />

      <!-- 视图切换 -->
      <component
        :is="currentViewComponent"
        @navigate="navigateTo"
      />
    </div>
  `
};

// 创建并挂载应用
const app = createApp(App);
app.mount('#app');
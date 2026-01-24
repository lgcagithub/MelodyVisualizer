<template>
  <div id="app">
    <!-- 导航栏 -->
    <Navigation v-if="currentView !== 'home'" @go-back="navigateTo('home')" />

    <!-- 视图切换 -->
    <component :is="currentViewComponent" @navigate="navigateTo" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Navigation from './components/Navigation.vue';
import AppHome from './components/AppHome.vue';
import MidiView from './components/MidiView.vue';
import AudioView from './components/AudioView.vue';

type View = 'home' | 'midi' | 'audio';

const currentView = ref<View>('home');

const currentViewComponent = computed(() => {
  const views = {
    home: AppHome,
    midi: MidiView,
    audio: AudioView,
  };
  return views[currentView.value] || AppHome;
});

const navigateTo = (view: string) => {
  currentView.value = view as View;
};
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  min-height: 100vh;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
}
</style>

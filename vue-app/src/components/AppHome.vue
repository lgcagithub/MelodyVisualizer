<template>
  <div class="home-view">
    <div class="hero">
      <h1>🎵 MelodyVisualizer</h1>
      <p>选择一个模式开始体验</p>
    </div>
    <div class="menu-buttons">
      <button class="menu-btn midi-btn" @click="navigateTo('midi')">
        <span class="icon">🎹</span>
        <span class="text">MIDI 模式</span>
        <span class="desc">连接电钢琴，实时可视化</span>
      </button>
      <button class="menu-btn audio-btn" @click="navigateTo('audio')">
        <span class="icon">🎵</span>
        <span class="text">音频分析</span>
        <span class="desc">上传音频，查看频谱和波形</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'navigate', view: string): void;
}>();

const navigateTo = (view: string) => {
  emit('navigate', view);
};
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px;
  text-align: center;
}

.hero {
  margin-bottom: 60px;
}

.hero h1 {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero p {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
}

.menu-buttons {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.menu-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  min-width: 200px;
}

.menu-btn:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.midi-btn:hover {
  background: rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.5);
}

.audio-btn:hover {
  background: rgba(118, 75, 162, 0.2);
  border-color: rgba(118, 75, 162, 0.5);
}

.icon {
  font-size: 32px;
}

.text {
  font-size: 20px;
  font-weight: 600;
}

.desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}
</style>

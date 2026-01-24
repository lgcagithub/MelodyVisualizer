<template>
  <div class="audio-view">
    <Navigation @go-back="emit('navigate', 'home')" />

    <!-- 全屏 Canvas 容器 -->
    <div class="canvas-container" ref="canvasContainer">
      <!-- 空状态提示 -->
      <div v-if="!audioLoaded" class="empty-state">
        <div class="empty-icon">🎵</div>
        <div class="empty-text">请上传音频文件开始分析</div>
        <div class="empty-hint">支持 MP3, WAV 等常见音频格式</div>
      </div>
    </div>

    <!-- 悬浮侧边栏（桌面端/平板端） -->
    <div v-if="!responsiveState.isMobile"
         class="sidebar"
         :class="{ collapsed: responsiveState.isSidebarCollapsed }">
      <!-- 控制面板内容 -->
      <div class="sidebar-content">
        <div class="control-group">
          <label>音频文件</label>
          <div class="file-controls">
            <input
              type="file"
              accept="audio/*"
              @change="handleFileChange"
              ref="fileInput"
              style="display: none"
            />
            <button class="upload-btn" @click="fileInput?.click()">
              <span>📁</span>
              <span>{{ fileName || '选择文件' }}</span>
            </button>
          </div>
          <div class="status" :class="{ connected: audioLoaded, disconnected: !audioLoaded }">
            {{ audioLoaded ? '✓ 已加载' : '✗ 未加载' }}
          </div>
        </div>

        <div class="control-group">
          <label>播放控制</label>
          <div class="play-controls">
            <button class="play-btn" @click="play" :disabled="!audioLoaded || isPlaying">播放</button>
            <button class="pause-btn" @click="pause" :disabled="!audioLoaded || !isPlaying">暂停</button>
            <button class="stop-btn" @click="stop" :disabled="!audioLoaded">停止</button>
          </div>
        </div>

        <div class="control-group">
          <label>频谱峰值: {{ spectrumPeak }}</label>
        </div>
      </div>

      <!-- 折叠按钮 -->
      <button class="collapse-btn" @click="toggleSidebar" :aria-label="responsiveState.isSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'">
        {{ responsiveState.isSidebarCollapsed ? '☰' : '✕' }}
      </button>
    </div>

    <!-- 移动端底部面板 -->
    <div v-if="responsiveState.isMobile"
         class="mobile-panel"
         :class="{ collapsed: !responsiveState.controlsVisible }">
      <div class="control-group">
        <label>音频文件</label>
        <div class="file-controls">
          <input
            type="file"
            accept="audio/*"
            @change="handleFileChange"
            ref="fileInput"
            style="display: none"
          />
          <button class="upload-btn" @click="fileInput?.click()">
            <span>📁</span>
            <span>{{ fileName || '选择文件' }}</span>
          </button>
        </div>
        <div class="status" :class="{ connected: audioLoaded, disconnected: !audioLoaded }">
          {{ audioLoaded ? '✓ 已加载' : '✗ 未加载' }}
        </div>
      </div>

      <div class="control-group">
        <label>播放控制</label>
        <div class="play-controls">
          <button class="play-btn" @click="play" :disabled="!audioLoaded || isPlaying">播放</button>
          <button class="pause-btn" @click="pause" :disabled="!audioLoaded || !isPlaying">暂停</button>
          <button class="stop-btn" @click="stop" :disabled="!audioLoaded">停止</button>
        </div>
      </div>

      <div class="control-group">
        <label>频谱峰值: {{ spectrumPeak }}</label>
      </div>
    </div>

    <!-- 移动端浮动按钮 -->
    <div v-if="responsiveState.isMobile" class="mobile-controls">
      <button class="toggle-btn" @click="toggleControls" :aria-label="responsiveState.controlsVisible ? '隐藏控制面板' : '显示控制面板'" :aria-expanded="responsiveState.controlsVisible">
        {{ responsiveState.controlsVisible ? '✕' : '⚙️' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAudio } from '../composables/useAudio';
import { useResponsive } from '../composables/useResponsive';
import Navigation from './Navigation.vue';

const emit = defineEmits<{
  (e: 'navigate', view: string): void;
}>();

const { isPlaying, audioLoaded, fileName, loadAudioFile, play, pause, stop, getFrequencyData } = useAudio();
const { state: responsiveState, toggleControls, hideControls, toggleSidebar, showSidebar, getCanvasWidth, getCanvasHeight } = useResponsive();

const fileInput = ref<HTMLInputElement>();
const canvasContainer = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const ctx = ref<CanvasRenderingContext2D>();
const spectrumPeak = ref(0);
let animationId: number | null = null;

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await loadAudioFile(file);
  }
};

const drawSpectrum = () => {
  if (!ctx.value || !canvas.value) {
    animationId = requestAnimationFrame(drawSpectrum);
    return;
  }

  const frequencyData = getFrequencyData();

  const width = canvas.value.width ?? 0;
  const height = canvas.value.height ?? 0;

  if (!width || !height) {
    animationId = requestAnimationFrame(drawSpectrum);
    return;
  }

  // 清空
  ctx.value.clearRect(0, 0, width, height);

  // 只有在有频谱数据时才绘制
  if (frequencyData) {
    // 计算频谱峰值
    let peak = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const value = frequencyData[i] ?? 0;
      if (value > peak) peak = value;
    }
    spectrumPeak.value = peak;

    // 绘制频谱
    const barCount = 64;
    const barWidth = width / barCount;
    const step = Math.floor(frequencyData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i * step] ?? 0;
      const percent = value / 255;
      const barHeight = percent * height * 0.8;

      const x = i * barWidth;
      const y = height - barHeight;

      // 渐变颜色
      const gradient = ctx.value.createLinearGradient(x, y, x, height);
      const hue = (i / barCount) * 360;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`);
      gradient.addColorStop(1, `hsla(${hue}, 100%, 40%, 0.3)`);

      ctx.value.fillStyle = gradient;
      ctx.value.fillRect(x + 2, y, barWidth - 4, barHeight);

      // 顶部高光
      if (barHeight > 5) {
        ctx.value.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
        ctx.value.fillRect(x + 2, y, barWidth - 4, 3);
      }
    }
  }

  animationId = requestAnimationFrame(drawSpectrum);
};

const initCanvas = () => {
  if (!canvasContainer.value) return;

  // 创建 Canvas
  canvas.value = document.createElement('canvas');
  ctx.value = canvas.value.getContext('2d')!;
  canvas.value.style.width = '100%';
  canvas.value.style.height = '100%';
  canvas.value.style.position = 'absolute';
  canvas.value.style.top = '0';
  canvas.value.style.left = '0';

  canvasContainer.value.appendChild(canvas.value);

  // 设置实际尺寸
  const resizeCanvas = () => {
    if (!canvas.value || !canvasContainer.value) return;
    canvas.value.width = canvasContainer.value.clientWidth;
    canvas.value.height = canvasContainer.value.clientHeight;
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
};

onMounted(() => {
  initCanvas();
  drawSpectrum();

  // 移动端默认隐藏控制面板
  if (responsiveState.value.isMobile) {
    hideControls();
  }

  // 桌面端默认显示侧边栏
  if (responsiveState.value.isDesktop || responsiveState.value.isTablet) {
    showSidebar();
  }
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  stop();
});
</script>

<style scoped>
.audio-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: v-bind(getCanvasWidth);
  height: v-bind(getCanvasHeight);
  z-index: 1;
  background: rgba(0, 0, 0, 0.3);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 桌面端侧边栏 */
.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  z-index: 999;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed {
  transform: translateX(100%);
}

.sidebar-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.collapse-btn {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 60px;
  background: rgba(102, 126, 234, 0.8);
  border: none;
  border-radius: 8px 0 0 8px;
  color: white;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: rgba(102, 126, 234, 1);
  width: 45px;
}

/* 平板端侧边栏 */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar {
    width: 250px;
  }

  .canvas-container {
    width: calc(100vw - 250px);
  }

  .sidebar.collapsed ~ .canvas-container {
    width: 100vw;
  }
}

/* 移动端底部面板 */
.mobile-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80%;
  z-index: 999;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  transform: translateY(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 20px;
  overflow-y: auto;
}

.mobile-panel.collapsed {
  transform: translateY(100%);
}

/* 移动端浮动按钮 */
.mobile-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.toggle-btn {
  width: 50px;
  height: 50px;
  background: rgba(102, 126, 234, 0.8);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  background: rgba(102, 126, 234, 1);
  transform: scale(1.1);
}

/* 空状态提示 */
.empty-state {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.6;
}

/* 控制组样式 */
.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.control-group label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.file-controls {
  display: flex;
  gap: 8px;
}

.upload-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(102, 126, 234, 0.5);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-btn:hover {
  background: rgba(102, 126, 234, 0.5);
}

.status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.status.connected {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.status.disconnected {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.play-controls {
  display: flex;
  gap: 8px;
}

.play-btn,
.pause-btn,
.stop-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.play-btn {
  background: rgba(46, 204, 113, 0.3);
  border-color: rgba(46, 204, 113, 0.5);
}

.play-btn:hover:not(:disabled) {
  background: rgba(46, 204, 113, 0.5);
}

.pause-btn {
  background: rgba(241, 196, 15, 0.3);
  border-color: rgba(241, 196, 15, 0.5);
}

.pause-btn:hover:not(:disabled) {
  background: rgba(241, 196, 15, 0.5);
}

.stop-btn {
  background: rgba(231, 76, 60, 0.3);
  border-color: rgba(231, 76, 60, 0.5);
}

.stop-btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.5);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 隐藏移动端元素（桌面端） */
@media (min-width: 1025px) {
  .mobile-panel,
  .mobile-controls {
    display: none;
  }
}

/* 移动端调整 */
@media (max-width: 768px) {
  .mobile-controls {
    bottom: 15px;
    right: 15px;
  }

  .toggle-btn {
    width: 45px;
    height: 45px;
    font-size: 18px;
  }
}

/* 平板端调整 */
@media (min-width: 769px) and (max-width: 1024px) {
  .mobile-controls {
    display: none;
  }
}
</style>

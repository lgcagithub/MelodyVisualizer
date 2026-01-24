<template>
  <div class="audio-view">
    <Navigation @go-back="emit('navigate', 'home')" />

    <div class="audio-container">
      <!-- 标题 -->
      <div class="header">
        <h2>🎵 音频分析</h2>
        <p>上传音频文件，查看实时频谱和波形</p>
      </div>

      <!-- 音频控制面板 -->
      <div class="control-panel" :class="{ collapsed: !responsiveState.controlsVisible }">
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

      <!-- 频谱可视化容器 -->
      <div class="canvas-container" ref="canvasContainer">
        <!-- 空状态提示 -->
        <div v-if="!audioLoaded" class="empty-state">
          <div class="empty-icon">🎵</div>
          <div class="empty-text">请上传音频文件开始分析</div>
          <div class="empty-hint">支持 MP3, WAV 等常见音频格式</div>
        </div>
      </div>
    </div>

    <!-- 移动端切换按钮 -->
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
const { state: responsiveState, toggleControls, hideControls } = useResponsive();

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
  min-height: 100vh;
  padding-top: 60px;
  display: flex;
  flex-direction: column;
}

.audio-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 20px;
  flex: 1;
  width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h2 {
  font-size: 32px;
  margin-bottom: 8px;
}

.header p {
  color: rgba(255, 255, 255, 0.7);
}

.control-panel {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
  overflow: hidden;
}

.control-panel.collapsed {
  max-height: 0;
  padding: 0;
  opacity: 0;
  border: none;
}

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

.canvas-container {
  flex: 1;
  width: 100%;
  min-height: 300px;
  height: calc(100vh - 140px);
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

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

/* 移动端切换按钮 */
.mobile-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.toggle-btn {
  width: 50px;
  height: 50px;
  padding: 0;
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

/* 响应式断点 */
@media (max-width: 768px) {
  .audio-view {
    padding-top: 50px;
  }

  .audio-container {
    padding: 10px;
    gap: 16px;
  }

  .header h2 {
    font-size: 24px;
  }

  .header p {
    font-size: 14px;
  }

  .control-panel {
    max-height: 500px;
  }

  .canvas-container {
    height: calc(100vh - 100px);
  }

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

@media (min-width: 769px) and (max-width: 1024px) {
  .canvas-container {
    height: calc(100vh - 160px);
  }
}

@media (min-width: 1025px) {
  .mobile-controls {
    display: none;
  }
}
</style>

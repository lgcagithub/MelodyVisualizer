/**
 * 音频分析模式组件
 * 集成音频文件上传、播放和频谱可视化
 */

import { ref, onMounted, onUnmounted, watch } from '../vue.esm-browser.js';
import { useAudio } from '../composables/useAudio.js';

// 频谱可视化组件
const SpectrumCanvas = {
  name: 'SpectrumCanvas',
  props: {
    analyser: {
      type: Object,
      default: null
    },
    isPlaying: {
      type: Boolean,
      default: false
    }
  },

  setup(props) {
    const canvas = ref(null);
    const ctx = ref(null);
    let animationId = null;

    const resize = () => {
      if (!canvas.value) return;
      const container = canvas.value.parentElement;
      canvas.value.width = container.clientWidth;
      canvas.value.height = container.clientHeight;
    };

    const draw = () => {
      if (!ctx.value || !props.analyser || !props.isPlaying) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const width = canvas.value.width;
      const height = canvas.value.height;

      // 获取频谱数据
      const bufferLength = props.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      props.analyser.getByteFrequencyData(dataArray);

      // 清空画布
      ctx.value.clearRect(0, 0, width, height);

      // 绘制频谱
      const barCount = 64;
      const barWidth = width / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
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

      // 绘制波形
      const waveBufferLength = props.analyser.fftSize;
      const waveDataArray = new Uint8Array(waveBufferLength);
      props.analyser.getByteTimeDomainData(waveDataArray);

      ctx.value.beginPath();
      ctx.value.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.value.lineWidth = 2;

      const sliceWidth = width / waveDataArray.length;
      let x = 0;

      for (let i = 0; i < waveDataArray.length; i++) {
        const v = waveDataArray[i] / 128.0;
        const y = v * height / 2;

        if (i === 0) {
          ctx.value.moveTo(x, y);
        } else {
          ctx.value.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.value.stroke();

      animationId = requestAnimationFrame(draw);
    };

    onMounted(() => {
      if (canvas.value) {
        ctx.value = canvas.value.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        draw();
      }
    });

    onUnmounted(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener('resize', resize);
    });

    watch(() => props.isPlaying, (newVal) => {
      if (newVal && !animationId) {
        draw();
      }
    });

    return {
      canvas
    };
  },

  template: `
    <canvas ref="canvas"></canvas>
  `,

  styles: `
    <style scoped>
      canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    </style>
  `
};

// 音频控制面板
const AudioControlPanel = {
  name: 'AudioControlPanel',
  props: {
    isPlaying: {
      type: Boolean,
      default: false
    },
    audioLoaded: {
      type: Boolean,
      default: false
    },
    fileName: {
      type: String,
      default: ''
    }
  },
  emits: ['load-file', 'play', 'stop', 'change-mode'],

  setup(props, { emit }) {
    const fileInput = ref(null);

    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file) {
        emit('load-file', file);
      }
    };

    const triggerFileInput = () => {
      fileInput.value.click();
    };

    return {
      fileInput,
      handleFileChange,
      triggerFileInput,
      play: () => emit('play'),
      stop: () => emit('stop'),
      changeMode: (mode) => emit('change-mode', mode)
    };
  },

  template: `
    <div class="control-panel">
      <div class="control-section">
        <h3>🎵 音频文件</h3>
        <div class="control-group">
          <input
            ref="fileInput"
            type="file"
            accept="audio/*"
            @change="handleFileChange"
            style="display: none"
          />
          <button @click="triggerFileInput">选择文件</button>
          <div class="file-info">
            <span v-if="fileName">{{ fileName }}</span>
            <span v-else class="no-file">未选择文件</span>
          </div>
        </div>
      </div>

      <div class="control-section">
        <h3>▶️ 播放控制</h3>
        <div class="control-group">
          <button
            @click="play"
            :disabled="!audioLoaded || isPlaying"
          >
            播放
          </button>
          <button
            @click="stop"
            :disabled="!audioLoaded || !isPlaying"
          >
            停止
          </button>
          <div class="status" :class="isPlaying ? 'connected' : audioLoaded ? 'loading' : 'disconnected'">
            {{ isPlaying ? '播放中' : audioLoaded ? '已加载' : '未加载' }}
          </div>
        </div>
      </div>

      <div class="control-section">
        <h3>📊 状态监控</h3>
        <div class="status-panel">
          <div>状态: <span>{{ isPlaying ? '播放中' : audioLoaded ? '就绪' : '待机' }}</span></div>
          <div>文件: <span>{{ fileName ? '已选' : '无' }}</span></div>
        </div>
      </div>

      <div class="control-section">
        <h3>🔄 切换模式</h3>
        <div class="control-group">
          <button @click="changeMode('midi')">切换到 MIDI 模式</button>
          <button @click="changeMode('home')">返回主菜单</button>
        </div>
      </div>
    </div>
  `,

  styles: `
    <style scoped>
      .control-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 320px;
        background: rgba(20, 20, 30, 0.95);
        border-radius: 12px;
        padding: 20px;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-height: 90vh;
        overflow-y: auto;
        z-index: 100;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      .control-section {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .control-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .control-section h3 {
        font-size: 14px;
        margin-bottom: 12px;
        color: #61dafb;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .file-info {
        font-size: 12px;
        color: #e0e0e0;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        text-align: center;
        word-break: break-all;
      }

      .no-file {
        color: #888;
      }

      .status {
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        text-align: center;
        font-weight: 600;
      }

      .status.connected {
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
        border: 1px solid #2ecc71;
      }

      .status.disconnected {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
        border: 1px solid #e74c3c;
      }

      .status.loading {
        background: rgba(241, 196, 15, 0.2);
        color: #f1c40f;
        border: 1px solid #f1c40f;
      }

      .status-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        font-size: 12px;
      }

      .status-panel div {
        background: rgba(255, 255, 255, 0.05);
        padding: 6px;
        border-radius: 4px;
        text-align: center;
      }

      .status-panel span {
        color: #61dafb;
        font-weight: 700;
      }
    </style>
  `
};

// 音频视图主组件
export default {
  name: 'AudioView',
  components: {
    SpectrumCanvas,
    AudioControlPanel
  },
  emits: ['navigate'],

  setup(props, { emit }) {
    const { analyser, isPlaying, audioLoaded, fileName, loadAudioFile, play, stop } = useAudio();

    return {
      analyser,
      isPlaying,
      audioLoaded,
      fileName,
      loadAudioFile,
      play,
      stop,
      navigateTo: (view) => emit('navigate', view)
    };
  },

  template: `
    <div class="audio-view">
      <!-- 画布区域 -->
      <div class="canvas-container">
        <SpectrumCanvas
          :analyser="analyser"
          :is-playing="isPlaying"
        />
      </div>

      <!-- 控制面板 -->
      <AudioControlPanel
        :is-playing="isPlaying"
        :audio-loaded="audioLoaded"
        :file-name="fileName"
        @load-file="loadAudioFile"
        @play="play"
        @stop="stop"
        @change-mode="navigateTo"
      />
    </div>
  `,

  styles: `
    <style scoped>
      .audio-view {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      .canvas-container {
        flex: 1;
        position: relative;
        background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%);
        overflow: hidden;
      }
    </style>
  `
};
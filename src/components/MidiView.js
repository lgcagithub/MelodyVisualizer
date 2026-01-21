/**
 * MIDI 模式组件
 * 集成 MIDI 输入、可视化和键盘显示
 */

import { ref, onMounted, onUnmounted } from '../vue.esm-browser.js';
import { useMIDI } from '../composables/useMIDI.js';
import { useVisualizer } from '../composables/useVisualizer.js';

// 键盘显示组件
const KeyboardDisplay = {
  name: 'KeyboardDisplay',
  props: {
    activeNotes: {
      type: Object,
      required: true
    }
  },
  emits: ['note-click'],

  setup(props, { emit }) {
    const keyboardElement = ref(null);
    const keyMap = new Map();

    // 创建键盘
    const createKeyboard = () => {
      if (!keyboardElement.value) return;

      const startNote = 48; // C3
      const endNote = 72;   // C5

      for (let note = startNote; note <= endNote; note++) {
        const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
        const keyElement = document.createElement('div');

        if (isBlack) {
          keyElement.className = 'key-black';
          const prevWhiteKey = keyboardElement.value.lastElementChild;
          if (prevWhiteKey) {
            const offset = prevWhiteKey.offsetLeft + prevWhiteKey.offsetWidth - 10;
            keyElement.style.left = offset + 'px';
          }
        } else {
          keyElement.className = 'key-white';
        }

        keyElement.dataset.note = note;
        keyElement.addEventListener('click', () => emit('note-click', note));
        keyboardElement.value.appendChild(keyElement);
        keyMap.set(note, keyElement);
      }
    };

    // 高亮按键
    const updateHighlights = () => {
      keyMap.forEach((keyElement, note) => {
        if (props.activeNotes.has(note)) {
          keyElement.classList.add('active');
        } else {
          keyElement.classList.remove('active');
        }
      });
    };

    onMounted(() => {
      createKeyboard();
    });

    // 监听 activeNotes 变化
    onMounted(() => {
      const observer = new MutationObserver(updateHighlights);
      if (keyboardElement.value) {
        observer.observe(keyboardElement.value, { attributes: true, childList: true, subtree: true });
      }
      return () => observer.disconnect();
    });

    return {
      keyboardElement
    };
  },

  template: `
    <div class="keyboard-container">
      <div class="keyboard" ref="keyboardElement"></div>
    </div>
  `,

  styles: `
    <style scoped>
      .keyboard-container {
        height: 120px;
        background: rgba(20, 20, 30, 0.9);
        border-top: 2px solid #333;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        backdrop-filter: blur(10px);
      }

      .keyboard {
        display: flex;
        gap: 2px;
        height: 80px;
        position: relative;
      }

      .key-white {
        width: 30px;
        height: 80px;
        background: linear-gradient(to bottom, #f5f5f5, #e0e0e0);
        border: 1px solid #333;
        border-radius: 0 0 4px 4px;
        cursor: pointer;
        transition: all 0.1s ease;
        position: relative;
      }

      .key-white.active {
        background: linear-gradient(to bottom, #ff6b6b, #ee5a24);
        transform: translateY(2px);
        box-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
      }

      .key-black {
        width: 20px;
        height: 50px;
        background: linear-gradient(to bottom, #222, #000);
        border: 1px solid #000;
        border-radius: 0 0 3px 3px;
        position: absolute;
        top: 0;
        z-index: 2;
        cursor: pointer;
        transition: all 0.1s ease;
      }

      .key-black.active {
        background: linear-gradient(to bottom, #ff4757, #c44569);
        box-shadow: 0 0 15px rgba(255, 71, 87, 0.9);
      }
    </style>
  `
};

// 控制面板组件
const ControlPanel = {
  name: 'ControlPanel',
  props: {
    mode: {
      type: String,
      default: 'midi'
    },
    isConnected: {
      type: Boolean,
      default: false
    },
    devices: {
      type: Array,
      default: () => []
    },
    activeNotesCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['refresh-midi', 'select-device', 'change-mode'],

  setup(props, { emit }) {
    const selectedDevice = ref('');

    const refreshMIDI = () => {
      emit('refresh-midi');
    };

    const selectDevice = (deviceId) => {
      selectedDevice.value = deviceId;
      emit('select-device', deviceId);
    };

    const changeMode = (mode) => {
      emit('change-mode', mode);
    };

    return {
      selectedDevice,
      refreshMIDI,
      selectDevice,
      changeMode
    };
  },

  template: `
    <div class="control-panel">
      <div class="control-section">
        <h3>🎹 MIDI设备</h3>
        <div class="control-group">
          <select
            :value="selectedDevice"
            @change="selectDevice($event.target.value)"
          >
            <option value="">选择MIDI设备...</option>
            <option
              v-for="device in devices"
              :key="device.id"
              :value="device.id"
            >
              {{ device.name }}
            </option>
          </select>
          <button @click="refreshMIDI">刷新设备</button>
          <div class="status" :class="isConnected ? 'connected' : 'disconnected'">
            {{ isConnected ? '已连接' : '未连接' }}
          </div>
        </div>
      </div>

      <div class="control-section">
        <h3>📊 状态监控</h3>
        <div class="status-panel">
          <div>活跃音符: <span>{{ activeNotesCount }}</span></div>
          <div>状态: <span>{{ isConnected ? '运行中' : '待机' }}</span></div>
        </div>
      </div>

      <div class="control-section">
        <h3>🔄 切换模式</h3>
        <div class="control-group">
          <button @click="changeMode('audio')">切换到音频分析</button>
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

      select {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
      }

      select:focus {
        outline: none;
        border-color: #61dafb;
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

// MIDI 视图主组件
export default {
  name: 'MidiView',
  components: {
    KeyboardDisplay,
    ControlPanel
  },
  emits: ['navigate'],

  setup(props, { emit }) {
    const canvasContainer = ref(null);
    const { isConnected, activeNotes, devices, connectDevice, refreshMIDI } = useMIDI();
    const { initThree, createExplosion, animate, destroy } = useVisualizer();

    onMounted(() => {
      if (canvasContainer.value) {
        initThree(canvasContainer.value);
        animate();
      }
    });

    onUnmounted(() => {
      destroy();
    });

    // 监听音符变化，触发爆炸效果
    const prevActiveNotes = new Set();
    const checkForNewNotes = () => {
      activeNotes.forEach((noteData, note) => {
        if (!prevActiveNotes.has(note)) {
          createExplosion(note, noteData.velocity);
          prevActiveNotes.add(note);
        }
      });
      // 清理已释放的音符
      prevActiveNotes.forEach(note => {
        if (!activeNotes.has(note)) {
          prevActiveNotes.delete(note);
        }
      });
    };

    // 每帧检查新音符
    const intervalId = setInterval(checkForNewNotes, 50);

    onUnmounted(() => {
      clearInterval(intervalId);
    });

    const handleNoteClick = (note) => {
      // 手动触发音符效果
      createExplosion(note, 100);
    };

    return {
      canvasContainer,
      isConnected,
      activeNotes,
      devices,
      activeNotesCount: activeNotes.size,
      connectDevice,
      refreshMIDI,
      handleNoteClick,
      navigateTo: (view) => emit('navigate', view)
    };
  },

  template: `
    <div class="midi-view">
      <!-- 画布区域 -->
      <div class="canvas-container" ref="canvasContainer"></div>

      <!-- 键盘显示 -->
      <KeyboardDisplay
        :active-notes="activeNotes"
        @note-click="handleNoteClick"
      />

      <!-- 控制面板 -->
      <ControlPanel
        mode="midi"
        :is-connected="isConnected"
        :devices="devices"
        :active-notes-count="activeNotesCount"
        @refresh-midi="refreshMIDI"
        @select-device="connectDevice"
        @change-mode="navigateTo"
      />
    </div>
  `,

  styles: `
    <style scoped>
      .midi-view {
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
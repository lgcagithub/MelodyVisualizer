<template>
  <div class="midi-view">
    <Navigation @go-back="emit('navigate', 'home')" />

    <div class="midi-container">
      <!-- 标题 -->
      <div class="header">
        <h2>🎹 MIDI 模式</h2>
        <p>连接电钢琴，实时查看烟花可视化效果</p>
      </div>

      <!-- MIDI 控制面板 -->
      <div class="control-panel">
        <div class="control-group">
          <label>MIDI 设备</label>
          <div class="device-controls">
            <select v-model="selectedDevice" @change="handleDeviceChange" :disabled="!isConnected">
              <option value="">选择 MIDI 设备...</option>
              <option v-for="device in devices" :key="device.id" :value="device.id">
                {{ device.name }}
              </option>
            </select>
            <button class="refresh-btn" @click="refreshMIDI">刷新</button>
          </div>
          <div class="status" :class="{ connected: isConnected, disconnected: !isConnected }">
            {{ isConnected ? '✓ 已连接' : '✗ 未连接' }}
          </div>
        </div>

        <div class="control-group">
          <label>活跃音符: {{ activeNotes.size }}</label>
        </div>
      </div>

      <!-- 3D 可视化容器 -->
      <div class="canvas-container" ref="canvasContainer"></div>

      <!-- 键盘显示 -->
      <div class="keyboard-container">
        <div class="keyboard" ref="keyboardRef"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useMIDI } from '../composables/useMIDI';
import { useVisualizer } from '../composables/useVisualizer';
import Navigation from './Navigation.vue';

const emit = defineEmits<{
  (e: 'navigate', view: string): void;
}>();

const { isConnected, devices, activeNotes, connectDevice, refreshMIDI, noteToFrequency } = useMIDI();
const { initThree, createExplosion, animate } = useVisualizer();

const selectedDevice = ref('');
const canvasContainer = ref<HTMLElement>();
const keyboardRef = ref<HTMLElement>();

// 监听活跃音符变化，触发烟花效果
watch(
  () => activeNotes.size,
  (newSize, oldSize) => {
    if (newSize > oldSize) {
      // 有新音符按下
      const newNotes = Array.from(activeNotes.entries()).filter(
        ([note]) => !Array.from(activeNotes.entries()).some(([n]) => n === note)
      );
      // 简化：直接使用当前所有活跃音符
      activeNotes.forEach((data, note) => {
        createExplosion(note, data.velocity);
      });
    }
  }
);

// 监听活跃音符变化，更新键盘高亮
watch(
  () => Array.from(activeNotes.keys()),
  (noteNumbers) => {
    updateKeyboardHighlight(noteNumbers);
  }
);

const handleDeviceChange = () => {
  if (selectedDevice.value) {
    connectDevice(selectedDevice.value);
  }
};

// 创建虚拟键盘
const createKeyboard = () => {
  if (!keyboardRef.value) return;

  keyboardRef.value.innerHTML = '';
  const startNote = 48; // C3
  const endNote = 72; // C5

  for (let note = startNote; note <= endNote; note++) {
    const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
    const keyElement = document.createElement('div');

    if (isBlack) {
      keyElement.className = 'key-black';
      const prevWhiteKey = keyboardRef.value.lastElementChild;
      if (prevWhiteKey) {
        const offset = (prevWhiteKey as HTMLElement).offsetLeft + (prevWhiteKey as HTMLElement).offsetWidth - 10;
        keyElement.style.left = offset + 'px';
      }
    } else {
      keyElement.className = 'key-white';
    }

    keyElement.dataset.note = note.toString();
    keyboardRef.value.appendChild(keyElement);
  }
};

// 更新键盘高亮
const updateKeyboardHighlight = (activeNoteNumbers: number[]) => {
  if (!keyboardRef.value) return;

  const keys = keyboardRef.value.querySelectorAll('[data-note]');
  keys.forEach((key) => {
    const note = parseInt(key.getAttribute('data-note') || '0');
    if (activeNoteNumbers.includes(note)) {
      key.classList.add('active');
    } else {
      key.classList.remove('active');
    }
  });
};

onMounted(() => {
  if (canvasContainer.value) {
    initThree(canvasContainer.value);
    animate();
  }
  createKeyboard();
});
</script>

<style scoped>
.midi-view {
  min-height: 100vh;
  padding-top: 80px;
}

.midi-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 20px;
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

.device-controls {
  display: flex;
  gap: 8px;
}

.device-controls select {
  flex: 1;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 14px;
}

.refresh-btn {
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(102, 126, 234, 0.5);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.refresh-btn:hover {
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

.canvas-container {
  width: 100%;
  max-width: 1200px;
  height: 500px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
}

.keyboard-container {
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: center;
}

.keyboard {
  position: relative;
  height: 120px;
  display: flex;
  gap: 2px;
}

.key-white {
  width: 40px;
  height: 120px;
  background: linear-gradient(180deg, #fff 0%, #e0e0e0 100%);
  border: 1px solid #333;
  border-radius: 0 0 4px 4px;
  position: relative;
  z-index: 1;
  transition: all 0.1s;
}

.key-white.active {
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.8);
}

.key-black {
  width: 28px;
  height: 75px;
  background: linear-gradient(180deg, #333 0%, #000 100%);
  border: 1px solid #000;
  border-radius: 0 0 3px 3px;
  position: absolute;
  z-index: 2;
  transition: all 0.1s;
}

.key-black.active {
  background: linear-gradient(180deg, #764ba2 0%, #667eea 100%);
  box-shadow: 0 0 20px rgba(118, 75, 162, 0.8);
}
</style>

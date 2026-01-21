/**
 * MIDI 组合式函数
 * 封装 Web MIDI API 的所有逻辑
 */

import { ref, reactive, onUnmounted } from '../vue.esm-browser.js';

export function useMIDI() {
  const isConnected = ref(false);
  const devices = ref([]);
  const activeNotes = reactive(new Map());
  let midiAccess = null;
  let midiInput = null;

  // 更新设备列表
  const updateDeviceList = () => {
    if (!midiAccess) return;

    devices.value = [];
    midiAccess.inputs.forEach((input) => {
      devices.value.push({
        id: input.id,
        name: input.name
      });
    });

    if (devices.value.length === 0) {
      isConnected.value = false;
    }
  };

  // 初始化 MIDI
  const initMIDI = async () => {
    try {
      midiAccess = await navigator.requestMIDIAccess();
      updateDeviceList();
      midiAccess.onstatechange = updateDeviceList;
      return true;
    } catch (error) {
      console.error('MIDI 访问失败:', error);
      return false;
    }
  };

  // 连接设备
  const connectDevice = (deviceId) => {
    if (!midiAccess) return;

    // 断开之前的连接
    if (midiInput) {
      midiInput.onmidimessage = null;
    }

    const input = midiAccess.inputs.get(deviceId);
    if (input) {
      midiInput = input;
      input.onmidimessage = handleMIDIMessage;
      isConnected.value = true;
    }
  };

  // 处理 MIDI 消息
  const handleMIDIMessage = (message) => {
    const [status, note, velocity] = message.data;
    const command = status & 0xf0;

    // Note On (144-159)
    if (command === 144 && velocity > 0) {
      activeNotes.set(note, {
        velocity,
        timestamp: Date.now(),
        frequency: noteToFrequency(note)
      });
    }
    // Note Off (128-143) or Note On with velocity 0
    else if (command === 128 || (command === 144 && velocity === 0)) {
      activeNotes.delete(note);
    }
  };

  // MIDI 音符转频率
  const noteToFrequency = (note) => {
    // A4 = 69 = 440Hz
    return 440 * Math.pow(2, (note - 69) / 12);
  };

  // 刷新 MIDI
  const refreshMIDI = async () => {
    await initMIDI();
  };

  // 清理
  onUnmounted(() => {
    if (midiInput) {
      midiInput.onmidimessage = null;
    }
  });

  // 自动初始化
  initMIDI();

  return {
    isConnected,
    devices,
    activeNotes,
    initMIDI,
    connectDevice,
    refreshMIDI,
    noteToFrequency
  };
}
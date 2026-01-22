/**
 * MIDI 组合式函数
 * 处理 Web MIDI API 连接和消息解析
 */

import { ref, reactive, onUnmounted } from 'vue';

export interface NoteData {
  velocity: number;
  timestamp: number;
}

export interface MIDIDevice {
  id: string;
  name: string;
}

export function useMIDI() {
  const isConnected = ref(false);
  const devices = ref<MIDIDevice[]>([]);
  const activeNotes = reactive(new Map<number, NoteData>());

  let midiAccess: MIDIAccess | null = null;
  let midiInput: MIDIInput | null = null;

  /**
   * 更新设备列表
   */
  const updateDeviceList = () => {
    if (!midiAccess) return;

    devices.value = [];
    midiAccess.inputs.forEach((input) => {
      devices.value.push({ id: input.id, name: input.name ?? 'Unknown Device' });
    });

    if (devices.value.length === 0) {
      isConnected.value = false;
    }
  };

  /**
   * 初始化 MIDI 访问
   */
  const initMIDI = async (): Promise<boolean> => {
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

  /**
   * 连接 MIDI 设备
   */
  const connectDevice = (deviceId: string) => {
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

  /**
   * 处理 MIDI 消息
   */
  const handleMIDIMessage = (message: MIDIMessageEvent) => {
    const data = message.data;
    if (!data || data.length < 3) return;

    const status = data[0] ?? 0;
    const note = data[1] ?? 0;
    const velocity = data[2] ?? 0;
    const command = status & 0xf0;

    // Note On (144-159)
    if (command === 144 && velocity > 0) {
      activeNotes.set(note, { velocity, timestamp: Date.now() });
    }
    // Note Off (128-143) or Note On with velocity 0
    else if (command === 128 || (command === 144 && velocity === 0)) {
      activeNotes.delete(note);
    }
  };

  /**
   * 刷新 MIDI 设备列表
   */
  const refreshMIDI = async () => {
    await initMIDI();
  };

  /**
   * MIDI 音符转频率
   */
  const noteToFrequency = (note: number): number => {
    // A4 (69) = 440Hz
    return 440 * Math.pow(2, (note - 69) / 12);
  };

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
    connectDevice,
    refreshMIDI,
    noteToFrequency,
  };
}

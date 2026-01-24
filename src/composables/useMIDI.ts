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
  const hasAccess = ref(false);  // 已获得MIDI访问权限
  const isConnected = ref(false);  // 已连接到特定设备
  const devices = ref<MIDIDevice[]>([]);
  const activeNotes = reactive(new Map<number, NoteData>());
  const isLoading = ref(false);
  const error = ref<string | null>(null);

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
    isLoading.value = true;
    error.value = null;

    try {
      // 检查浏览器支持
      if (!navigator.requestMIDIAccess) {
        error.value = '您的浏览器不支持 Web MIDI API';
        return false;
      }

      midiAccess = await navigator.requestMIDIAccess();
      hasAccess.value = true;  // 已获得MIDI访问权限
      updateDeviceList();
      midiAccess.onstatechange = updateDeviceList;

      if (devices.value.length === 0) {
        error.value = '未检测到 MIDI 设备，请连接设备后重试';
      }

      return true;
    } catch (err) {
      console.error('MIDI 访问失败:', err);
      hasAccess.value = false;

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          error.value = 'MIDI 访问被拒绝，请允许浏览器访问 MIDI 设备';
        } else if (err.name === 'NotSupportedError') {
          error.value = '当前环境不支持 MIDI 访问（需要 HTTPS 或 localhost）';
        } else {
          error.value = `MIDI 访问失败: ${err.message}`;
        }
      } else {
        error.value = 'MIDI 初始化失败，请检查浏览器权限设置';
      }

      return false;
    } finally {
      isLoading.value = false;
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
      error.value = null;  // 清除错误信息
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

  return {
    hasAccess,
    isConnected,
    devices,
    activeNotes,
    isLoading,
    error,
    connectDevice,
    refreshMIDI,
    noteToFrequency,
  };
}

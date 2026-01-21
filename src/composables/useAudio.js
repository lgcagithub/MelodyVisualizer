/**
 * 音频组合式函数
 * 封装 Web Audio API 的所有逻辑
 */

import { ref, onUnmounted } from '../vue.esm-browser.js';

export function useAudio() {
  const audioContext = ref(null);
  const analyser = ref(null);
  const audioSource = ref(null);
  const audioElement = ref(null);
  const isPlaying = ref(false);
  const audioLoaded = ref(false);
  const fileName = ref('');

  // 初始化音频上下文
  const initAudio = async () => {
    if (audioContext.value) return true;

    try {
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
      analyser.value = audioContext.value.createAnalyser();
      analyser.value.fftSize = 2048;
      analyser.value.smoothingTimeConstant = 0.8;
      return true;
    } catch (error) {
      console.error('Web Audio API 初始化失败:', error);
      return false;
    }
  };

  // 加载音频文件
  const loadAudioFile = async (file) => {
    if (!audioContext.value) {
      await initAudio();
    }

    try {
      // 停止当前播放
      if (audioElement.value) {
        audioElement.value.pause();
        audioElement.value = null;
      }

      // 创建 URL
      const url = URL.createObjectURL(file);
      fileName.value = file.name;

      // 创建音频元素
      audioElement.value = new Audio(url);
      audioElement.value.crossOrigin = "anonymous";

      // 创建媒体源
      if (audioSource.value) {
        audioSource.value.disconnect();
      }

      audioSource.value = audioContext.value.createMediaElementSource(audioElement.value);
      audioSource.value.connect(analyser.value);
      analyser.value.connect(audioContext.value.destination);

      // 监听音频结束
      audioElement.value.addEventListener('ended', () => {
        stop();
      });

      audioLoaded.value = true;
      return true;
    } catch (error) {
      console.error('音频加载失败:', error);
      return false;
    }
  };

  // 播放
  const play = () => {
    if (!audioElement.value) return;

    if (audioContext.value.state === 'suspended') {
      audioContext.value.resume();
    }

    audioElement.value.play();
    isPlaying.value = true;
  };

  // 停止
  const stop = () => {
    if (!audioElement.value) return;

    audioElement.value.pause();
    audioElement.value.currentTime = 0;
    isPlaying.value = false;
  };

  // 暂停
  const pause = () => {
    if (!audioElement.value) return;

    audioElement.value.pause();
    isPlaying.value = false;
  };

  // 获取频谱数据
  const getFrequencyData = () => {
    if (!analyser.value) return null;

    const bufferLength = analyser.value.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.value.getByteFrequencyData(dataArray);
    return dataArray;
  };

  // 获取波形数据
  const getWaveformData = () => {
    if (!analyser.value) return null;

    const bufferLength = analyser.value.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.value.getByteTimeDomainData(dataArray);
    return dataArray;
  };

  // 清理
  onUnmounted(() => {
    if (audioElement.value) {
      audioElement.value.pause();
      audioElement.value = null;
    }
    if (audioSource.value) {
      audioSource.value.disconnect();
    }
    if (audioContext.value) {
      audioContext.value.close();
    }
  });

  return {
    analyser,
    isPlaying,
    audioLoaded,
    fileName,
    loadAudioFile,
    play,
    pause,
    stop,
    getFrequencyData,
    getWaveformData
  };
}
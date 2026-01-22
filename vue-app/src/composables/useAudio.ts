/**
 * 音频组合式函数
 * 处理 Web Audio API 音频分析
 */

import { ref, onUnmounted } from 'vue';

export function useAudio() {
  const audioContext = ref<AudioContext | null>(null);
  const analyser = ref<AnalyserNode | null>(null);
  const audioSource = ref<MediaElementAudioSourceNode | null>(null);
  const audioElement = ref<HTMLAudioElement | null>(null);
  const isPlaying = ref(false);
  const audioLoaded = ref(false);
  const fileName = ref('');

  /**
   * 初始化音频上下文
   */
  const initAudio = async (): Promise<boolean> => {
    if (audioContext.value) return true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext.value = new AudioContextClass();
      analyser.value = audioContext.value.createAnalyser();
      analyser.value.fftSize = 2048;
      analyser.value.smoothingTimeConstant = 0.8;
      return true;
    } catch (error) {
      console.error('Web Audio API 初始化失败:', error);
      return false;
    }
  };

  /**
   * 加载音频文件
   */
  const loadAudioFile = async (file: File): Promise<boolean> => {
    if (!audioContext.value) await initAudio();

    try {
      if (audioElement.value) {
        audioElement.value.pause();
      }

      const url = URL.createObjectURL(file);
      fileName.value = file.name;

      audioElement.value = new Audio(url);
      audioElement.value.crossOrigin = 'anonymous';

      if (audioSource.value) {
        audioSource.value.disconnect();
      }

      audioSource.value = audioContext.value!.createMediaElementSource(audioElement.value);
      audioSource.value.connect(analyser.value!);
      analyser.value!.connect(audioContext.value!.destination);

      audioElement.value.addEventListener('ended', () => stop());

      audioLoaded.value = true;
      return true;
    } catch (error) {
      console.error('音频加载失败:', error);
      return false;
    }
  };

  /**
   * 播放
   */
  const play = () => {
    if (!audioElement.value) return;

    if (audioContext.value?.state === 'suspended') {
      audioContext.value.resume();
    }

    audioElement.value.play();
    isPlaying.value = true;
  };

  /**
   * 暂停
   */
  const pause = () => {
    if (!audioElement.value) return;
    audioElement.value.pause();
    isPlaying.value = false;
  };

  /**
   * 停止
   */
  const stop = () => {
    if (!audioElement.value) return;
    audioElement.value.pause();
    audioElement.value.currentTime = 0;
    isPlaying.value = false;
  };

  /**
   * 获取频谱数据
   */
  const getFrequencyData = (): Uint8Array | null => {
    if (!analyser.value) return null;

    const bufferLength = analyser.value.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.value.getByteFrequencyData(dataArray);
    return dataArray;
  };

  /**
   * 获取波形数据
   */
  const getWaveformData = (): Uint8Array | null => {
    if (!analyser.value) return null;

    const bufferLength = analyser.value.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.value.getByteTimeDomainData(dataArray);
    return dataArray;
  };

  onUnmounted(() => {
    if (audioElement.value) {
      audioElement.value.pause();
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
    getWaveformData,
  };
}

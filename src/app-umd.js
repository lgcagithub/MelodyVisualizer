/**
 * MelodyVisualizer - Vue 3 版本 (UMD)
 * 主应用入口 - 使用全局 Vue 构建版本
 */

const { createApp, ref, computed, onMounted, onUnmounted, watch, reactive } = Vue;

// ==================== 组合式函数 ====================

// MIDI 组合式函数
function useMIDI() {
  const isConnected = ref(false);
  const devices = ref([]);
  const activeNotes = reactive(new Map());
  let midiAccess = null;
  let midiInput = null;

  const updateDeviceList = () => {
    if (!midiAccess) return;
    devices.value = [];
    midiAccess.inputs.forEach((input) => {
      devices.value.push({ id: input.id, name: input.name });
    });
    if (devices.value.length === 0) isConnected.value = false;
  };

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

  const connectDevice = (deviceId) => {
    if (!midiAccess) return;
    if (midiInput) midiInput.onmidimessage = null;
    const input = midiAccess.inputs.get(deviceId);
    if (input) {
      midiInput = input;
      input.onmidimessage = handleMIDIMessage;
      isConnected.value = true;
    }
  };

  const handleMIDIMessage = (message) => {
    const [status, note, velocity] = message.data;
    const command = status & 0xf0;
    if (command === 144 && velocity > 0) {
      activeNotes.set(note, { velocity, timestamp: Date.now() });
    } else if (command === 128 || (command === 144 && velocity === 0)) {
      activeNotes.delete(note);
    }
  };

  const refreshMIDI = async () => {
    await initMIDI();
  };

  onUnmounted(() => {
    if (midiInput) midiInput.onmidimessage = null;
  });

  initMIDI();

  return { isConnected, devices, activeNotes, connectDevice, refreshMIDI };
}

// 音频组合式函数
function useAudio() {
  const audioContext = ref(null);
  const analyser = ref(null);
  const audioSource = ref(null);
  const audioElement = ref(null);
  const isPlaying = ref(false);
  const audioLoaded = ref(false);
  const fileName = ref('');

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

  const loadAudioFile = async (file) => {
    if (!audioContext.value) await initAudio();
    try {
      if (audioElement.value) audioElement.value.pause();
      const url = URL.createObjectURL(file);
      fileName.value = file.name;
      audioElement.value = new Audio(url);
      audioElement.value.crossOrigin = "anonymous";
      if (audioSource.value) audioSource.value.disconnect();
      audioSource.value = audioContext.value.createMediaElementSource(audioElement.value);
      audioSource.value.connect(analyser.value);
      analyser.value.connect(audioContext.value.destination);
      audioElement.value.addEventListener('ended', () => stop());
      audioLoaded.value = true;
      return true;
    } catch (error) {
      console.error('音频加载失败:', error);
      return false;
    }
  };

  const play = () => {
    if (!audioElement.value) return;
    if (audioContext.value.state === 'suspended') audioContext.value.resume();
    audioElement.value.play();
    isPlaying.value = true;
  };

  const stop = () => {
    if (!audioElement.value) return;
    audioElement.value.pause();
    audioElement.value.currentTime = 0;
    isPlaying.value = false;
  };

  onUnmounted(() => {
    if (audioElement.value) audioElement.value.pause();
    if (audioSource.value) audioSource.value.disconnect();
    if (audioContext.value) audioContext.value.close();
  });

  return { analyser, isPlaying, audioLoaded, fileName, loadAudioFile, play, stop };
}

// 可视化组合式函数
function useVisualizer() {
  let scene = null, camera = null, renderer = null, particles = [];
  let geometry = null, material = null, points = null, animationId = null;

  const createParticleTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  };

  const hsvToRgb = (h, s, v) => {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: return new THREE.Color(v, t, p);
      case 1: return new THREE.Color(q, v, p);
      case 2: return new THREE.Color(p, v, t);
      case 3: return new THREE.Color(p, q, v);
      case 4: return new THREE.Color(t, p, v);
      case 5: return new THREE.Color(v, p, q);
    }
  };

  const getColorForNote = (note) => {
    const hue = ((note % 12) / 12) * 360;
    return hsvToRgb(hue / 360, 1.0, 0.85);
  };

  const initThree = (container) => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 50;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.5;
    container.appendChild(renderer.domElement);
    const particleTexture = createParticleTexture();
    geometry = new THREE.BufferGeometry();
    material = new THREE.PointsMaterial({
      size: 1.8, transparent: true, opacity: 1.0, vertexColors: true,
      blending: THREE.AdditiveBlending, map: particleTexture, alphaMap: particleTexture,
      depthWrite: false, sizeAttenuation: true, fog: false
    });
    window.addEventListener('resize', onResize);
  };

  const createExplosion = (note, velocity) => {
    if (!scene) return;
    const particleCount = Math.floor(50 * (velocity / 127));
    const x = ((note % 12) - 6) * 5;
    const y = (Math.floor(note / 12) - 5) * 3;
    const z = (Math.random() - 0.5) * 10;
    const color = getColorForNote(note);
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8 * (velocity / 127),
          (Math.random() - 0.5) * 0.8 * (velocity / 127),
          (Math.random() - 0.5) * 0.8 * (velocity / 127)
        ),
        life: 1.0,
        decay: 0.003 + Math.random() * 0.005,
        color: color,
        size: 1.2 + (velocity / 127) * 2.5,
        trail: []
      });
    }
    if (particles.length > 5000) particles = particles.slice(-3000);
  };

  const update = () => {
    if (!scene || !camera || !renderer) return;
    const positions = [], colors = [], sizes = [];
    particles = particles.filter(particle => {
      particle.trail.push({ x: particle.position.x, y: particle.position.y, z: particle.position.z });
      if (particle.trail.length > 5) particle.trail.shift();
      particle.position.add(particle.velocity);
      particle.velocity.multiplyScalar(0.998);
      particle.velocity.y -= 0.001;
      particle.life -= particle.decay;
      if (particle.life > 0) {
        positions.push(particle.position.x, particle.position.y, particle.position.z);
        const brightnessMultiplier = 1.5;
        colors.push(
          Math.min(1.0, particle.color.r * particle.life * brightnessMultiplier),
          Math.min(1.0, particle.color.g * particle.life * brightnessMultiplier),
          Math.min(1.0, particle.color.b * particle.life * brightnessMultiplier)
        );
        sizes.push(particle.size * particle.life);
        for (let i = 0; i < particle.trail.length; i++) {
          const trailPoint = particle.trail[i];
          const trailProgress = i / particle.trail.length;
          positions.push(trailPoint.x, trailPoint.y, trailPoint.z);
          colors.push(particle.color.r, particle.color.g, particle.color.b);
          sizes.push(particle.size * (0.3 + trailProgress * 0.5));
        }
        return true;
      }
      return false;
    });
    if (geometry && positions.length > 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      if (points) scene.remove(points);
      const tempMaterial = material.clone();
      tempMaterial.size = 1.2;
      points = new THREE.Points(geometry, tempMaterial);
      scene.add(points);
    }
    renderer.render(scene, camera);
  };

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    update();
  };

  const onResize = () => {
    if (!camera || !renderer) return;
    const container = renderer.domElement.parentElement;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };

  const destroy = () => {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    if (renderer) renderer.dispose();
  };

  onUnmounted(() => destroy());

  return { initThree, createExplosion, animate, destroy };
}

// ==================== 组件 ====================

// 导航组件
const Navigation = {
  name: 'Navigation',
  emits: ['go-back'],
  setup(props, { emit }) {
    const goBack = () => emit('go-back');
    return { goBack };
  },
  template: `
    <div class="navigation">
      <button class="back-btn" @click="goBack">← 返回主菜单</button>
    </div>
  `
};

// 主菜单组件
const AppHome = {
  name: 'AppHome',
  emits: ['navigate'],
  setup(props, { emit }) {
    const navigateTo = (view) => emit('navigate', view);
    return { navigateTo };
  },
  template: `
    <div class="home-view">
      <div class="hero">
        <h1>🎵 MelodyVisualizer</h1>
        <p>选择一个模式开始体验</p>
      </div>
      <div class="menu-buttons">
        <button class="menu-btn midi-btn" @click="navigateTo('midi')">
          <span class="icon">🎹</span>
          <span class="text">MIDI 模式</span>
          <span class="desc">连接电钢琴，实时可视化</span>
        </button>
        <button class="menu-btn audio-btn" @click="navigateTo('audio')">
          <span class="icon">🎵</span>
          <span class="text">音频分析</span>
          <span class="desc">上传音频，查看频谱和波形</span>
        </button>
      </div>
    </div>
  `
};

// 键盘显示组件
const KeyboardDisplay = {
  name: 'KeyboardDisplay',
  props: { activeNotes: { type: Object, required: true } },
  emits: ['note-click'],
  setup(props, { emit }) {
    const keyboardElement = ref(null);
    const keyMap = new Map();

    const createKeyboard = () => {
      if (!keyboardElement.value) return;
      const startNote = 48, endNote = 72;
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
      // 定期更新高亮
      setInterval(updateHighlights, 50);
    });

    return { keyboardElement };
  },
  template: `
    <div class="keyboard-container">
      <div class="keyboard" ref="keyboardElement"></div>
    </div>
  `
};

// MIDI 控制面板
const MidiControlPanel = {
  name: 'MidiControlPanel',
  props: {
    isConnected: { type: Boolean, default: false },
    devices: { type: Array, default: () => [] },
    activeNotesCount: { type: Number, default: 0 }
  },
  emits: ['refresh-midi', 'select-device', 'change-mode'],
  setup(props, { emit }) {
    const selectedDevice = ref('');
    return {
      selectedDevice,
      refreshMIDI: () => emit('refresh-midi'),
      selectDevice: (deviceId) => { selectedDevice.value = deviceId; emit('select-device', deviceId); },
      changeMode: (mode) => emit('change-mode', mode)
    };
  },
  template: `
    <div class="control-panel">
      <div class="control-section">
        <h3>🎹 MIDI设备</h3>
        <div class="control-group">
          <select :value="selectedDevice" @change="selectDevice($event.target.value)">
            <option value="">选择MIDI设备...</option>
            <option v-for="device in devices" :key="device.id" :value="device.id">{{ device.name }}</option>
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
  `
};

// MIDI 视图组件
const MidiView = {
  name: 'MidiView',
  components: { KeyboardDisplay, MidiControlPanel },
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

    onUnmounted(() => destroy());

    const prevActiveNotes = new Set();
    const checkForNewNotes = () => {
      activeNotes.forEach((noteData, note) => {
        if (!prevActiveNotes.has(note)) {
          createExplosion(note, noteData.velocity);
          prevActiveNotes.add(note);
        }
      });
      prevActiveNotes.forEach(note => {
        if (!activeNotes.has(note)) prevActiveNotes.delete(note);
      });
    };
    setInterval(checkForNewNotes, 50);

    const handleNoteClick = (note) => createExplosion(note, 100);

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
      <div class="canvas-container" ref="canvasContainer"></div>
      <KeyboardDisplay :active-notes="activeNotes" @note-click="handleNoteClick" />
      <MidiControlPanel
        :is-connected="isConnected"
        :devices="devices"
        :active-notes-count="activeNotesCount"
        @refresh-midi="refreshMIDI"
        @select-device="connectDevice"
        @change-mode="navigateTo"
      />
    </div>
  `
};

// 频谱画布组件
const SpectrumCanvas = {
  name: 'SpectrumCanvas',
  props: { analyser: { type: Object, default: null }, isPlaying: { type: Boolean, default: false } },
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

      const width = canvas.value.width, height = canvas.value.height;
      const bufferLength = props.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      props.analyser.getByteFrequencyData(dataArray);

      ctx.value.clearRect(0, 0, width, height);

      const barCount = 64, barWidth = width / barCount, step = Math.floor(bufferLength / barCount);
      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step], percent = value / 255, barHeight = percent * height * 0.8;
        const x = i * barWidth, y = height - barHeight;
        const gradient = ctx.value.createLinearGradient(x, y, x, height);
        const hue = (i / barCount) * 360;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 40%, 0.3)`);
        ctx.value.fillStyle = gradient;
        ctx.value.fillRect(x + 2, y, barWidth - 4, barHeight);
        if (barHeight > 5) {
          ctx.value.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
          ctx.value.fillRect(x + 2, y, barWidth - 4, 3);
        }
      }

      const waveBufferLength = props.analyser.fftSize;
      const waveDataArray = new Uint8Array(waveBufferLength);
      props.analyser.getByteTimeDomainData(waveDataArray);
      ctx.value.beginPath();
      ctx.value.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.value.lineWidth = 2;
      const sliceWidth = width / waveDataArray.length;
      let x = 0;
      for (let i = 0; i < waveDataArray.length; i++) {
        const v = waveDataArray[i] / 128.0, y = v * height / 2;
        if (i === 0) ctx.value.moveTo(x, y); else ctx.value.lineTo(x, y);
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
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    });

    watch(() => props.isPlaying, (newVal) => {
      if (newVal && !animationId) draw();
    });

    return { canvas };
  },
  template: `<canvas ref="canvas"></canvas>`
};

// 音频控制面板
const AudioControlPanel = {
  name: 'AudioControlPanel',
  props: {
    isPlaying: { type: Boolean, default: false },
    audioLoaded: { type: Boolean, default: false },
    fileName: { type: String, default: '' }
  },
  emits: ['load-file', 'play', 'stop', 'change-mode'],
  setup(props, { emit }) {
    const fileInput = ref(null);
    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file) emit('load-file', file);
    };
    const triggerFileInput = () => fileInput.value.click();
    return {
      fileInput, handleFileChange, triggerFileInput,
      play: () => emit('play'), stop: () => emit('stop'),
      changeMode: (mode) => emit('change-mode', mode)
    };
  },
  template: `
    <div class="control-panel">
      <div class="control-section">
        <h3>🎵 音频文件</h3>
        <div class="control-group">
          <input ref="fileInput" type="file" accept="audio/*" @change="handleFileChange" style="display: none" />
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
          <button @click="play" :disabled="!audioLoaded || isPlaying">播放</button>
          <button @click="stop" :disabled="!audioLoaded || !isPlaying">停止</button>
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
  `
};

// 音频视图组件
const AudioView = {
  name: 'AudioView',
  components: { SpectrumCanvas, AudioControlPanel },
  emits: ['navigate'],
  setup(props, { emit }) {
    const { analyser, isPlaying, audioLoaded, fileName, loadAudioFile, play, stop } = useAudio();
    return { analyser, isPlaying, audioLoaded, fileName, loadAudioFile, play, stop, navigateTo: (view) => emit('navigate', view) };
  },
  template: `
    <div class="audio-view">
      <div class="canvas-container">
        <SpectrumCanvas :analyser="analyser" :is-playing="isPlaying" />
      </div>
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
  `
};

// ==================== 主应用 ====================

const App = {
  components: { Navigation, AppHome, MidiView, AudioView },
  setup() {
    const currentView = ref('home');
    const currentViewComponent = computed(() => {
      const views = { home: 'AppHome', midi: 'MidiView', audio: 'AudioView' };
      return views[currentView.value] || 'AppHome';
    });
    const navigateTo = (view) => { currentView.value = view; };
    return { currentView, currentViewComponent, navigateTo };
  },
  template: `
    <div id="app">
      <Navigation v-if="currentView !== 'home'" @go-back="navigateTo('home')" />
      <component :is="currentViewComponent" @navigate="navigateTo" />
    </div>
  `
};

// 创建并挂载应用
const app = createApp(App);
app.mount('#app');
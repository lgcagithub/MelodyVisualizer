/**
 * MelodyVisualizer - 音乐可视化主程序
 * 包含MIDI输入、音频分析、Three.js烟花可视化等功能
 */

// ==================== 核心状态管理 ====================
const AppState = {
    midiAccess: null,
    midiInput: null,
    audioContext: null,
    analyser: null,
    audioSource: null,
    audioBuffer: null,
    audioElement: null,
    activeNotes: new Map(), // 音符状态: noteNumber -> {velocity, timestamp}
    visualizationMode: 'fireworks', // fireworks, spectrum, keyboard, combined
    colorMode: 'rainbow',
    particleCount: 50,
    explosionIntensity: 1.0,
    fps: 0,
    spectrumPeak: 0,
    isPlaying: false,
    threeScene: null,
    threeRenderer: null,
    threeCamera: null,
    particles: [],
    lastFrameTime: 0,
    frameCount: 0,
    fpsUpdateTime: 0
};

// ==================== MIDI模块 ====================
const MIDIModule = {
    async init() {
        try {
            AppState.midiAccess = await navigator.requestMIDIAccess();
            this.updateDeviceList();
            AppState.midiAccess.onstatechange = () => this.updateDeviceList();
            return true;
        } catch (error) {
            console.error('MIDI访问失败:', error);
            this.updateStatus('Web MIDI API不支持或需要HTTPS', 'disconnected');
            return false;
        }
    },

    updateDeviceList() {
        const select = document.getElementById('midi-select');
        select.innerHTML = '<option value="">选择MIDI设备...</option>';

        if (!AppState.midiAccess) return;

        AppState.midiAccess.inputs.forEach((input) => {
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            select.appendChild(option);
        });

        if (AppState.midiAccess.inputs.size === 0) {
            this.updateStatus('未检测到MIDI设备', 'disconnected');
        }
    },

    connectDevice(deviceId) {
        if (!AppState.midiAccess) return;

        // 断开之前的连接
        if (AppState.midiInput) {
            AppState.midiInput.onmidimessage = null;
        }

        const input = AppState.midiAccess.inputs.get(deviceId);
        if (input) {
            AppState.midiInput = input;
            input.onmidimessage = (message) => this.handleMIDIMessage(message);
            this.updateStatus(`已连接: ${input.name}`, 'connected');
            hideHelpTip();
        }
    },

    handleMIDIMessage(message) {
        const [status, note, velocity] = message.data;
        const command = status & 0xf0;
        const channel = status & 0x0f;

        // Note On (144-159)
        if (command === 144 && velocity > 0) {
            this.handleNoteOn(note, velocity);
        }
        // Note Off (128-143) or Note On with velocity 0
        else if (command === 128 || (command === 144 && velocity === 0)) {
            this.handleNoteOff(note);
        }
    },

    handleNoteOn(note, velocity) {
        const noteData = {
            note,
            velocity,
            timestamp: Date.now(),
            frequency: this.noteToFrequency(note)
        };

        AppState.activeNotes.set(note, noteData);

        // 触发可视化
        if (AppState.visualizationMode === 'fireworks' || AppState.visualizationMode === 'combined') {
            Fireworks.createExplosion(note, velocity);
        }

        if (AppState.visualizationMode === 'keyboard' || AppState.visualizationMode === 'combined') {
            KeyboardDisplay.highlightKey(note, true);
        }

        updateActiveNotesDisplay();
    },

    handleNoteOff(note) {
        AppState.activeNotes.delete(note);
        KeyboardDisplay.highlightKey(note, false);
        updateActiveNotesDisplay();
    },

    noteToFrequency(note) {
        // MIDI note to frequency: A4 = 69 = 440Hz
        return 440 * Math.pow(2, (note - 69) / 12);
    },

    updateStatus(message, type) {
        const status = document.getElementById('midi-status');
        status.textContent = message;
        status.className = `status ${type}`;
    }
};

// ==================== 音频分析模块 ====================
const AudioModule = {
    async init() {
        try {
            AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            AppState.analyser = AppState.audioContext.createAnalyser();
            AppState.analyser.fftSize = 2048;
            AppState.analyser.smoothingTimeConstant = 0.8;
            return true;
        } catch (error) {
            console.error('Web Audio API初始化失败:', error);
            return false;
        }
    },

    async loadAudioFile(file) {
        if (!AppState.audioContext) await this.init();

        try {
            this.updateStatus('加载中...', 'loading');

            // 创建URL
            const url = URL.createObjectURL(file);

            // 创建音频元素
            if (AppState.audioElement) {
                AppState.audioElement.pause();
                AppState.audioElement = null;
            }

            AppState.audioElement = new Audio(url);
            AppState.audioElement.crossOrigin = "anonymous";

            // 创建媒体源
            if (AppState.audioSource) {
                AppState.audioSource.disconnect();
            }

            AppState.audioSource = AppState.audioContext.createMediaElementSource(AppState.audioElement);
            AppState.audioSource.connect(AppState.analyser);
            AppState.analyser.connect(AppState.audioContext.destination);

            // 监听音频结束
            AppState.audioElement.addEventListener('ended', () => {
                this.stop();
            });

            this.updateStatus('就绪', 'connected');
            document.getElementById('play-audio').disabled = false;
            hideHelpTip();

            return true;
        } catch (error) {
            console.error('音频加载失败:', error);
            this.updateStatus('加载失败', 'disconnected');
            return false;
        }
    },

    play() {
        if (!AppState.audioElement) return;

        if (AppState.audioContext.state === 'suspended') {
            AppState.audioContext.resume();
        }

        AppState.audioElement.play();
        AppState.isPlaying = true;
        document.getElementById('play-audio').disabled = true;
        document.getElementById('stop-audio').disabled = false;
        this.updateStatus('播放中', 'connected');
    },

    stop() {
        if (!AppState.audioElement) return;

        AppState.audioElement.pause();
        AppState.isPlaying = false;
        document.getElementById('play-audio').disabled = false;
        document.getElementById('stop-audio').disabled = true;
        this.updateStatus('已停止', 'loading');
    },

    getFrequencyData() {
        if (!AppState.analyser) return null;

        const bufferLength = AppState.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        AppState.analyser.getByteFrequencyData(dataArray);

        // 计算频谱峰值
        let peak = 0;
        for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > peak) peak = dataArray[i];
        }
        AppState.spectrumPeak = peak;

        return dataArray;
    },

    getWaveformData() {
        if (!AppState.analyser) return null;

        const bufferLength = AppState.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        AppState.analyser.getByteTimeDomainData(dataArray);
        return dataArray;
    },

    updateStatus(message, type) {
        const status = document.getElementById('audio-status');
        status.textContent = message;
        status.className = `status ${type}`;
    }
};

// ==================== Three.js烟花引擎 ====================
const Fireworks = {
    scene: null,
    camera: null,
    renderer: null,
    particles: [],
    geometry: null,
    material: null,

    // 创建圆形粒子纹理（带辉光）
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;  // 更高的分辨率
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 多层径向渐变 - 创建辉光效果
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');        // 核心：完全不透明
        gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');   // 内辉光
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');    // 中辉光
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');    // 外辉光
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');   // 边缘辉光
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');        // 完全透明

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        // 添加额外的辉光层
        const glowGradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 80);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, 256, 256);

        return new THREE.CanvasTexture(canvas);
    },

    init() {
        const container = document.getElementById('canvas-container');

        // 场景 - 移除雾化，让粒子更明亮
        this.scene = new THREE.Scene();

        // 相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;

        // 渲染器 - 启用抗锯齿和alpha，使用sRGB颜色空间增强亮度
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        // 启用色调映射，让亮色更鲜艳 - 增强Bloom效果
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 2.5; // 增加曝光到2.5，增强泛光效果
        container.appendChild(this.renderer.domElement);

        // 创建圆形粒子纹理
        const particleTexture = this.createParticleTexture();

        // 粒子几何体和材质 - 使用圆形纹理
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.PointsMaterial({
            size: 1.8,                    // 增大粒子尺寸
            transparent: true,
            opacity: 1.0,                 // 最大不透明度
            vertexColors: true,
            blending: THREE.AdditiveBlending,  // 自发光混合（模拟泛光）
            map: particleTexture,         // 圆形纹理
            alphaMap: particleTexture,    // 使用alpha贴图
            depthWrite: false,            // 不写入深度，避免遮挡
            sizeAttenuation: true,        // 远小近大
            fog: false                    // 禁用雾化，保持亮度
        });

        // 窗口大小调整
        window.addEventListener('resize', () => this.onResize());

        // 存储到AppState
        AppState.threeScene = this.scene;
        AppState.threeRenderer = this.renderer;
        AppState.threeCamera = this.camera;

        return true;
    },

    createExplosion(note, velocity) {
        if (!this.scene) return;

        const intensity = AppState.explosionIntensity;
        const particleCount = Math.floor(AppState.particleCount * (velocity / 127) * intensity);

        // 根据音符确定位置和颜色
        const x = ((note % 12) - 6) * 5; // 横向分布
        const y = (Math.floor(note / 12) - 5) * 3; // 纵向分布
        const z = (Math.random() - 0.5) * 10;

        const color = this.getColorForNote(note);

        // 创建粒子 - 更温和的物理效果
        for (let i = 0; i < particleCount; i++) {
            const particle = {
                position: new THREE.Vector3(x, y, z),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.8 * (velocity / 127),  // 初始速度降低到0.8
                    (Math.random() - 0.5) * 0.8 * (velocity / 127),
                    (Math.random() - 0.5) * 0.8 * (velocity / 127)
                ),
                life: 1.0,
                decay: 0.003 + Math.random() * 0.005,  // 更低的衰减速度，粒子存活更久
                color: color,
                size: 1.2 + (velocity / 127) * 2.5,   // 增大粒子尺寸
                trail: []  // 拖尾历史位置
            };

            this.particles.push(particle);
        }

        // 限制粒子总数
        if (this.particles.length > 5000) {
            this.particles = this.particles.slice(-3000);
        }
    },

    // HSV转RGB - 保持饱和度同时提升亮度
    hsvToRgb(h, s, v) {
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
    },

    getColorForNote(note) {
        const mode = AppState.colorMode;

        if (mode === 'rainbow') {
            // 使用HSV色彩空间 - 饱和度1.0，亮度0.85，保持高饱和度
            const hue = ((note % 12) / 12) * 360;
            return this.hsvToRgb(hue / 360, 1.0, 0.85);
        } else if (mode === 'fire') {
            const t = (note % 12) / 12;
            // 火焰模式 - 使用HSV保持饱和度
            const hue = 0.05 + t * 0.1; // 红色到橙黄色
            return this.hsvToRgb(hue, 1.0, 0.9);
        } else if (mode === 'ocean') {
            const t = (note % 12) / 12;
            // 海洋模式 - 使用HSV保持饱和度
            const hue = 0.55 + t * 0.15; // 青色到蓝色
            return this.hsvToRgb(hue, 1.0, 0.85);
        } else if (mode === 'neon') {
            const hues = [0.83, 0.5, 0.15, 0.33]; // 品红、青、黄、绿
            const hue = hues[Math.floor((note % 12) / 3)];
            return this.hsvToRgb(hue, 1.0, 0.9); // 高饱和度，高亮度
        }

        return new THREE.Color(1, 1, 1);
    },

    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return new THREE.Color(r, g, b);
    },

    update() {
        if (!this.scene || !this.camera || !this.renderer) return;

        // 更新粒子
        const positions = [];
        const colors = [];
        const sizes = [];

        this.particles = this.particles.filter(particle => {
            // 记录拖尾历史位置（最多5个点）
            particle.trail.push({
                x: particle.position.x,
                y: particle.position.y,
                z: particle.position.z
            });
            if (particle.trail.length > 5) {
                particle.trail.shift();
            }

            particle.position.add(particle.velocity);
            particle.velocity.multiplyScalar(0.998); // 更温和的阻力
            particle.velocity.y -= 0.001; // 极小的重力
            particle.life -= particle.decay;

            if (particle.life > 0) {
                // 添加当前粒子位置
                positions.push(particle.position.x, particle.position.y, particle.position.z);

                // 增强颜色亮度 - 使用AdditiveBlending时，颜色会叠加
                const brightnessMultiplier = 1.5; // 增强亮度
                colors.push(
                    Math.min(1.0, particle.color.r * particle.life * brightnessMultiplier),
                    Math.min(1.0, particle.color.g * particle.life * brightnessMultiplier),
                    Math.min(1.0, particle.color.b * particle.life * brightnessMultiplier)
                );
                sizes.push(particle.size * particle.life);

                // 添加拖尾点（透明度逐渐降低，使用独立的拖尾颜色计算）
                for (let i = 0; i < particle.trail.length; i++) {
                    const trailPoint = particle.trail[i];
                    const trailProgress = i / particle.trail.length;

                    positions.push(trailPoint.x, trailPoint.y, trailPoint.z);
                    // 拖尾使用原始颜色值，避免乘以life导致黑色
                    colors.push(
                        particle.color.r,
                        particle.color.g,
                        particle.color.b
                    );
                    // 拖尾尺寸：从大到小，避免黑色
                    sizes.push(particle.size * (0.3 + trailProgress * 0.5));
                }

                return true;
            }
            return false;
        });

        // 更新几何体
        if (this.geometry && positions.length > 0) {
            this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            // 创建点云
            if (this.points) {
                this.scene.remove(this.points);
            }

            const tempMaterial = this.material.clone();
            tempMaterial.size = 1.2; // 稍微增大尺寸
            this.points = new THREE.Points(this.geometry, tempMaterial);
            this.scene.add(this.points);
        }

        // 渲染
        this.renderer.render(this.scene, this.camera);
    },

    onResize() {
        const container = document.getElementById('canvas-container');
        if (this.camera && this.renderer) {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
};

// ==================== 键盘显示模块 ====================
const KeyboardDisplay = {
    keyboardElement: null,
    keyMap: new Map(), // note -> keyElement

    init() {
        this.keyboardElement = document.getElementById('keyboard');
        this.createKeyboard();
        return true;
    },

    createKeyboard() {
        // 创建C3到C5的键盘范围 (48-72)
        const startNote = 48; // C3
        const endNote = 72;   // C5

        for (let note = startNote; note <= endNote; note++) {
            const isBlack = this.isBlackKey(note);
            const keyElement = document.createElement('div');

            if (isBlack) {
                keyElement.className = 'key-black';
                // 黑键的位置需要偏移
                const prevWhiteKey = this.keyboardElement.lastElementChild;
                if (prevWhiteKey) {
                    const offset = prevWhiteKey.offsetLeft + prevWhiteKey.offsetWidth - 10;
                    keyElement.style.left = offset + 'px';
                }
            } else {
                keyElement.className = 'key-white';
            }

            keyElement.dataset.note = note;
            this.keyboardElement.appendChild(keyElement);
            this.keyMap.set(note, keyElement);
        }
    },

    isBlackKey(note) {
        // MIDI音符转钢琴键：C, C#, D, D#, E, F, F#, G, G#, A, A#, B
        const noteInOctave = note % 12;
        // 黑键是：C#, D#, F#, G#, A# (1, 3, 6, 8, 10)
        return [1, 3, 6, 8, 10].includes(noteInOctave);
    },

    highlightKey(note, active) {
        const key = this.keyMap.get(note);
        if (key) {
            if (active) {
                key.classList.add('active');
            } else {
                key.classList.remove('active');
            }
        }
    }
};

// ==================== 频谱可视化模块 ====================
const SpectrumVisualizer = {
    canvas: null,
    ctx: null,
    isActive: false,

    init() {
        const container = document.getElementById('canvas-container');

        // 创建Canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';

        container.appendChild(this.canvas);
        this.resize();

        window.addEventListener('resize', () => this.resize());
        return true;
    },

    resize() {
        const container = document.getElementById('canvas-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    },

    draw() {
        if (!this.ctx || !AppState.analyser) return;

        const frequencyData = AudioModule.getFrequencyData();
        if (!frequencyData) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        // 清空
        ctx.clearRect(0, 0, width, height);

        // 绘制频谱
        const barCount = 64;
        const barWidth = width / barCount;
        const step = Math.floor(frequencyData.length / barCount);

        for (let i = 0; i < barCount; i++) {
            const value = frequencyData[i * step];
            const percent = value / 255;
            const barHeight = percent * height * 0.8;

            const x = i * barWidth;
            const y = height - barHeight;

            // 渐变颜色
            const gradient = ctx.createLinearGradient(x, y, x, height);
            const hue = (i / barCount) * 360;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 40%, 0.3)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

            // 顶部高光
            if (barHeight > 5) {
                ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
                ctx.fillRect(x + 2, y, barWidth - 4, 3);
            }
        }

        // 绘制波形
        const waveformData = AudioModule.getWaveformData();
        if (waveformData) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;

            const sliceWidth = width / waveformData.length;
            let x = 0;

            for (let i = 0; i < waveformData.length; i++) {
                const v = waveformData[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.stroke();
        }
    }
};

// ==================== UI控制模块 ====================
const UIController = {
    init() {
        // MIDI控制
        document.getElementById('refresh-midi').addEventListener('click', () => {
            MIDIModule.init();
        });

        document.getElementById('midi-select').addEventListener('change', (e) => {
            if (e.target.value) {
                MIDIModule.connectDevice(e.target.value);
            }
        });

        // 音频控制
        document.getElementById('audio-file').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await AudioModule.loadAudioFile(file);
            }
        });

        document.getElementById('play-audio').addEventListener('click', () => {
            AudioModule.play();
        });

        document.getElementById('stop-audio').addEventListener('click', () => {
            AudioModule.stop();
        });

        // 模式切换
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                AppState.visualizationMode = e.target.id.replace('mode-', '');
                updateVisualizationMode();
            });
        });

        // 参数调节
        document.getElementById('particle-count').addEventListener('input', (e) => {
            AppState.particleCount = parseInt(e.target.value);
            document.getElementById('particle-value').textContent = e.target.value;
        });

        document.getElementById('explosion-intensity').addEventListener('input', (e) => {
            AppState.explosionIntensity = parseFloat(e.target.value);
            document.getElementById('intensity-value').textContent = e.target.value;
        });

        document.getElementById('color-mode').addEventListener('change', (e) => {
            AppState.colorMode = e.target.value;
        });
    }
};

// ==================== 主循环 ====================
function animate(currentTime) {
    requestAnimationFrame(animate);

    // FPS计算
    if (currentTime - AppState.fpsUpdateTime > 1000) {
        AppState.fps = AppState.frameCount;
        AppState.frameCount = 0;
        AppState.fpsUpdateTime = currentTime;
        document.getElementById('fps-counter').textContent = AppState.fps;
    }
    AppState.frameCount++;

    // 根据模式更新可视化
    if (AppState.visualizationMode === 'fireworks' || AppState.visualizationMode === 'combined') {
        if (AppState.threeRenderer && AppState.threeScene && AppState.threeCamera) {
            Fireworks.update();
        }
    }

    if (AppState.visualizationMode === 'spectrum' || AppState.visualizationMode === 'combined') {
        if (SpectrumVisualizer.canvas && SpectrumVisualizer.ctx) {
            SpectrumVisualizer.draw();
        }
    }

    // 更新频谱峰值显示
    document.getElementById('spectrum-peak').textContent = AppState.spectrumPeak;
}

// ==================== 辅助函数 ====================
function updateActiveNotesDisplay() {
    document.getElementById('active-notes').textContent = AppState.activeNotes.size;
}

function updateVisualizationMode() {
    const mode = AppState.visualizationMode;

    // 显示/隐藏Three.js画布
    if (AppState.threeRenderer) {
        AppState.threeRenderer.domElement.style.display =
            (mode === 'fireworks' || mode === 'combined') ? 'block' : 'none';
    }

    // 显示/隐藏频谱Canvas
    if (SpectrumVisualizer.canvas) {
        SpectrumVisualizer.canvas.style.display =
            (mode === 'spectrum' || mode === 'combined') ? 'block' : 'none';
    }

    // 键盘总是显示
    document.getElementById('keyboard-container').style.display = 'flex';
}

function hideHelpTip() {
    const tip = document.getElementById('help-tip');
    if (tip) {
        tip.style.opacity = '0';
        tip.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => tip.style.display = 'none', 300);
    }
}

// ==================== 初始化 ====================
async function init() {
    console.log('🎵 MelodyVisualizer 初始化中...');

    // 初始化UI
    UIController.init();

    // 初始化键盘显示
    KeyboardDisplay.init();

    // 初始化Three.js烟花
    Fireworks.init();

    // 初始化频谱可视化
    SpectrumVisualizer.init();

    // 初始化音频上下文（需要用户交互）
    document.addEventListener('click', async () => {
        if (!AppState.audioContext) {
            await AudioModule.init();
        }
    }, { once: true });

    // 启动主循环
    requestAnimationFrame(animate);

    console.log('✅ MelodyVisualizer 初始化完成');
    console.log('💡 提示：连接电钢琴或上传音频文件开始体验');
}

// 页面加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 导出到全局（用于调试）
window.MelodyVisualizer = {
    AppState,
    MIDIModule,
    AudioModule,
    Fireworks,
    KeyboardDisplay,
    SpectrumVisualizer
};

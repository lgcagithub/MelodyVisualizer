/**
 * 可视化组合式函数
 * 基于 Three.js 的 3D 烟花效果
 */

import { onUnmounted, ref } from 'vue';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  decay: number;
  color: THREE.Color;
  size: number;
  trail: Array<{ x: number; y: number; z: number }>;
}

export function useVisualizer() {
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let particles: Particle[] = [];
  let geometry: THREE.BufferGeometry | null = null;
  let material: THREE.PointsMaterial | null = null;
  let points: THREE.Points | null = null;
  let animationId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let resizeTimeout: number | null = null;

  /**
   * 创建粒子纹理（带辉光效果）
   */
  const createParticleTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // 多层径向渐变 - 创建辉光效果
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

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
  };

  /**
   * HSV 转 RGB
   */
  const hsvToRgb = (h: number, s: number, v: number): THREE.Color => {
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
      default: return new THREE.Color(1, 1, 1);
    }
  };

  /**
   * 根据音符获取颜色（彩虹配色）
   */
  const getColorForNote = (note: number): THREE.Color => {
    const hue = ((note % 12) / 12) * 360;
    return hsvToRgb(hue / 360, 1.0, 0.85);
  };

  /**
   * 初始化 Three.js 场景
   */
  const initThree = (container: HTMLElement) => {
    // 场景
    scene = new THREE.Scene();

    // 相机
    camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 50;

    // 渲染器
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.5;

    container.appendChild(renderer.domElement);

    // 设置 ResizeObserver 监听容器大小变化
    setupResizeObserver(container);

    // 创建粒子纹理
    const particleTexture = createParticleTexture();

    // 粒子几何体和材质
    geometry = new THREE.BufferGeometry();
    material = new THREE.PointsMaterial({
      size: 1.8,
      transparent: true,
      opacity: 1.0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      map: particleTexture,
      alphaMap: particleTexture,
      depthWrite: false,
      sizeAttenuation: true,
      fog: false,
    });

    // 窗口大小调整
    window.addEventListener('resize', onResize);
  };

  /**
   * 创建爆炸效果
   */
  const createExplosion = (note: number, velocity: number) => {
    if (!scene) return;

    const intensity = 1.0; // 爆炸强度
    const particleCount = Math.floor(50 * (velocity / 127) * intensity);

    // 根据音符确定位置和颜色
    const x = ((note % 12) - 6) * 5; // 横向分布
    const y = (Math.floor(note / 12) - 5) * 3; // 纵向分布
    const z = (Math.random() - 0.5) * 10;

    const color = getColorForNote(note);

    // 创建粒子
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
        trail: [],
      });
    }

    // 限制粒子总数
    if (particles.length > 5000) {
      particles = particles.slice(-3000);
    }
  };

  /**
   * 更新和渲染
   */
  const update = () => {
    if (!scene || !camera || !renderer) return;

    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    particles = particles.filter((particle) => {
      // 记录拖尾历史位置（最多5个点）
      particle.trail.push({
        x: particle.position.x,
        y: particle.position.y,
        z: particle.position.z,
      });
      if (particle.trail.length > 5) {
        particle.trail.shift();
      }

      particle.position.add(particle.velocity);
      particle.velocity.multiplyScalar(0.998); // 阻力
      particle.velocity.y -= 0.001; // 重力
      particle.life -= particle.decay;

      if (particle.life > 0) {
        // 添加当前粒子位置
        positions.push(particle.position.x, particle.position.y, particle.position.z);

        // 增强颜色亮度
        const brightnessMultiplier = 1.5;
        colors.push(
          Math.min(1.0, particle.color.r * particle.life * brightnessMultiplier),
          Math.min(1.0, particle.color.g * particle.life * brightnessMultiplier),
          Math.min(1.0, particle.color.b * particle.life * brightnessMultiplier)
        );

        sizes.push(particle.size * particle.life);

        // 添加拖尾点
        for (let i = 0; i < particle.trail.length; i++) {
          const trailPoint = particle.trail[i];
          if (!trailPoint) continue;
          const trailProgress = i / particle.trail.length;

          positions.push(trailPoint.x, trailPoint.y, trailPoint.z);
          colors.push(particle.color.r, particle.color.g, particle.color.b);
          sizes.push(particle.size * (0.3 + trailProgress * 0.5));
        }

        return true;
      }

      return false;
    });

    // 更新几何体
    if (geometry && positions.length > 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      if (points) {
        scene.remove(points);
      }

      const tempMaterial = material!.clone();
      tempMaterial.size = 1.2;
      points = new THREE.Points(geometry, tempMaterial);
      scene.add(points);
    }

    // 渲染
    renderer.render(scene, camera);
  };

  /**
   * 动画循环
   */
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    update();
  };

  /**
   * 窗口大小调整
   */
  const onResize = () => {
    if (!camera || !renderer) return;

    const container = renderer.domElement.parentElement;
    if (!container) return;

    // 防抖处理，避免频繁调整
    if (resizeTimeout) {
      cancelAnimationFrame(resizeTimeout);
    }

    resizeTimeout = requestAnimationFrame(() => {
      camera!.aspect = container.clientWidth / container.clientHeight;
      camera!.updateProjectionMatrix();
      renderer!.setSize(container.clientWidth, container.clientHeight);
      resizeTimeout = null;
    });
  };

  /**
   * 设置 ResizeObserver 监听容器大小变化
   */
  const setupResizeObserver = (container: HTMLElement) => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          onResize();
        }
      }
    });

    resizeObserver.observe(container);
  };

  /**
   * 清理资源
   */
  const destroy = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (resizeTimeout) {
      cancelAnimationFrame(resizeTimeout);
    }
    window.removeEventListener('resize', onResize);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (renderer) {
      renderer.dispose();
    }
  };

  onUnmounted(() => {
    destroy();
  });

  return {
    initThree,
    createExplosion,
    animate,
    destroy,
  };
}

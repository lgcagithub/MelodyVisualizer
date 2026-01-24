# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

MelodyVisualizer 是一个基于 Vue 3 + TypeScript + Vite 的音乐可视化工具，支持将电钢琴MIDI输入或音频文件转换为炫酷的视觉效果。

**主要功能：**
- MIDI输入实时可视化（连接电钢琴，实时显示按键并触发烟花效果）
- 音频文件分析（上传音频文件，显示频谱和波形）
- 多种可视化模式（烟花、频谱、键盘、组合模式）
- Three.js 3D效果（基于音符生成3D粒子爆炸效果）

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check

# 预览生产构建
npm run preview
```

### 浏览器要求
- **必须使用HTTPS**（Web MIDI API要求）
- 支持 Web MIDI API 和 Web Audio API 的现代浏览器
- Chrome/Edge 60+，Firefox 55+，Safari 11+

## 项目架构

### 技术栈
- **Vue 3.5.26** + TypeScript
- **Vite 7.3.1** - 构建工具
- **Three.js 0.182.0** - 3D渲染
- **无外部CSS框架** - 纯自定义CSS

### 核心模块

#### 1. **useMIDI** (`src/composables/useMIDI.ts`)
Web MIDI API封装，MIDI设备管理，音符事件处理。

**关键方法：**
- `init()` - 初始化MIDI访问
- `connectDevice()` - 连接MIDI设备
- `refreshMIDI()` - 刷新设备列表

#### 2. **useAudio** (`src/composables/useAudio.ts`)
Web Audio API封装，音频文件加载和播放，FFT频谱分析。

**关键方法：**
- `loadAudioFile()` - 加载音频文件
- `play()` / `pause()` / `stop()` - 播放控制
- `getFrequencyData()` - 获取频谱数据

#### 3. **useVisualizer** (`src/composables/useVisualizer.ts`)
Three.js 3D烟花引擎，粒子系统管理，ResizeObserver容器大小变化监听。

**关键方法：**
- `initThree()` - 初始化Three.js场景
- `createExplosion()` - 创建爆炸效果
- `animate()` - 动画循环
- `onResize()` - 响应式调整（防抖处理）

#### 4. **useResponsive** (`src/composables/useResponsive.ts`)
响应式状态管理，窗口大小跟踪和断点检测，UI元素可见性控制。

**关键方法：**
- `toggleControls()` - 切换控制面板可见性
- `toggleKeyboard()` - 切换键盘可见性（移动端）
- `showControls()` / `hideControls()` - 显示/隐藏控制面板

**断点定义：**
- 移动端：`< 768px`
- 平板端：`768px - 1024px`
- 桌面端：`> 1024px`

#### 5. **MidiView.vue** (`src/components/MidiView.vue`)
MIDI可视化主界面，全屏布局，可折叠控制面板，响应式键盘，移动端切换按钮。

**布局结构：**
```
┌─────────────────────────────────────────┐
│  Navigation (fixed top-left)            │
├─────────────────────────────────────────┤
│  Header (Title + Description)           │
├─────────────────────────────────────────┤
│  Control Panel (collapsible on mobile)  │
├─────────────────────────────────────────┤
│  Canvas Container (flex: 1, full height)│
│  - Desktop: height: calc(100vh - 180px) │
│  - Tablet: height: calc(100vh - 200px)  │
│  - Mobile: height: calc(100vh - 120px)  │
├─────────────────────────────────────────┤
│  Keyboard (Desktop: inline, Mobile: overlay)│
└─────────────────────────────────────────┘
```

#### 6. **AudioView.vue** (`src/components/AudioView.vue`)
音频分析可视化主界面，全屏布局，可折叠控制面板，移动端切换按钮。

**布局结构：**
```
┌─────────────────────────────────────────┐
│  Navigation (fixed top-left)            │
├─────────────────────────────────────────┤
│  Header (Title + Description)           │
├─────────────────────────────────────────┤
│  Control Panel (collapsible on mobile)  │
├─────────────────────────────────────────┤
│  Canvas Container (flex: 1, full height)│
│  - Desktop: height: calc(100vh - 140px) │
│  - Tablet: height: calc(100vh - 160px)  │
│  - Mobile: height: calc(100vh - 100px)  │
└─────────────────────────────────────────┘
```

#### 7. **Navigation.vue** (`src/components/Navigation.vue`)
顶部导航栏，移动端优化（更紧凑的布局，隐藏文字只显示图标）。

**响应式调整：**
- 桌面端：`top: 16px, left: 16px`
- 移动端：`top: 8px, left: 8px`，隐藏文字

### 数据流

```
MIDI输入/音频文件
    ↓
useMIDI / useAudio
    ↓
activeNotes / 频谱数据 (响应式状态)
    ↓
useVisualizer (Three.js) / AudioView (Canvas 2D)
    ↓
MidiView / AudioView 组件
    ↓
Three.js / Canvas 2D / DOM
    ↓
用户看到可视化效果
```

## 关键配置参数

### useVisualizer 配置
```typescript
{
    camera: { fov: 75, near: 0.1, far: 1000, position: { z: 50 } },
    renderer: { antialias: true, alpha: true, toneMapping: 'ACESFilmicToneMapping', toneMappingExposure: 2.5 },
    particles: { maxSize: 5000, autoTrim: 3000, sizeRange: [1.2, 3.7], physics: { gravity: 0.001, resistance: 0.998 } }
}
```

### useResponsive 配置
```typescript
// 断点定义
{ mobile: '< 768px', tablet: '768px - 1024px', desktop: '> 1024px' }

// 布局高度计算
// Desktop:  calc(100vh - 180px)  // MIDI
// Desktop:  calc(100vh - 140px)  // Audio
// Tablet:   calc(100vh - 200px)  // MIDI
// Tablet:   calc(100vh - 160px)  // Audio
// Mobile:   calc(100vh - 120px)  // MIDI
// Mobile:   calc(100vh - 100px)  // Audio
```

### 音频分析配置
- FFT大小：2048
- 平滑系数：0.8
- 频谱条数量：64
- Canvas DPI缩放：devicePixelRatio

## 开发指南

### 添加新的可视化模式
1. 在对应的View组件（MidiView/AudioView）中添加新的可视化模式
2. 在模板中添加对应的渲染逻辑
3. 在样式中添加对应的CSS类

### 修改颜色方案
编辑 `useVisualizer.ts` 中的 `getColorForNote()` 方法，调整彩虹配色的色相映射逻辑。

### 调整粒子效果
修改 `useVisualizer.ts` 中的配置：
```typescript
const MAX_PARTICLES = 5000;  // 粒子数量限制
const AUTO_TRIM_TO = 3000;   // 自动修剪阈值
const GRAVITY = 0.001;       // 重力参数
const RESISTANCE = 0.998;    // 阻力参数
```

### 处理新的MIDI事件
在 `useMIDI.ts` 中扩展对CC消息、程序变化等MIDI事件的处理。

### 添加响应式断点
在 `useResponsive.ts` 中添加新的断点：
```typescript
const updateBreakpoints = () => {
  const width = state.value.width;
  state.value.isMobile = width < 768;
  state.value.isTablet = width >= 768 && width <= 1024;
  state.value.isDesktop = width > 1024;
};
```

### 调整全屏布局
在组件的CSS中调整高度计算：
```css
.canvas-container {
  height: calc(100vh - [控制面板高度]px);
}
```

### 自定义控制面板
在组件中添加可折叠控制面板：
```vue
<div class="control-panel" :class="{ collapsed: !responsiveState.controlsVisible }">
  <!-- 控制内容 -->
</div>
```

### 添加移动端切换按钮
在模板中添加浮动按钮：
```vue
<div v-if="responsiveState.isMobile" class="mobile-controls">
  <button class="toggle-btn" @click="toggleControls">
    {{ responsiveState.controlsVisible ? '✕' : '⚙️' }}
  </button>
</div>
```

## 调试技巧

### 开发服务器调试
```bash
npm run dev        # 启动开发服务器
npm run build      # 查看构建输出
npm run type-check # 类型检查
```

### 浏览器控制台
```javascript
// 访问Vue应用实例（如果在main.ts中暴露）
window.VueApp

// 查看响应式状态
console.log(app.config.globalProperties.$responsive)
```

### Vue DevTools
1. 安装Vue DevTools浏览器扩展
2. 打开开发者工具 → Vue标签
3. 查看组件树和响应式状态
4. 检查props和emit事件

### 常见问题
1. **MIDI设备不显示**：检查是否使用HTTPS，刷新页面
2. **音频无法播放**：需要用户点击页面初始化AudioContext
3. **Three.js报错**：检查浏览器WebGL支持
4. **响应式问题**：检查useResponsive状态是否正确更新
5. **布局问题**：检查CSS flex布局和高度计算
6. **移动端显示异常**：检查断点检测和媒体查询

### 性能优化
- 使用ResizeObserver代替window.resize事件
- 防抖处理resize事件（150ms延迟）
- 移动端默认隐藏控制面板
- 桌面端键盘始终显示，移动端使用覆盖层
- Canvas DPI缩放（devicePixelRatio）

## 部署到GitHub Pages

```bash
# 1. 构建生产版本
npm run build

# 2. 将 dist/ 目录部署到 GitHub Pages
# 或使用 gh-pages 工具
npx gh-pages -d dist
```

## 未来扩展方向

- 添加录音功能（使用MediaRecorder API）
- 支持拖拽音频文件
- 添加预设可视化配置
- MIDI文件上传和播放
- 实时音频输入（麦克风）
- 导出可视化视频
- 添加Vue Router多页面支持
- 添加状态管理（Pinia/Vuex）
- Web Audio API合成器
- 多人协作模式
- 添加PWA支持

## 依赖说明

- **Vue 3.5.26**：前端框架
- **TypeScript**：类型系统
- **Vite 7.3.1**：构建工具
- **Three.js 0.182.0**：3D渲染
- **原生Web API**：Web MIDI API, Web Audio API, Canvas API
- **无外部CSS框架**：纯自定义CSS

## 开发规范

### 组合式函数
```typescript
// useResponsive.ts
export function useResponsive() {
  const state = ref<ResponsiveState>({...});
  const toggleControls = () => {...};
  return { state, toggleControls, ... };
}
```

### 响应式状态
```typescript
// 组件中使用
const { state: responsiveState, toggleControls } = useResponsive();

// 模板中使用
<div v-if="responsiveState.isMobile">
```

### 类型安全
```typescript
interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  controlsVisible: boolean;
  keyboardVisible: boolean;
}
```

## 手动测试要点

- 桌面端：可视化窗口填充整个页面
- 桌面端：控制面板始终可见
- 桌面端：键盘始终显示在底部
- 平板端：控制面板自动换行
- 平板端：可视化区域保持比例
- 移动端：控制面板可折叠
- 移动端：键盘使用覆盖层
- 移动端：浮动按钮可点击
- 窗口大小变化：布局自动调整
- 横竖屏切换：布局自动适应

## 浏览器兼容性

- Chrome/Edge 60+（支持ResizeObserver）
- Firefox 55+（支持ResizeObserver）
- Safari 11+（支持ResizeObserver）
- 移动端：iOS Safari, Chrome Mobile

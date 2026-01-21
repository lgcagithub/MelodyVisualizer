# MelodyVisualizer - Vue 3 版本 🎵

这是一个基于 **Vue 3** 重构的音乐可视化工具，支持 MIDI 输入和音频文件分析。

## ✨ 新特性

- **Vue 3 Composition API** - 响应式数据管理
- **组件化架构** - 清晰的代码组织
- **组合式函数** - 逻辑复用更优雅
- **主菜单导航** - MIDI 模式和音频分析模式分离
- **零构建工具** - 纯浏览器端运行

## 📁 项目结构

```
MelodyVisualizer/
├── index.html              # 主入口
├── style.css               # 全局样式
├── src/
│   ├── app.js              # Vue 应用入口
│   ├── components/
│   │   ├── AppHome.js      # 主菜单组件
│   │   ├── MidiView.js     # MIDI 模式组件
│   │   ├── AudioView.js    # 音频分析组件
│   │   └── Navigation.js   # 导航组件
│   └── composables/
│       ├── useMIDI.js      # MIDI 组合式函数
│       ├── useAudio.js     # 音频组合式函数
│       └── useVisualizer.js # 可视化组合式函数
└── main.js                 # 原始版本（保留）
```

## 🚀 快速开始

### 1. 启动本地服务器

由于使用 ES Modules，需要通过 HTTP(S) 访问：

```bash
# 使用 Node.js
npx serve .

# 或使用 Python
python -m http.server 8000

# 或使用 VSCode Live Server 扩展
```

### 2. 在浏览器中打开

访问 `http://localhost:8000` 或 `http://localhost:3000`

**注意**：Web MIDI API 需要 HTTPS 或 localhost

## 🎮 使用说明

### 主菜单

启动后会看到主菜单界面，提供两个选项：

1. **🎹 MIDI 模式**
   - 连接电钢琴或其他 MIDI 设备
   - 实时显示按键并触发烟花效果
   - 支持 C3-C5 范围的键盘显示

2. **🎵 音频分析**
   - 上传音频文件（MP3, WAV 等）
   - 实时显示频谱和波形
   - 彩虹色频谱可视化

### 导航

- **返回主菜单**：点击左上角的 "← 返回主菜单" 按钮
- **切换模式**：在控制面板中点击对应的切换按钮

## 🔧 功能模块

### MIDI 模式 (`MidiView.js`)

**组件：**
- `SpectrumCanvas` - 频谱可视化（未来扩展）
- `KeyboardDisplay` - 虚拟钢琴键盘
- `ControlPanel` - MIDI 控制面板

**功能：**
- MIDI 设备选择和连接
- 实时音符高亮
- 烟花爆炸效果
- 状态监控（活跃音符、连接状态）

### 音频分析模式 (`AudioView.js`)

**组件：**
- `SpectrumCanvas` - 频谱和波形可视化
- `AudioControlPanel` - 音频控制面板

**功能：**
- 音频文件上传
- 播放/停止控制
- 实时频谱显示（64 条）
- 波形显示
- 状态监控

### 组合式函数 (`composables/`)

#### `useMIDI.js`
```javascript
const {
  isConnected,      // 是否已连接
  devices,          // 设备列表
  activeNotes,      // 活跃音符 Map
  connectDevice,    // 连接设备
  refreshMIDI       // 刷新 MIDI
} = useMIDI();
```

#### `useAudio.js`
```javascript
const {
  analyser,         // 音频分析器
  isPlaying,        // 是否正在播放
  audioLoaded,      // 是否已加载
  fileName,         // 文件名
  loadAudioFile,    // 加载文件
  play,             // 播放
  stop              // 停止
} = useAudio();
```

#### `useVisualizer.js`
```javascript
const {
  initThree,        // 初始化 Three.js
  createExplosion,  // 创建爆炸效果
  animate,          // 动画循环
  destroy           // 清理资源
} = useVisualizer();
```

## 🎨 可视化效果

### 烟花效果
- **粒子数量**：50-200（基于音符力度）
- **颜色映射**：音符音高 → 色相（彩虹色）
- **物理模拟**：重力、阻力、拖尾
- **辉光效果**：AdditiveBlending 混合模式

### 频谱可视化
- **频谱条**：64 条彩色柱状图
- **颜色渐变**：从低频到高频的彩虹色
- **波形线**：白色半透明波形
- **顶部高光**：增强视觉效果

## 📊 状态监控

控制面板显示：
- **连接状态**：MIDI 设备或音频文件状态
- **活跃音符**：当前按下的键数量
- **文件信息**：音频文件名

## 🎯 组件化设计

### 组件通信

```
App (父组件)
├── Navigation (导航栏)
│   └── @go-back → navigateTo('home')
├── AppHome (主菜单)
│   └── @navigate → navigateTo(view)
├── MidiView (MIDI 模式)
│   └── @navigate → navigateTo(view)
└── AudioView (音频分析)
    └── @navigate → navigateTo(view)
```

### 数据流

```
MIDI 输入 / 音频文件
    ↓
useMIDI / useAudio (组合式函数)
    ↓
组件 props / reactive 状态
    ↓
子组件渲染
    ↓
用户看到可视化效果
```

## 🔧 扩展指南

### 添加新功能

1. **创建组合式函数** (`src/composables/`)
   ```javascript
   export function useNewFeature() {
     const state = ref(initialValue);
     // 逻辑...
     return { state, methods... };
   }
   ```

2. **创建组件** (`src/components/`)
   ```javascript
   export default {
     name: 'NewComponent',
     setup() {
       const { state } = useNewFeature();
       return { state };
     },
     template: `...`
   };
   ```

3. **在视图中使用**
   ```javascript
   import { useNewFeature } from '../composables/useNewFeature.js';
   import NewComponent from '../components/NewComponent.js';
   ```

### 添加新可视化模式

1. 在 `useVisualizer.js` 中添加新的渲染方法
2. 在 `MidiView.js` 或 `AudioView.js` 中添加对应的组件
3. 通过 props 控制显示/隐藏

## 🐛 常见问题

### 1. MIDI 设备不显示
- 确保使用 HTTPS 或 localhost
- 刷新页面
- 点击"刷新设备"按钮

### 2. 音频无法播放
- 需要用户点击页面初始化 AudioContext
- 选择音频文件后点击"播放"

### 3. Three.js 报错
- 检查浏览器 WebGL 支持
- 查看控制台错误信息

### 4. ES Modules 错误
- 确保使用 HTTP/HTTPS 访问
- 不要直接打开本地文件（file://）

## 📝 代码风格

### Vue 3 最佳实践

1. **使用 Composition API**
   ```javascript
   import { ref, reactive, computed } from 'vue';
   ```

2. **组合式函数命名**
   - 以 `use` 开头：`useMIDI`, `useAudio`
   - 返回响应式数据

3. **组件文件**
   - 使用 `.js` 扩展名（非 `.vue`）
   - 导出组件对象
   - 包含 `template`, `setup`, `styles`

4. **事件命名**
   - 子组件 → 父组件：`@navigate`, `@go-back`
   - 父组件 → 子组件：通过 props

## 🎯 与原版对比

| 特性 | 原版 (Vanilla JS) | Vue 3 版本 |
|------|-------------------|------------|
| **架构** | 单文件大模块 | 组件化 + 组合式函数 |
| **状态管理** | 全局对象 | 响应式 refs/reactives |
| **UI 更新** | 手动 DOM 操作 | 声明式模板 |
| **代码组织** | 按功能分区 | 按组件/功能模块化 |
| **学习曲线** | 简单直接 | 需要理解 Vue 3 概念 |
| **扩展性** | 中等 | 高（组件复用） |

## 🚀 未来扩展建议

### 短期
- [ ] 添加录音功能（MediaRecorder API）
- [ ] 支持拖拽音频文件
- [ ] 添加预设可视化配置

### 中期
- [ ] MIDI 文件上传和播放
- [ ] 实时音频输入（麦克风）
- [ ] 导出可视化视频

### 长期
- [ ] Web Audio API 合成器
- [ ] 多人协作模式
- [ ] 移动端适配和触摸支持

## 📚 参考资料

- [Vue 3 官方文档](https://vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Three.js 文档](https://threejs.org/docs/)

## 🎉 总结

Vue 3 版本提供了：
- ✅ 更清晰的代码组织
- ✅ 更好的可维护性
- ✅ 响应式数据管理
- ✅ 组件复用能力
- ✅ 零构建工具依赖

享受音乐可视化吧！🎹🎵
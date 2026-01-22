# MelodyVisualizer - Vue 3 + Vite 版本

基于 Vue 3 + TypeScript + Vite 重构的音乐可视化应用。

## 功能特性

- 🎹 **MIDI 实时可视化**：连接电钢琴，实时显示按键并触发烟花效果
- 🎵 **音频文件分析**：上传音频文件，显示频谱和波形
- 🎆 **3D 烟花效果**：基于 Three.js 的粒子爆炸效果
- 🌈 **彩虹配色**：根据音符音高映射到不同颜色
- 🎨 **现代化 UI**：Vue 3 组件化架构

## 快速开始

### 安装依赖

```sh
npm install
```

### 开发模式（热重载）

```sh
npm run dev
```

访问 http://localhost:5173

### 生产构建

```sh
npm run build
```

构建产物在 `dist/` 目录

### 预览生产构建

```sh
npm run preview
```

## 项目结构

```
vue-app/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── AppHome.vue      # 主菜单
│   │   ├── MidiView.vue     # MIDI 模式视图
│   │   ├── AudioView.vue    # 音频分析视图
│   │   └── Navigation.vue   # 导航栏
│   ├── composables/         # 组合式函数
│   │   ├── useMIDI.ts       # MIDI 处理逻辑
│   │   ├── useAudio.ts      # 音频分析逻辑
│   │   └── useVisualizer.ts # Three.js 可视化
│   ├── assets/              # 样式文件
│   ├── App.vue              # 根组件
│   └── main.ts              # 入口文件
├── dist/                    # 构建产物
└── package.json
```

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 下一代前端构建工具
- **Three.js** - 3D 图形库
- **Web MIDI API** - MIDI 设备连接
- **Web Audio API** - 音频分析

## 浏览器要求

- **必须使用 HTTPS**（Web MIDI API 要求）
- 支持 Web MIDI API 和 Web Audio API 的现代浏览器
- Chrome/Edge 60+，Firefox 55+，Safari 11+

## 开发说明

### 使用 VSCode

推荐安装以下扩展：
- [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) - Vue 3 官方扩展

### TypeScript 类型检查

```sh
npm run type-check
```

## 部署到 GitHub Pages

```bash
# 1. 构建生产版本
npm run build

# 2. 将 dist/ 目录部署到 GitHub Pages
# 或使用 gh-pages 工具
npx gh-pages -d dist
```

## 许可证

MIT

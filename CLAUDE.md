# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

MelodyVisualizer 是一个基于Web技术的音乐可视化工具，支持将电钢琴MIDI输入或音频文件转换为炫酷的视觉效果。主要功能包括：
- **MIDI输入实时可视化**：连接电钢琴，实时显示按键并触发烟花效果
- **音频文件分析**：上传音频文件，显示频谱和波形
- **多种可视化模式**：烟花、频谱、键盘、组合模式
- **Three.js 3D效果**：基于音符生成3D粒子爆炸效果

## 快速开始

### 开发环境
```bash
# 由于使用原生Web技术 + CDN，无需安装依赖
# 直接在浏览器中打开 index.html 即可

# 如果需要本地服务器（解决CORS问题）
npx serve .  # 或使用 Python: python -m http.server 8000
```

### 浏览器要求
- **必须使用HTTPS**（Web MIDI API要求）
- 支持 Web MIDI API 和 Web Audio API 的现代浏览器
- Chrome/Edge 60+，Firefox 55+，Safari 11+

## 项目架构

### 核心模块

#### 1. **MIDIModule** (`main.js` 行号约 30-90)
- 处理Web MIDI API连接
- 解析MIDI消息（Note On/Off）
- 将MIDI音符转换为频率
- 管理设备连接状态

**关键方法：**
- `init()` - 初始化MIDI访问
- `handleMIDIMessage()` - 处理MIDI消息
- `noteToFrequency()` - MIDI音符转频率

#### 2. **AudioModule** (`main.js` 行号约 92-170)
- Web Audio API音频分析
- 音频文件加载和播放
- FFT频谱分析
- 实时获取频率和波形数据

**关键方法：**
- `loadAudioFile()` - 加载音频文件
- `getFrequencyData()` - 获取频谱数据
- `getWaveformData()` - 获取波形数据

#### 3. **Fireworks** (`main.js` 行号约 172-320)
- Three.js 3D烟花引擎
- 基于音符生成粒子爆炸
- 支持多种颜色模式
- 粒子物理模拟（重力、阻力）

**关键方法：**
- `createExplosion()` - 创建爆炸效果
- `getColorForNote()` - 音符到颜色映射
- `update()` - 粒子更新和渲染

#### 4. **SpectrumVisualizer** (`main.js` 行号约 380-440)
- 2D频谱可视化
- 绘制柱状频谱和波形
- 使用Canvas 2D API

**关键方法：**
- `draw()` - 绘制频谱和波形
- `resize()` - 响应式调整

#### 5. **KeyboardDisplay** (`main.js` 行号约 340-380)
- 显示虚拟钢琴键盘
- 高亮当前按下的键
- 支持C3-C5范围（48-72 MIDI音符）

### UI控制 (`main.js` 行号约 442-480)

**控制面板功能：**
- MIDI设备选择和刷新
- 音频文件上传和播放控制
- 可视化模式切换
- 参数调节（粒子数量、爆炸强度、颜色模式）
- 状态监控（FPS、活跃音符、频谱峰值）

### 数据流

```
MIDI输入/音频文件
    ↓
MIDIModule / AudioModule
    ↓
AppState.activeNotes / 频谱数据
    ↓
Fireworks / SpectrumVisualizer / KeyboardDisplay
    ↓
Three.js / Canvas 2D / DOM
    ↓
用户看到可视化效果
```

## 关键配置参数

### AppState 配置
```javascript
{
    visualizationMode: 'fireworks',  // fireworks, spectrum, keyboard, combined
    colorMode: 'rainbow',            // rainbow, fire, ocean, neon
    particleCount: 50,               // 粒子数量 (10-200)
    explosionIntensity: 1.0,         // 爆炸强度 (0.5-3.0)
}
```

### Three.js 配置
- 相机位置：z=50
- 场景雾化：FogExp2(0x0a0a0a, 0.02)
- 粒子大小：0.8-2.3 (基于音符力度)
- 粒子总数限制：5000

### 音频分析配置
- FFT大小：2048
- 平滑系数：0.8
- 频谱条数量：64

## 开发指南

### 添加新的可视化模式
1. 在 `AppState.visualizationMode` 添加新选项
2. 在 `updateVisualizationMode()` 中处理显示逻辑
3. 在 `animate()` 主循环中添加渲染逻辑
4. 在UI中添加对应的按钮

### 修改颜色方案
编辑 `Fireworks.getColorForNote()` 方法，添加新的 `colorMode` 分支。

### 调整粒子效果
修改以下参数：
- `AppState.particleCount` - 粒子数量
- `AppState.explosionIntensity` - 爆炸强度
- `Fireworks.createExplosion()` 中的物理参数

### 处理新的MIDI事件
在 `MIDIModule.handleMIDIMessage()` 中扩展对CC消息、程序变化等MIDI事件的处理。

## 调试技巧

### 浏览器控制台
```javascript
// 访问全局对象
window.MelodyVisualizer

// 查看当前状态
console.log(MelodyVisualizer.AppState)

// 手动触发烟花
MelodyVisualizer.Fireworks.createExplosion(60, 100)
```

### 常见问题
1. **MIDI设备不显示**：检查是否使用HTTPS，刷新页面
2. **音频无法播放**：需要用户点击页面初始化AudioContext
3. **Three.js报错**：检查浏览器WebGL支持
4. **性能问题**：减少粒子数量，降低爆炸强度

## 部署到GitHub Pages

由于当前使用CDN依赖，可以直接部署：

```bash
# 1. 初始化git仓库（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 2. 创建gh-pages分支
git checkout --orphan gh-pages
git add .
git commit -m "Deploy to GitHub Pages"

# 3. 推送到GitHub
git remote add origin <your-repo-url>
git push -u origin gh-pages

# 4. 在GitHub仓库设置中启用Pages
```

## 扩展建议

### 短期扩展
- 添加录音功能（使用MediaRecorder API）
- 支持拖拽音频文件
- 添加预设可视化配置

### 中期扩展
- MIDI文件上传和播放
- 实时音频输入（麦克风）
- 导出可视化视频

### 长期扩展
- Web Audio API合成器
- 多人协作模式
- 移动端适配和触摸支持

## 依赖说明

- **Three.js r128**：通过CDN加载，用于3D烟花效果
- **原生Web API**：Web MIDI API, Web Audio API, Canvas API
- **无构建工具**：纯原生开发，便于理解和修改

## 代码风格

- 使用ES6+语法
- 模块化组织代码
- 清晰的函数命名
- 详细的注释说明
- 避免全局污染（除了调试用的window.MelodyVisualizer）
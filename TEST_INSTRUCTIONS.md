# 🧪 测试 Vue 3 重构版本

## ⚠️ 重要提示

**不要直接双击打开 `index.html` 文件！**

由于使用 ES Modules，必须通过 HTTP(S) 协议访问。

## 🚀 快速测试方法

### 方法 1: 使用 Node.js (推荐)

```bash
# 1. 打开终端，进入项目目录
cd "c:\E\projects\MelodyVisualizer"

# 2. 安装 serve (如果还没有)
npm install -g serve

# 3. 启动服务器
npx serve .

# 4. 在浏览器打开
# http://localhost:3000
```

### 方法 2: 使用 Python

```bash
# 1. 打开终端，进入项目目录
cd "c:\E\projects\MelodyVisualizer"

# 2. 启动服务器
python -m http.server 8000

# 3. 在浏览器打开
# http://localhost:8000
```

### 方法 3: 使用 VSCode Live Server

1. 安装 VSCode 扩展: **Live Server**
2. 右键点击 `index.html`
3. 选择 **"Open with Live Server"**

### 方法 4: 使用 Chrome 的 --allow-file-access-from-files

**不推荐**，但可以临时测试：

```bash
# Windows
chrome.exe --allow-file-access-from-files "c:\E\projects\MelodyVisualizer\index.html"
```

## 🔍 预期行为

### 1. 主菜单页面

你应该看到：
- 🎵 MelodyVisualizer 标题（渐变色）
- 两个大按钮：
  - 🎹 MIDI 模式
  - 🎵 音频分析

### 2. 点击 "MIDI 模式"

- 左上角出现 "← 返回主菜单" 按钮
- 右侧出现控制面板
- 底部出现虚拟钢琴键盘
- 画布区域显示黑色背景（等待 MIDI 输入）

### 3. 点击 "音频分析"

- 左上角出现 "← 返回主菜单" 按钮
- 右侧出现控制面板
- 点击 "选择文件" 按钮上传音频
- 选择音频后点击 "播放"
- 画布区域显示彩虹频谱和波形

## 🐛 常见问题排查

### 问题 1: 页面空白或报错

**原因**: 直接打开了本地文件

**解决**: 使用上述方法启动 HTTP 服务器

### 问题 2: "Tracking Prevention blocked access"

**原因**: 浏览器隐私设置阻止了跨域访问

**解决**:
1. 使用 localhost 而不是 127.0.0.1
2. 或者在浏览器设置中允许 localhost 的存储访问
3. 或者使用 Chrome 的无痕模式（有时会绕过限制）

### 问题 3: MIDI 设备不显示

**原因**:
1. 需要 HTTPS 或 localhost
2. 浏览器不支持 Web MIDI API

**解决**:
1. 确保使用 localhost 访问
2. 使用 Chrome 或 Edge 浏览器
3. 连接 MIDI 设备后点击"刷新设备"

### 问题 4: 音频无法播放

**原因**: AudioContext 需要用户交互才能启动

**解决**:
1. 先点击页面任意位置
2. 然后选择音频文件
3. 点击播放按钮

## 📊 测试清单

- [ ] 主菜单页面正常显示
- [ ] 点击 MIDI 模式进入 MIDI 视图
- [ ] 点击音频分析进入音频视图
- [ ] 返回按钮正常工作
- [ ] 模式切换按钮正常工作
- [ ] MIDI 设备列表可以刷新
- [ ] 音频文件可以上传
- [ ] 音频可以播放和停止
- [ ] 键盘显示组件正常（MIDI 模式）
- [ ] 控制面板样式正常
- [ ] 响应式布局正常（调整窗口大小）

## 🎯 功能测试

### MIDI 模式测试

1. 连接电钢琴或 MIDI 键盘
2. 点击"刷新设备"
3. 选择 MIDI 设备
4. 按下琴键
5. 观察：
   - 虚拟键盘是否高亮
   - 是否有烟花爆炸效果
   - 活跃音符计数是否增加

### 音频分析测试

1. 准备一个音频文件（MP3/WAV）
2. 点击"选择文件"
3. 选择音频文件
4. 点击"播放"
5. 观察：
   - 频谱条是否跳动
   - 波形是否显示
   - 状态是否变为"播放中"
6. 点击"停止"
7. 观察状态是否变为"已停止"

## 📝 测试反馈

如果遇到问题，请提供：
1. 浏览器类型和版本
2. 错误信息（控制台截图）
3. 操作步骤
4. 预期行为 vs 实际行为

## ✅ 成功标志

- 主菜单美观且响应式
- 模式切换流畅
- MIDI 输入实时响应
- 音频频谱可视化正常
- 无控制台错误
- 返回按钮工作正常

---

**祝测试顺利！** 🎉

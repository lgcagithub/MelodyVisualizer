/**
 * 主菜单组件
 * 提供 MIDI 模式和音频分析模式的选择
 */

export default {
  name: 'AppHome',

  emits: ['navigate'],

  setup(props, { emit }) {
    const navigateTo = (view) => {
      emit('navigate', view);
    };

    return {
      navigateTo
    };
  },

  template: `
    <div class="home-view">
      <div class="hero">
        <h1>🎵 MelodyVisualizer</h1>
        <p>选择一个模式开始体验</p>
      </div>

      <div class="menu-buttons">
        <button
          class="menu-btn midi-btn"
          @click="navigateTo('midi')"
        >
          <span class="icon">🎹</span>
          <span class="text">MIDI 模式</span>
          <span class="desc">连接电钢琴，实时可视化</span>
        </button>

        <button
          class="menu-btn audio-btn"
          @click="navigateTo('audio')"
        >
          <span class="icon">🎵</span>
          <span class="text">音频分析</span>
          <span class="desc">上传音频，查看频谱和波形</span>
        </button>
      </div>
    </div>
  `,

  styles: `
    <style scoped>
      .home-view {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%);
      }

      .hero {
        text-align: center;
        margin-bottom: 60px;
      }

      .hero h1 {
        font-size: 48px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
        font-weight: 800;
      }

      .hero p {
        font-size: 16px;
        color: #888;
      }

      .menu-buttons {
        display: flex;
        gap: 30px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .menu-btn {
        width: 280px;
        padding: 30px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: white;
      }

      .menu-btn:hover {
        transform: translateY(-8px);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      }

      .midi-btn:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
        border-color: #667eea;
      }

      .audio-btn:hover {
        background: linear-gradient(135deg, rgba(240, 147, 251, 0.2) 0%, rgba(245, 87, 108, 0.2) 100%);
        border-color: #f093fb;
      }

      .icon {
        font-size: 48px;
      }

      .text {
        font-size: 20px;
        font-weight: 700;
        color: #e0e0e0;
      }

      .desc {
        font-size: 13px;
        color: #888;
        text-align: center;
      }
    </style>
  `
};
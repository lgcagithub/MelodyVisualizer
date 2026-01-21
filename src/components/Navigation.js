/**
 * 导航组件
 * 提供返回主菜单的按钮
 */

export default {
  name: 'Navigation',

  emits: ['go-back'],

  setup(props, { emit }) {
    const goBack = () => {
      emit('go-back');
    };

    return {
      goBack
    };
  },

  template: `
    <div class="navigation">
      <button class="back-btn" @click="goBack">
        ← 返回主菜单
      </button>
    </div>
  `,

  styles: `
    <style scoped>
      .navigation {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
      }

      .back-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e0e0e0;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .back-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: #667eea;
        transform: translateX(-4px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
    </style>
  `
};
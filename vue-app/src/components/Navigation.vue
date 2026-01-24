<template>
  <nav class="navigation">
    <button class="back-btn" @click="emit('go-back')">
      <span class="icon">←</span>
      <span class="text">返回主菜单</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'go-back'): void;
}>();
</script>

<style scoped>
.navigation {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1000;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateX(-2px);
}

.icon {
  font-size: 16px;
}

/* 移动端导航 */
@media (max-width: 768px) {
  .navigation {
    top: 8px;
    left: 8px;
  }

  .back-btn {
    padding: 8px 12px;
    font-size: 12px;
    gap: 6px;
  }

  .text {
    display: none;
  }

  .icon {
    font-size: 14px;
  }
}
</style>

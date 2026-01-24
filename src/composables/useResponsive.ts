/**
 * 响应式状态管理组合式函数
 * 用于管理窗口大小、断点检测和UI元素可见性
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';

interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  controlsVisible: boolean;
  keyboardVisible: boolean;
  sidebarVisible: boolean;
  sidebarPosition: 'right' | 'bottom';
  isSidebarCollapsed: boolean;
}

export function useResponsive() {
  const state = ref<ResponsiveState>({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    controlsVisible: true,
    keyboardVisible: false,
    sidebarVisible: true,
    sidebarPosition: 'right',
    isSidebarCollapsed: false,
  });

  // 防抖函数
  const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout | null = null;
    return ((...args: any[]) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  };

  // 更新窗口大小
  const updateWindowSize = () => {
    state.value.width = window.innerWidth;
    state.value.height = window.innerHeight;
  };

  // 更新断点检测
  const updateBreakpoints = () => {
    const width = state.value.width;
    state.value.isMobile = width < 768;
    state.value.isTablet = width >= 768 && width <= 1024;
    state.value.isDesktop = width > 1024;

    // 侧边栏位置
    state.value.sidebarPosition = state.value.isMobile ? 'bottom' : 'right';
  };

  // 处理窗口大小变化
  const handleResize = debounce(() => {
    updateWindowSize();
    updateBreakpoints();
  }, 150);

  // 切换控制面板可见性
  const toggleControls = () => {
    state.value.controlsVisible = !state.value.controlsVisible;
  };

  // 切换键盘可见性（移动端）
  const toggleKeyboard = () => {
    state.value.keyboardVisible = !state.value.keyboardVisible;
  };

  // 显示控制面板
  const showControls = () => {
    state.value.controlsVisible = true;
  };

  // 隐藏控制面板
  const hideControls = () => {
    state.value.controlsVisible = false;
  };

  // 显示键盘
  const showKeyboard = () => {
    state.value.keyboardVisible = true;
  };

  // 隐藏键盘
  const hideKeyboard = () => {
    state.value.keyboardVisible = false;
  };

  // 切换侧边栏可见性
  const toggleSidebar = () => {
    state.value.isSidebarCollapsed = !state.value.isSidebarCollapsed;
  };

  // 显示侧边栏
  const showSidebar = () => {
    state.value.isSidebarCollapsed = false;
    state.value.sidebarVisible = true;
  };

  // 隐藏侧边栏
  const hideSidebar = () => {
    state.value.isSidebarCollapsed = true;
  };

  // 计算 Canvas 宽度
  const getCanvasWidth = computed(() => {
    if (state.value.isMobile) {
      return '100vw';
    }
    if (state.value.isSidebarCollapsed) {
      return '100vw';
    }
    if (state.value.isTablet) {
      return 'calc(100vw - 250px)';
    }
    return 'calc(100vw - 300px)';
  });

  // 计算 Canvas 高度
  const getCanvasHeight = computed(() => {
    return '100vh';
  });

  // 计算可视化区域高度（基于可见的控制面板）
  const visualizationHeight = computed(() => {
    const navHeight = 60; // 导航栏高度
    const controlHeight = state.value.controlsVisible ? 120 : 0; // 控制面板高度
    const keyboardHeight = state.value.keyboardVisible ? 140 : 0; // 键盘高度（移动端）
    const gap = 24; // 间距

    // 桌面端键盘始终可见，移动端通过 overlay 显示
    const desktopKeyboardHeight = state.value.isDesktop ? 120 : 0;

    return `calc(100vh - ${navHeight + controlHeight + desktopKeyboardHeight + gap}px)`;
  });

  // 计算画布容器高度（用于 CSS）
  const canvasContainerHeight = computed(() => {
    if (state.value.isMobile) {
      return 'calc(100vh - 120px)';
    } else if (state.value.isTablet) {
      return 'calc(100vh - 200px)';
    } else {
      return 'calc(100vh - 180px)';
    }
  });

  onMounted(() => {
    updateWindowSize();
    updateBreakpoints();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  return {
    state,
    toggleControls,
    toggleKeyboard,
    showControls,
    hideControls,
    showKeyboard,
    hideKeyboard,
    toggleSidebar,
    showSidebar,
    hideSidebar,
    getCanvasWidth,
    getCanvasHeight,
    visualizationHeight,
    canvasContainerHeight,
  };
}

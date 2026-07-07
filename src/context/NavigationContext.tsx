/**
 * NavigationContext：统一收敛所有页面共享的导航回调与主题/搜索/收藏数等 prop。
 */
import { createContext, useContext } from 'react';
import type { ThemeMode } from '../types/bead';

/** 应用支持的所有路由名称 */
export type RouteName =
  | 'home'
  | 'favorites'
  | 'colors'
  | 'upload'
  | 'editor'
  | 'ai'
  | 'community'
  | 'compare'
  | 'profile';

export interface NavigationContextValue {
  /** 通用导航：传入 hash 路径（如 'favorites'、'template/abc'） */
  navigate: (targetHash: string) => void;
  /** 返回首页（用 replaceState，不增加历史栈） */
  goHome: () => void;
  /** 导航到指定路由（语义化） */
  navigateTo: (route: RouteName) => void;
  /** 导航到模板详情页 */
  navigateTemplate: (id: string) => void;
  /** 搜索词（应用级共享，多页面同步） */
  searchQuery: string;
  onSearch: (q: string) => void;
  /** 主题 */
  theme: ThemeMode;
  onToggleTheme: () => void;
  /** 收藏数（Navbar 等多处需要） */
  favoritesCount: number;
}

export const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}

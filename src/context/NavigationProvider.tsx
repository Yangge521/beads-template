/**
 * NavigationProvider 组件。
 * useNavigation hook 已移回 NavigationContext.tsx。
 */
import { useCallback, useMemo, type ReactNode } from 'react';
import { NavigationContext, type NavigationContextValue, type RouteName } from './NavigationContext';

interface NavigationProviderProps {
  children: ReactNode;
  navigate: (targetHash: string) => void;
  goHome: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  theme: import('../types/bead').ThemeMode;
  onToggleTheme: () => void;
  favoritesCount: number;
}

export function NavigationProvider({
  children,
  navigate,
  goHome,
  searchQuery,
  onSearch,
  theme,
  onToggleTheme,
  favoritesCount,
}: NavigationProviderProps) {
  const navigateTo = useCallback(
    (route: RouteName) => {
      navigate(route === 'home' ? '' : route);
    },
    [navigate]
  );

  const navigateTemplate = useCallback(
    (id: string) => {
      navigate(`template/${id}`);
    },
    [navigate]
  );

  const value = useMemo<NavigationContextValue>(
    () => ({
      navigate,
      goHome,
      navigateTo,
      navigateTemplate,
      searchQuery,
      onSearch,
      theme,
      onToggleTheme,
      favoritesCount,
    }),
    [navigate, goHome, navigateTo, navigateTemplate, searchQuery, onSearch, theme, onToggleTheme, favoritesCount]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

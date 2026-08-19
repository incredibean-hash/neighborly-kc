'use client';

import { useLayoutEffect, useState } from 'react';
import { DEFAULT_THEME_ID, THEMES } from './themes';

export function useAppTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  useLayoutEffect(() => {
    const apply = () => {
      const saved = window.localStorage.getItem('nkc_theme');
      setThemeId(saved && THEMES[saved] ? saved : DEFAULT_THEME_ID);
    };
    apply();
    window.addEventListener('storage', apply);
    window.addEventListener('nkc-theme-change', apply);
    return () => {
      window.removeEventListener('storage', apply);
      window.removeEventListener('nkc-theme-change', apply);
    };
  }, []);

  return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
}

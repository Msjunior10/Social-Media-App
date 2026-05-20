import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'postra-theme';

const getFaviconHref = (theme) => {
  const publicUrl = process.env.PUBLIC_URL || '';
  const fileName = theme === 'dark' ? 'favicon-dark.svg' : 'favicon.svg';
  return `${publicUrl}/${fileName}`;
};

const syncFaviconWithTheme = (theme) => {
  if (typeof document === 'undefined') {
    return;
  }

  let faviconLink = document.querySelector("link[rel='icon']");

  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.setAttribute('rel', 'icon');
    faviconLink.setAttribute('type', 'image/svg+xml');
    document.head.appendChild(faviconLink);
  }

  faviconLink.setAttribute('href', getFaviconHref(theme));
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    syncFaviconWithTheme(theme);
  }, [theme]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark')),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
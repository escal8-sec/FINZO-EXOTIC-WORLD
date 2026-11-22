import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface RouterContextValue {
  path: string;
  searchParams: URLSearchParams;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue>({
  path: '/',
  searchParams: new URLSearchParams(),
  navigate: () => {},
});

const VALID_STATIC_PATHS = new Set([
  '/',
  '/fish',
  '/aquariums',
  '/custom-aquarium',
  '/about',
  '/care',
  '/contact',
  '/cart',
  '/account',
  '/admin',
  '/admin/login',
  '/admin/dashboard',
]);

function normalizePath(rawPath: string): string {
  const clean = rawPath.split('?')[0].split('#')[0] || '/';
  if (VALID_STATIC_PATHS.has(clean) || clean.startsWith('/product/')) {
    return clean;
  }
  return '/';
}

function extractSearchParams(rawTarget: string): URLSearchParams {
  const qIndex = rawTarget.indexOf('?');
  if (qIndex === -1) return new URLSearchParams();
  return new URLSearchParams(rawTarget.slice(qIndex + 1).split('#')[0]);
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return normalizePath(window.location.pathname);
  });
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  });

  const navigate = useCallback((to: string) => {
    const nextPath = normalizePath(to);
    const nextSearch = extractSearchParams(to);
    const searchStr = nextSearch.toString();
    const fullNext = searchStr ? `${nextPath}?${searchStr}` : nextPath;

    if (
      typeof window !== 'undefined' &&
      `${window.location.pathname}${window.location.search}` !== fullNext
    ) {
      window.history.pushState({}, '', fullNext);
    }
    setPath(nextPath);
    setSearchParams(nextSearch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <RouterContext.Provider value={{ path, searchParams, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}

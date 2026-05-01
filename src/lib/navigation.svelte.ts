let currentPath = $state(window.location.pathname);

function updateCanonical(path: string): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) return;
  link.href = `${window.location.origin}${path}`;
}

updateCanonical(window.location.pathname);

window.addEventListener('popstate', () => {
  const path = window.location.pathname;
  currentPath = path;
  updateCanonical(path);
});

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  if (path === currentPath) return;
  if (options.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  currentPath = path;
  updateCanonical(path);
}

export function getPath(): string {
  return currentPath;
}

export type RouteMatch = {
  component: unknown;
  params: Record<string, string>;
};

export function matchRoute(path: string, routes: Record<string, unknown>): RouteMatch | null {
  for (const pattern of Object.keys(routes)) {
    const params = matchPattern(pattern, path);
    if (params !== null) return { component: routes[pattern], params };
  }
  return null;
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    const v = pathSegments[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(v);
    } else if (p !== v) {
      return null;
    }
  }
  return params;
}

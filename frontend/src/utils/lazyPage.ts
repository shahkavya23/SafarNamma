import { lazy, type ComponentType } from 'react';

/** React.lazy for a page module that uses a named export. */
export const lazyPage = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

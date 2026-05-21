import * as path from "path";
import type { Module } from "node:module";

/**
 * Firebase CLI discovery(약 10초) 동안 전체 Functions 그래프를 한 번에 require 하지 않도록,
 * 배럴 모듈을 getter로 감싸 첫 접근 시에만 로드합니다.
 */
export function attachLazyBarrelExports(
  target: Module["exports"],
  bundlePath: string,
  exportNames: readonly string[]
): void {
  let cache: Record<string, unknown> | null = null;
  const load = (): Record<string, unknown> => {
    if (!cache) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cache = require(bundlePath) as Record<string, unknown>;
    }
    return cache;
  };
  for (const name of exportNames) {
    Object.defineProperty(target, name, {
      enumerable: true,
      configurable: true,
      get(): unknown {
        const mod = load();
        if (!(name in mod)) {
          throw new Error(`[attachLazyBarrelExports] "${String(name)}" not exported from ${bundlePath}`);
        }
        return mod[name as string];
      },
    });
  }
}

/** `lib/src/exports/<bundle>.js` (attachLazyBarrels.js와 동일 디렉터리) */
export function barrelPathFromLibIndex(
  bundleName: "reporting" | "voice" | "market" | "rootBundle",
): string {
  return path.join(__dirname, bundleName);
}

/**
 * 단일 모듈의 named export를 getter로 노출 (첫 접근 시에만 require)
 */
export function attachLazyModuleExports(
  target: Module["exports"],
  modulePath: string,
  exportNames: readonly string[]
): void {
  let cache: Record<string, unknown> | null = null;
  const load = (): Record<string, unknown> => {
    if (!cache) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cache = require(modulePath) as Record<string, unknown>;
    }
    return cache;
  };
  for (const name of exportNames) {
    Object.defineProperty(target, name, {
      enumerable: true,
      configurable: true,
      get(): unknown {
        const mod = load();
        if (!(name in mod)) {
          throw new Error(`[attachLazyModuleExports] "${String(name)}" not exported from ${modulePath}`);
        }
        return mod[name as string];
      },
    });
  }
}

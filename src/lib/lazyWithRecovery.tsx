/**
 * React.lazy wrapper — chunk 404 시 1회 자동 reload, 이후 FallbackPage.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { handleChunkImportFailure } from "./chunkLoadRecovery";
import FallbackPage from "@/components/FallbackPage";

type ModuleDefault<T> = { default: T };

type LazyFactory<T extends ComponentType<unknown>> = () => Promise<ModuleDefault<T>>;

export function lazyWithRecovery<T extends ComponentType<unknown>>(
  factory: LazyFactory<T>,
  chunkLabel?: string,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (handleChunkImportFailure(error)) {
        // reload 직전 Suspense가 영원히 fallback에 머무르지 않도록 짧은 유예 후 Fallback
        return new Promise<ModuleDefault<T>>((resolve) => {
          window.setTimeout(() => {
            const label = chunkLabel ?? "페이지";
            const Fallback = (() => (
              <FallbackPage pageName={label} onRetry={() => window.location.reload()} />
            )) as T;
            resolve({ default: Fallback });
          }, 1200);
        });
      }

      const label = chunkLabel ?? "페이지";
      const Fallback = (() => (
        <FallbackPage pageName={label} onRetry={() => window.location.reload()} />
      )) as T;

      return { default: Fallback };
    }),
  );
}

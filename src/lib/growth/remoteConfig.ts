import { app } from "@/lib/firebase";
import { DEFAULT_GROWTH_CONFIG, type GrowthConfig } from "@/lib/growth/defaults";
import { resolveGrowthConfig, toRemoteConfigDefaults } from "@/lib/growth/growthConfig";

type GrowthConfigListener = (config: GrowthConfig) => void;

let currentGrowthConfig: GrowthConfig = { ...DEFAULT_GROWTH_CONFIG };
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<GrowthConfigListener>();

function publish(config: GrowthConfig): void {
  currentGrowthConfig = config;
  for (const listener of listeners) {
    listener(config);
  }
}

export function getGrowthConfigSnapshot(): GrowthConfig {
  return currentGrowthConfig;
}

export function subscribeGrowthConfig(listener: GrowthConfigListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function hydrateFromRemoteConfig(): Promise<void> {
  try {
    const { fetchAndActivate, getRemoteConfig, getAll } = await import("firebase/remote-config");
    const remoteConfig = getRemoteConfig(app);
    remoteConfig.settings = {
      minimumFetchIntervalMillis: import.meta.env.DEV ? 0 : 60 * 60 * 1000,
      fetchTimeoutMillis: 5_000,
    };
    remoteConfig.defaultConfig = toRemoteConfigDefaults(DEFAULT_GROWTH_CONFIG);
    await fetchAndActivate(remoteConfig);
    const values = getAll(remoteConfig);
    publish(resolveGrowthConfig(values));
  } catch {
    // 네트워크/권한/SDK 이슈 시 기본값 유지 (paywall break 방지)
    publish({ ...DEFAULT_GROWTH_CONFIG });
  }
}

export async function initGrowthConfig(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await hydrateFromRemoteConfig();
    initialized = true;
  })();
  return initPromise;
}

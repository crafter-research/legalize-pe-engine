/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/vanillajs" />

declare module "virtual:pwa-info" {
  export interface PwaInfo {
    pwaInDevEnvironment: boolean;
    webManifest: {
      href: string;
      useCredentials: boolean;
      linkTag: string;
    };
  }
  export const pwaInfo: PwaInfo | undefined;
}

// Build-time generated map (public/id-path-map.json, written by the prebuild
// script). Declared here so `tsc` / `astro check` type-check without the
// generated artifact present (e.g. in CI); Vite resolves the real file via the
// `id-path-map` alias in astro.config.mjs at dev/build time.
declare module "id-path-map" {
  const map: Record<string, string>;
  export default map;
}

declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

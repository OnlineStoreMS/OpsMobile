/// <reference types="vite/client" />

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      portalUrl?: string
    }
  }
}

export {}

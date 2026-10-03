/// <reference types="vite/client" />

declare module '*.css?url' {
  const url: string
  export default url
}

interface ImportMetaEnv {
  readonly VITE_UMAMI_SCRIPT_URL?: string
  readonly VITE_UMAMI_WEBSITE_ID?: string
  readonly VITE_UMAMI_DOMAINS?: string
}

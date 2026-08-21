import type { AreaCaptureApi } from './index'

declare global {
  interface Window {
    api: AreaCaptureApi
  }
}

export {}

export interface QvacAPI {
  loadModel: () => Promise<string>
  infer: (history: { role: string; content: string }[]) => Promise<void>
  onCompletionStream: (cb: (token: string) => void) => () => void
  onQvacReady: (cb: () => void) => () => void
  onQvacError: (cb: (error?: { message: string }) => void) => () => void
  getModelStatus: () => Promise<{ loaded: boolean; loading: boolean; modelId: string | null }>
  unloadModel: () => Promise<string>
}

declare global {
  interface Window {
    electron: {
      process: {
        versions: NodeJS.ProcessVersions
      }
    }
    qvacAPI: QvacAPI
  }
}
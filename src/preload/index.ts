import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('qvacAPI', {
  loadModel: (): Promise<string> => {
    return ipcRenderer.invoke('load-model')
  },

  infer: (
    history: { role: string; content: string }[]
  ): Promise<void> => {
    return ipcRenderer.invoke('infer', history)
  },

  onCompletionStream: (cb: (token: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string): void => {
      cb(token)
    }
    ipcRenderer.on('completion-stream', handler)
    return () => {
      ipcRenderer.removeListener('completion-stream', handler)
    }
  },

  onQvacReady: (cb: () => void): (() => void) => {
    const handler = (): void => {
      cb()
    }
    ipcRenderer.on('qvac-ready', handler)
    return () => {
      ipcRenderer.removeListener('qvac-ready', handler)
    }
  },

  onQvacError: (cb: (error?: { message: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error?: { message: string }): void => {
      cb(error)
    }
    ipcRenderer.on('qvac-error', handler)
    return () => {
      ipcRenderer.removeListener('qvac-error', handler)
    }
  },

  getModelStatus: (): Promise<{ loaded: boolean; loading: boolean; modelId: string | null }> => {
    return ipcRenderer.invoke('get-model-status')
  },

  unloadModel: (): Promise<string> => {
    return ipcRenderer.invoke('unload-model')
  }
})

contextBridge.exposeInMainWorld('electron', {
  process: {
    versions: process.versions
  }
})
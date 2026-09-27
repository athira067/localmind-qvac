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

  onCompletionStream: (cb: (token: string) => void): void => {
    ipcRenderer.on('completion-stream', (_event, token) => {
      cb(token)
    })
  },

  unloadModel: (): Promise<string> => {
    return ipcRenderer.invoke('unload-model')
  }
})
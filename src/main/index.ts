import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  LLAMA_3_2_1B_INST_Q4_0,
  loadModel,
  unloadModel,
  completion
} from '@qvac/sdk'

app.commandLine.appendSwitch('no-sandbox')

let win: BrowserWindow | null = null
let modelId: string | null = null
let loadPromise: Promise<string> | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win?.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupHandlers(): void {
  ipcMain.handle('get-model-status', () => {
    return {
      loaded: Boolean(modelId),
      loading: Boolean(loadPromise),
      modelId
    }
  })

  ipcMain.handle('load-model', async () => {
    if (modelId) {
      console.log('QVAC model already loaded. Model ID:', modelId)
      win?.webContents.send('qvac-ready')
      return 'model loaded'
    }

    if (loadPromise) {
      console.log('QVAC model load already in progress...')
      return loadPromise
    }

    loadPromise = (async () => {
      try {
        console.log('========================================')
        console.log('Loading QVAC model...')
        console.log('Model:', LLAMA_3_2_1B_INST_Q4_0)
        console.log('========================================')

        modelId = await loadModel({
          modelSrc: LLAMA_3_2_1B_INST_Q4_0,
          modelType: 'llm',
          onProgress: (progress) => {
            console.log('QVAC progress:', progress)
          }
        })

        console.log('========================================')
        console.log('QVAC MODEL LOADED SUCCESSFULLY')
        console.log('Model ID:', modelId)
        console.log('========================================')

        win?.webContents.send('qvac-ready')

        return 'model loaded'
      } catch (error) {
        modelId = null

        console.error('========================================')
        console.error('QVAC MODEL LOAD FAILED')
        console.error(error)
        console.error('========================================')

        win?.webContents.send('qvac-error', {
          message:
            error instanceof Error
              ? error.message
              : String(error)
        })

        throw error
      } finally {
        loadPromise = null
      }
    })()

    return loadPromise
  })

  ipcMain.handle(
    'infer',
    async (
      _event,
      history: { role: string; content: string }[]
    ) => {
      if (!modelId) {
        throw new Error('Model not loaded.')
      }

      try {
        const result = completion({
          modelId,
          history,
          stream: true
        })

        let fullResponse = ''

        for await (const token of result.tokenStream) {
          fullResponse += token

          win?.webContents.send(
            'completion-stream',
            fullResponse
          )
        }

        win?.webContents.send(
          'completion-stream',
          ''
        )
      } catch (error) {
        console.error('QVAC inference failed:', error)
        win?.webContents.send(
          'completion-stream',
          ''
        )
        throw error
      }
    }
  )

  ipcMain.handle('unload-model', async () => {
    if (!modelId) {
      return 'model not loaded'
    }

    try {
      await unloadModel({
        modelId
      })

      modelId = null

      console.log('QVAC model unloaded')

      return 'model unloaded'
    } catch (error) {
      console.error('QVAC unload failed:', error)
      modelId = null
      throw error
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on(
    'browser-window-created',
    (_, window) => {
      optimizer.watchWindowShortcuts(window)
    }
  )

  // IMPORTANT:
  // Register IPC handlers BEFORE creating the window.
  setupHandlers()

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
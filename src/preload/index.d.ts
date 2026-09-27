ipcMain.handle('load-model', async () => {
  console.log('Loading QVAC model...')

  try {
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: 'llm',
      onProgress: (progress) => {
        console.log('QVAC progress:', progress)
      }
    })

    console.log('QVAC model loaded!', modelId)

    return 'model loaded'
  } catch (error) {
    console.error('========== QVAC LOAD ERROR ==========')
    console.error(error)

    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }

    console.error('======================================')

    throw error
  }
})
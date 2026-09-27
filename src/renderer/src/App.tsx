import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

function App(): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.qvacAPI
      .loadModel()
      .then(() => {
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to load QVAC model:', error)
      })

   window.qvacAPI.onCompletionStream((response) => {
  if (response === '') {
    setProcessing(false)
    return
  }

  setMessages((previous) => {
    const updated = [...previous]

    if (updated.length === 0) {
      return updated
    }

    updated[updated.length - 1].content = response

    return updated
  })

    })

    return () => {
      window.qvacAPI.unloadModel().catch(() => {})
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages])

  const handleSend = (): void => {
    if (!input.trim() || processing || loading) {
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: input
    }

    const history = [...messages, userMessage]

    setMessages([
      ...history,
      {
        role: 'assistant',
        content: ''
      }
    ])

    window.qvacAPI.infer([
      {
        role: 'system',
        content: 'You are a helpful assistant. Give clear and simple answers.'
      },
      ...history
    ])

    setInput('')
    setProcessing(true)
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#111111',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Header */}

      <header
        style={{
          padding: '20px',
          borderBottom: '1px solid #333333',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px'
            }}
          >
            LocalMind
          </h1>

          <p
            style={{
              margin: '5px 0 0',
              color: '#999999'
            }}
          >
            Private AI powered by QVAC
          </p>
        </div>

        <div
          style={{
            marginLeft: 'auto',
            color: loading ? '#f59e0b' : '#22c55e'
          }}
        >
          ● {loading ? 'Loading local AI...' : 'AI Ready'}
        </div>
      </header>

      {/* Chat area */}

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '25px'
        }}
      >
        {loading ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#aaaaaa'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h2>Loading QVAC AI...</h2>

              <p>
                The AI model is being loaded on your device.
              </p>

              <p>
                The first run may take some time.
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#888888'
            }}
          >
            <div>
              <h2 style={{ color: '#ffffff' }}>
                Welcome to LocalMind
              </h2>

              <p>
                Ask a question to your private,
                on-device AI.
              </p>

              <p>
                Your prompt is processed locally using QVAC.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent:
                  message.role === 'user'
                    ? 'flex-end'
                    : 'flex-start',
                marginBottom: '15px'
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background:
                    message.role === 'user'
                      ? '#4f46e5'
                      : '#252525',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {message.content ||
                  (processing && index === messages.length - 1
                    ? 'Thinking...'
                    : '')}
              </div>
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input */}

      <footer
        style={{
          padding: '20px',
          borderTop: '1px solid #333333'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '10px'
          }}
        >
          <textarea
            rows={2}
            value={input}
            disabled={loading || processing}
            placeholder={
              loading
                ? 'Loading local AI...'
                : 'Ask LocalMind something...'
            }
            onChange={(event) => {
              setInput(event.target.value)
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey
              ) {
                event.preventDefault()
                handleSend()
              }
            }}
            style={{
              flex: 1,
              resize: 'none',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #444444',
              background: '#1d1d1d',
              color: '#ffffff',
              outline: 'none'
            }}
          />

          <button
            onClick={handleSend}
            disabled={loading || processing || !input.trim()}
            style={{
              padding: '0 22px',
              borderRadius: '10px',
              border: 'none',
              background:
                loading || processing || !input.trim()
                  ? '#444444'
                  : '#4f46e5',
              color: '#ffffff',
              cursor:
                loading || processing
                  ? 'not-allowed'
                  : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {processing ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>

        <div
          style={{
            marginTop: '10px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#777777'
          }}
        >
          🔒 AI inference runs locally on your device using QVAC
        </div>
      </footer>
    </div>
  )
}

export default App
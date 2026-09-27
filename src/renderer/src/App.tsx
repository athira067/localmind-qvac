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
        content:
          'You are a helpful assistant. Give clear and simple answers.'
      },
      ...history
    ])

    setInput('')
    setProcessing(true)
  }

  const handleNewChat = (): void => {
    if (processing) return
    setMessages([])
    setInput('')
  }

  const handlePrompt = (prompt: string): void => {
    if (loading || processing) return
    setInput(prompt)
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">L</div>

          <div>
            <div className="brand-name">LocalMind</div>
            <div className="brand-subtitle">Private AI</div>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={handleNewChat}
          disabled={processing}
        >
          <span className="plus-icon">+</span>
          New Chat
        </button>

        <div className="sidebar-section">
          <div className="sidebar-label">ABOUT</div>

          <div className="sidebar-info">
            <div className="info-icon">◆</div>
            <div>
              <strong>On-device AI</strong>
              <span>Your conversations stay local.</span>
            </div>
          </div>

          <div className="sidebar-info">
            <div className="info-icon">⚡</div>
            <div>
              <strong>Powered by QVAC</strong>
              <span>AI inference runs on your device.</span>
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="connection-status">
            <span
              className={`status-dot ${
                loading ? 'loading-dot' : ''
              }`}
            />
            <span>
              {loading ? 'Loading AI...' : 'QVAC AI Ready'}
            </span>
          </div>

          <div className="sidebar-version">
            LocalMind · QVAC
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Local AI Assistant</div>
            <div className="topbar-subtitle">
              Private intelligence, running locally
            </div>
          </div>

          <div className="topbar-status">
            <span
              className={`status-dot ${
                loading ? 'loading-dot' : ''
              }`}
            />
            {loading ? 'Initializing' : 'Online'}
          </div>
        </header>

        {/* Chat */}
        <main className="chat-area">
          {loading ? (
            <div className="center-state">
              <div className="loading-orb">
                <div className="loading-inner">L</div>
              </div>

              <h1>Preparing LocalMind</h1>

              <p>
                QVAC is loading the AI model on your device.
              </p>

              <div className="loading-message">
                <span className="loading-spinner" />
                Initializing local AI...
              </div>

              <span className="small-note">
                The first launch may take a little longer.
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="welcome-state">
              <div className="welcome-icon">
                <span>L</span>
              </div>

              <div className="welcome-badge">
                <span className="status-dot" />
                QVAC · Local AI
              </div>

              <h1>
                Welcome to <span>LocalMind</span>
              </h1>

              <p>
                A private AI assistant that runs directly on
                your device.
              </p>

              <div className="prompt-grid">
                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Explain artificial intelligence in simple words.'
                    )
                  }
                >
                  <span className="prompt-icon">✦</span>
                  <div>
                    <strong>Explain something</strong>
                    <span>
                      Get a simple explanation of a topic
                    </span>
                  </div>
                </button>

                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Give me three creative ideas for a student project.'
                    )
                  }
                >
                  <span className="prompt-icon">✧</span>
                  <div>
                    <strong>Brainstorm ideas</strong>
                    <span>
                      Generate ideas for your next project
                    </span>
                  </div>
                </button>

                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Give me a short summary of why privacy matters in AI.'
                    )
                  }
                >
                  <span className="prompt-icon">◈</span>
                  <div>
                    <strong>Summarize a topic</strong>
                    <span>
                      Turn complex ideas into simple points
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message-row ${message.role}`}
                >
                  {message.role === 'assistant' && (
                    <div className="avatar assistant-avatar">
                      L
                    </div>
                  )}

                  <div className="message-content">
                    <div className="message-label">
                      {message.role === 'user'
                        ? 'You'
                        : 'LocalMind'}
                    </div>

                    <div
                      className={`message-bubble ${message.role}`}
                    >
                      {message.content ||
                        (processing &&
                        index === messages.length - 1
                          ? 'Thinking...'
                          : '')}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="avatar user-avatar">
                      You
                    </div>
                  )}
                </div>
              ))}

              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {/* Composer */}
        <footer className="composer-area">
          <div className="composer">
            <textarea
              rows={1}
              value={input}
              disabled={loading || processing}
              placeholder={
                loading
                  ? 'Preparing LocalMind...'
                  : 'Message LocalMind...'
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
            />

            <button
              className="send-button"
              onClick={handleSend}
              disabled={
                loading ||
                processing ||
                !input.trim()
              }
              aria-label="Send message"
            >
              {processing ? (
                <span className="button-spinner" />
              ) : (
                <span className="send-arrow">↑</span>
              )}
            </button>
          </div>

          <div className="composer-footer">
            <span>
              <span className="lock-icon">◆</span>
              Runs locally on your device
            </span>

            <span>
              Press <kbd>Enter</kbd> to send ·{' '}
              <kbd>Shift + Enter</kbd> for a new line
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
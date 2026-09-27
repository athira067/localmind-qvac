import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type StudyMode =
  | 'chat'
  | 'explain'
  | 'summarize'
  | 'quiz'
  | 'exam'
  | 'notes'

const MODE_INFO: Record<
  StudyMode,
  {
    label: string
    description: string
    icon: string
  }
> = {
  chat: {
    label: 'Chat',
    description: 'Ask LocalMind anything',
    icon: '✦'
  },
  explain: {
    label: 'Explain',
    description: 'Understand a topic simply',
    icon: '◇'
  },
  summarize: {
    label: 'Summarize',
    description: 'Turn notes into key points',
    icon: '≡'
  },
  quiz: {
    label: 'Generate Quiz',
    description: 'Create practice questions',
    icon: '?'
  },
  exam: {
    label: 'Exam Answer',
    description: 'Prepare a structured answer',
    icon: '✓'
  },
  notes: {
    label: 'Ask My Notes',
    description: 'Answer using your notes',
    icon: '▤'
  }
}

function App(): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [studyMode, setStudyMode] = useState<StudyMode>('chat')

  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [showModes, setShowModes] = useState(false)

  const [modelReady, setModelReady] = useState(false)
  const [modelError, setModelError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /*
   * Load the QVAC model.
   *
   * IMPORTANT:
   * This keeps your existing QVAC API integration.
   * The UI must not claim that inference is local unless
   * the actual QVAC runtime is configured for local inference.
   */
  useEffect(() => {
    let mounted = true

    window.qvacAPI
      .loadModel()
      .then(() => {
        if (!mounted) return

        setLoading(false)
        setModelReady(true)
        setModelError('')
      })
      .catch((error) => {
        console.error('Failed to load QVAC model:', error)

        if (!mounted) return

        setLoading(false)
        setModelReady(false)
        setModelError('Unable to initialize the QVAC model.')
      })

    /*
     * QVAC streaming completion.
     */
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
      mounted = false

      window.qvacAPI.unloadModel().catch(() => {})
    }
  }, [])

  /*
   * Keep the newest message visible.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages])

  /*
   * Focus the input after changing modes.
   */
  useEffect(() => {
    textareaRef.current?.focus()
  }, [studyMode])

  /*
   * Build a product-specific prompt.
   *
   * This is important because LocalMind is no longer
   * presented as only a generic chatbot.
   */
  const buildPrompt = (
    mode: StudyMode,
    userInput: string
  ): string => {
    const cleanInput = userInput.trim()

    const cleanNotes = notes.trim()

    switch (mode) {
      case 'explain':
        return `
You are LocalMind, a private AI study assistant.

Explain the following topic in simple language.

Requirements:
- Start with a short definition.
- Explain the concept clearly.
- Give one practical example.
- End with exactly 3 key points.
- Avoid unnecessary jargon.

Topic:
${cleanInput}
`.trim()

      case 'summarize':
        return `
You are LocalMind, a private AI study assistant.

Summarize the following study material.

Requirements:
- Give a short overview.
- Extract the 5 most important points.
- Preserve important technical terms.
- Do not invent information that is not present in the material.
- Make the result useful for exam revision.

Study material:
${cleanInput}
`.trim()

      case 'quiz':
        return `
You are LocalMind, a private AI study assistant.

Create a practice quiz from the following study material.

Requirements:
- Create exactly 5 multiple-choice questions.
- Give 4 options for each question.
- Mark the correct answer.
- Give a one-sentence explanation for each answer.
- Base the questions on the supplied material.

Study material:
${cleanInput}
`.trim()

      case 'exam':
        return `
You are LocalMind, a private AI study assistant.

Prepare a structured exam answer for the following topic.

Requirements:
- Begin with a concise definition/introduction.
- Use clear headings.
- Include important keywords.
- Give relevant examples where appropriate.
- Finish with a short conclusion.
- Make the answer suitable for a 6-mark university exam question.

Topic:
${cleanInput}
`.trim()

      case 'notes':
        return `
You are LocalMind, a private AI study assistant.

Answer the user's question using the study notes below.

Important rules:
- Prefer information contained in the notes.
- Do not invent facts that contradict the notes.
- If the answer cannot be determined from the notes, clearly say that.
- Explain the answer clearly.
- Mention the relevant part of the notes when possible.

STUDY NOTES:
${cleanNotes || 'No notes have been added yet.'}

USER QUESTION:
${cleanInput}
`.trim()

      case 'chat':
      default:
        return `
You are LocalMind, a helpful private AI assistant.

Give a clear, useful and concise answer to the user's request.

User:
${cleanInput}
`.trim()
    }
  }

  /*
   * Send a message to QVAC.
   */
  const handleSend = (): void => {
    if (!input.trim() || processing || loading || !modelReady) {
      return
    }

    const userInput = input.trim()

    const prompt = buildPrompt(studyMode, userInput)

    const userMessage: Message = {
      role: 'user',
      content: userInput
    }

    const history = [...messages, userMessage]

    setMessages([
      ...history,
      {
        role: 'assistant',
        content: ''
      }
    ])

    /*
     * Keep the conversation history while using
     * our product-specific system instruction.
     */
    window.qvacAPI.infer([
      {
        role: 'system',
        content: `
You are LocalMind.

LocalMind is a private AI study assistant powered by QVAC.

You help users:
- understand concepts
- summarize study material
- create quizzes
- prepare exam answers
- ask questions about their notes

Be accurate, concise and helpful.

Current study mode:
${MODE_INFO[studyMode].label}

Current task:
${prompt}
`
      },
      ...history.map((message) => ({
        role: message.role,
        content: message.content
      }))
    ])

    setInput('')
    setProcessing(true)
  }

  /*
   * Start a completely new conversation.
   */
  const handleNewChat = (): void => {
    if (processing) {
      return
    }

    setMessages([])
    setInput('')
    setStudyMode('chat')
  }

  /*
   * Select a study mode.
   */
  const handleModeChange = (mode: StudyMode): void => {
    if (processing) {
      return
    }

    setStudyMode(mode)
    setShowModes(false)

    /*
     * Give the user a useful starter prompt.
     */
    const starterPrompts: Record<StudyMode, string> = {
      chat: '',
      explain: 'Explain this topic in simple language: ',
      summarize: 'Summarize this study material: ',
      quiz: 'Create 5 MCQs from this study material: ',
      exam: 'Prepare a 6-mark exam answer for: ',
      notes: 'Based on my notes, answer this question: '
    }

    setInput(starterPrompts[mode])
  }

  /*
   * Prompt cards on the welcome screen.
   */
  const handlePrompt = (
    prompt: string,
    mode: StudyMode = 'chat'
  ): void => {
    if (loading || processing) {
      return
    }

    setStudyMode(mode)
    setInput(prompt)

    textareaRef.current?.focus()
  }

  /*
   * Save notes locally in the browser.
   *
   * This does not send notes anywhere by itself.
   */
  const handleNotesChange = (
    value: string
  ): void => {
    setNotes(value)

    try {
      localStorage.setItem(
        'localmind-notes',
        value
      )
    } catch {
      // Ignore localStorage errors.
    }
  }

  /*
   * Restore notes when the application starts.
   */
  useEffect(() => {
    try {
      const savedNotes =
        localStorage.getItem('localmind-notes')

      if (savedNotes) {
        setNotes(savedNotes)
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, [])

  /*
   * Keyboard shortcut.
   */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      handleSend()
    }
  }

  const currentMode = MODE_INFO[studyMode]

  return (
    <div className="app-shell">
      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            L
          </div>

          <div>
            <div className="brand-name">
              LocalMind
            </div>

            <div className="brand-subtitle">
              Private AI Study Assistant
            </div>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={handleNewChat}
          disabled={processing}
        >
          <span className="plus-icon">
            +
          </span>

          New Chat
        </button>

        {/* STUDY MODES */}

        <div className="sidebar-section">
          <div className="sidebar-label">
            STUDY MODES
          </div>

          {(Object.keys(MODE_INFO) as StudyMode[])
            .filter((mode) => mode !== 'chat')
            .map((mode) => (
              <button
                key={mode}
                className={`sidebar-mode ${
                  studyMode === mode
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  handleModeChange(mode)
                }
                disabled={processing}
              >
                <span className="mode-icon">
                  {MODE_INFO[mode].icon}
                </span>

                <span>
                  <strong>
                    {MODE_INFO[mode].label}
                  </strong>

                  <small>
                    {MODE_INFO[mode].description}
                  </small>
                </span>
              </button>
            ))}
        </div>

        {/* NOTES */}

        <div className="sidebar-section">
          <div className="sidebar-label">
            MY NOTES
          </div>

          <button
            className={`notes-button ${
              showNotes ? 'active' : ''
            }`}
            onClick={() =>
              setShowNotes(!showNotes)
            }
          >
            <span>▤</span>

            <span>
              {notes.trim()
                ? 'Study notes saved'
                : 'Add study notes'}
            </span>
          </button>
        </div>

        {/* ABOUT */}

        <div className="sidebar-section">
          <div className="sidebar-label">
            LOCAL AI
          </div>

          <div className="sidebar-info">
            <div className="info-icon">
              ◆
            </div>

            <div>
              <strong>
                QVAC Runtime
              </strong>

              <span>
                {modelReady
                  ? 'Model ready'
                  : loading
                    ? 'Initializing model'
                    : 'Model unavailable'}
              </span>
            </div>
          </div>

          <div className="sidebar-info">
            <div className="info-icon">
              ⚡
            </div>

            <div>
              <strong>
                On-device AI
              </strong>

              <span>
                Inference through QVAC
              </span>
            </div>
          </div>
        </div>

        {/* STATUS */}

        <div className="sidebar-bottom">
          <div className="connection-status">
            <span
              className={`status-dot ${
                loading
                  ? 'loading-dot'
                  : modelReady
                    ? ''
                    : 'error-dot'
              }`}
            />

            <span>
              {loading
                ? 'Loading QVAC...'
                : modelReady
                  ? 'QVAC AI Ready'
                  : 'QVAC unavailable'}
            </span>
          </div>

          <div className="sidebar-version">
            LocalMind · QVAC
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN AREA
      ====================================================== */}

      <div className="main-area">
        {/* TOP BAR */}

        <header className="topbar">
          <div>
            <div className="topbar-title">
              LocalMind
            </div>

            <div className="topbar-subtitle">
              Private AI Study Assistant
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-status">
              <span
                className={`status-dot ${
                  loading
                    ? 'loading-dot'
                    : modelReady
                      ? ''
                      : 'error-dot'
                }`}
              />

              {loading
                ? 'Initializing QVAC'
                : modelReady
                  ? 'QVAC · Ready'
                  : 'QVAC · Error'}
            </div>

            <button
              className="notes-top-button"
              onClick={() =>
                setShowNotes(!showNotes)
              }
            >
              ▤ Notes
            </button>
          </div>
        </header>

        {/* =================================================
            NOTES PANEL
        ================================================== */}

        {showNotes && (
          <section className="notes-panel">
            <div className="notes-panel-header">
              <div>
                <strong>
                  My Study Notes
                </strong>

                <span>
                  These notes are stored locally in
                  your browser and can be used by
                  Ask My Notes mode.
                </span>
              </div>

              <button
                className="close-notes"
                onClick={() =>
                  setShowNotes(false)
                }
              >
                ×
              </button>
            </div>

            <textarea
              className="notes-textarea"
              value={notes}
              onChange={(event) =>
                handleNotesChange(
                  event.target.value
                )
              }
              placeholder={
                'Paste your study material here...\n\nExample:\nMachine learning is a branch of AI that enables systems to learn patterns from data...'
              }
            />

            <div className="notes-footer">
              <span>
                {notes.length} characters
              </span>

              <span>
                Stored locally
              </span>
            </div>
          </section>
        )}

        {/* =================================================
            CHAT AREA
        ================================================== */}

        <main className="chat-area">
          {loading ? (
            <div className="center-state">
              <div className="loading-orb">
                <div className="loading-inner">
                  L
                </div>
              </div>

              <h1>
                Preparing LocalMind
              </h1>

              <p>
                QVAC is loading the AI model
                on your device.
              </p>

              <div className="loading-message">
                <span className="loading-spinner" />

                Initializing local AI...
              </div>

              <span className="small-note">
                The first launch may take a
                little longer.
              </span>
            </div>
          ) : modelError ? (
            <div className="center-state error-state">
              <div className="error-icon">
                !
              </div>

              <h1>
                QVAC could not start
              </h1>

              <p>
                {modelError}
              </p>

              <span className="small-note">
                Check your QVAC runtime
                configuration and restart the
                application.
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
                Study smarter with{' '}
                <span>
                  LocalMind
                </span>
              </h1>

              <p>
                A private AI study assistant
                designed to explain concepts,
                summarize notes, generate quizzes
                and prepare exam answers.
              </p>

              {/* ACTIVE MODE */}

              <div className="active-mode-card">
                <div className="active-mode-icon">
                  {currentMode.icon}
                </div>

                <div>
                  <strong>
                    {currentMode.label}
                  </strong>

                  <span>
                    {currentMode.description}
                  </span>
                </div>

                <button
                  onClick={() =>
                    setShowModes(!showModes)
                  }
                >
                  Change
                </button>
              </div>

              {/* MODE MENU */}

              {showModes && (
                <div className="mode-menu">
                  {(Object.keys(
                    MODE_INFO
                  ) as StudyMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        className={
                          studyMode === mode
                            ? 'selected'
                            : ''
                        }
                        onClick={() =>
                          handleModeChange(
                            mode
                          )
                        }
                      >
                        <span>
                          {
                            MODE_INFO[mode]
                              .icon
                          }
                        </span>

                        <div>
                          <strong>
                            {
                              MODE_INFO[mode]
                                .label
                            }
                          </strong>

                          <small>
                            {
                              MODE_INFO[mode]
                                .description
                            }
                          </small>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}

              {/* PROMPTS */}

              <div className="prompt-grid">
                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Explain gradient descent in simple language.',
                      'explain'
                    )
                  }
                >
                  <span className="prompt-icon">
                    ◇
                  </span>

                  <div>
                    <strong>
                      Explain a topic
                    </strong>

                    <span>
                      Learn a concept with an
                      example and key points
                    </span>
                  </div>
                </button>

                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Summarize the following study material into 5 important exam points:\n',
                      'summarize'
                    )
                  }
                >
                  <span className="prompt-icon">
                    ≡
                  </span>

                  <div>
                    <strong>
                      Summarize notes
                    </strong>

                    <span>
                      Turn study material into
                      revision points
                    </span>
                  </div>
                </button>

                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Create 5 multiple-choice questions from the following study material:\n',
                      'quiz'
                    )
                  }
                >
                  <span className="prompt-icon">
                    ?
                  </span>

                  <div>
                    <strong>
                      Generate a quiz
                    </strong>

                    <span>
                      Practice with AI-generated
                      questions
                    </span>
                  </div>
                </button>

                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Prepare a clear 6-mark exam answer for the following topic:\n',
                      'exam'
                    )
                  }
                >
                  <span className="prompt-icon">
                    ✓
                  </span>

                  <div>
                    <strong>
                      Prepare for exams
                    </strong>

                    <span>
                      Get a structured exam-ready
                      answer
                    </span>
                  </div>
                </button>

                <button
                  className="prompt-card notes-card"
                  onClick={() => {
                    setShowNotes(true)
                    handleModeChange(
                      'notes'
                    )
                  }}
                >
                  <span className="prompt-icon">
                    ▤
                  </span>

                  <div>
                    <strong>
                      Ask my notes
                    </strong>

                    <span>
                      Get answers based on your
                      study material
                    </span>
                  </div>
                </button>

                <button
                  className="prompt-card"
                  onClick={() =>
                    handlePrompt(
                      'Explain why running AI locally can be useful for privacy and offline study.',
                      'chat'
                    )
                  }
                >
                  <span className="prompt-icon">
                    ◈
                  </span>

                  <div>
                    <strong>
                      Learn about local AI
                    </strong>

                    <span>
                      Understand privacy and
                      on-device AI
                    </span>
                  </div>
                </button>
              </div>

              {/* QVAC PROOF CARD */}

              <div className="qvac-proof-card">
                <div className="qvac-proof-icon">
                  ⚡
                </div>

                <div>
                  <strong>
                    Powered by QVAC
                  </strong>

                  <span>
                    LocalMind uses the QVAC
                    runtime for AI inference.
                  </span>
                </div>

                <div className="qvac-proof-status">
                  <span className="status-dot" />

                  {modelReady
                    ? 'Model ready'
                    : 'Initializing'}
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {/* CURRENT MODE BANNER */}

              <div className="mode-banner">
                <span className="mode-banner-icon">
                  {currentMode.icon}
                </span>

                <div>
                  <strong>
                    {currentMode.label}
                  </strong>

                  <span>
                    {currentMode.description}
                  </span>
                </div>

                {studyMode === 'notes' && (
                  <span className="notes-indicator">
                    {notes.trim()
                      ? 'Notes loaded'
                      : 'No notes added'}
                  </span>
                )}
              </div>

              {messages.map(
                (message, index) => (
                  <div
                    key={index}
                    className={`message-row ${message.role}`}
                  >
                    {message.role ===
                      'assistant' && (
                      <div className="avatar assistant-avatar">
                        L
                      </div>
                    )}

                    <div className="message-content">
                      <div className="message-label">
                        {message.role ===
                        'user'
                          ? 'You'
                          : 'LocalMind · QVAC'}
                      </div>

                      <div
                        className={`message-bubble ${message.role}`}
                      >
                        {message.content ||
                          (processing &&
                          index ===
                            messages.length -
                              1
                            ? 'Thinking with QVAC...'
                            : '')}
                      </div>
                    </div>

                    {message.role ===
                      'user' && (
                      <div className="avatar user-avatar">
                        You
                      </div>
                    )}
                  </div>
                )
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {/* =================================================
            COMPOSER
        ================================================== */}

        <footer className="composer-area">
          {/* MODE SELECTOR */}

          <div className="composer-mode-row">
            <div className="composer-mode-label">
              <span className="mode-small-icon">
                {currentMode.icon}
              </span>

              <strong>
                {currentMode.label}
              </strong>

              <span>
                {currentMode.description}
              </span>
            </div>

            <button
              className="change-mode-button"
              onClick={() =>
                setShowModes(!showModes)
              }
              disabled={processing}
            >
              Change mode
            </button>
          </div>

          {/* COMPOSER */}

          <div className="composer">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              disabled={
                loading ||
                processing ||
                !modelReady
              }
              placeholder={
                loading
                  ? 'Preparing LocalMind...'
                  : studyMode === 'notes'
                    ? notes.trim()
                      ? 'Ask something about your notes...'
                      : 'Add your notes first, then ask a question...'
                    : `Ask LocalMind to ${currentMode.label.toLowerCase()}...`
              }
              onChange={(event) => {
                setInput(
                  event.target.value
                )
              }}
              onKeyDown={handleKeyDown}
            />

            <button
              className="send-button"
              onClick={handleSend}
              disabled={
                loading ||
                processing ||
                !modelReady ||
                !input.trim()
              }
              aria-label="Send message"
            >
              {processing ? (
                <span className="button-spinner" />
              ) : (
                <span className="send-arrow">
                  ↑
                </span>
              )}
            </button>
          </div>

          <div className="composer-footer">
            <span>
              <span className="lock-icon">
                ◆
              </span>

              QVAC · AI inference
            </span>

            <span>
              Press <kbd>Enter</kbd> to send ·{' '}
              <kbd>Shift + Enter</kbd> for a new
              line
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
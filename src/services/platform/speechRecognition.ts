export interface SpeechRecognizerOptions {
  lang?: string
  onResult: (transcript: string) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

export interface SpeechRecognizer {
  start(): void
  stop(): void
  isListening: boolean
  instance?: any
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  )
}

export function createSpeechRecognizer(options: SpeechRecognizerOptions): SpeechRecognizer | null {
  if (!isSpeechRecognitionSupported()) return null

  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  const recognition = new SpeechRecognitionClass()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = options.lang || 'en-US'

  const state = {
    isListening: false,
    instance: recognition,
    start() {
      if (state.isListening) return
      try {
        recognition.start()
        state.isListening = true
      } catch (err: any) {
        options.onError?.(err?.message || 'Failed to start speech recognition')
      }
    },
    stop() {
      if (!state.isListening) return
      try {
        recognition.stop()
      } catch {}
      state.isListening = false
    },
  }

  recognition.onresult = (event: any) => {
    let finalTranscript = ''
    let interimTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const item = event.results[i]
      if (item.isFinal) {
        finalTranscript += item[0].transcript
      } else {
        interimTranscript += item[0].transcript
      }
    }

    const transcript = (finalTranscript || interimTranscript || '').trim()
    if (transcript) {
      options.onResult(transcript)
    }
  }

  recognition.onerror = (event: any) => {
    state.isListening = false
    options.onError?.(event.error || 'Speech recognition error')
  }

  recognition.onend = () => {
    state.isListening = false
    options.onEnd?.()
  }

  return state
}

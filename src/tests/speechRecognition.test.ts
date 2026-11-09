import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
} from '@/services/platform/speechRecognition'

class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = 'en-US'
  onresult: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onend: (() => void) | null = null

  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
}

describe('speechRecognition service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete (window as any).SpeechRecognition
    delete (window as any).webkitSpeechRecognition
  })

  it('detects when SpeechRecognition is not supported', () => {
    expect(isSpeechRecognitionSupported()).toBe(false)
  })

  it('detects when SpeechRecognition or webkitSpeechRecognition is supported', () => {
    (window as any).SpeechRecognition = MockSpeechRecognition
    expect(isSpeechRecognitionSupported()).toBe(true)

    delete (window as any).SpeechRecognition
    ;(window as any).webkitSpeechRecognition = MockSpeechRecognition
    expect(isSpeechRecognitionSupported()).toBe(true)
  })

  it('initializes speech recognizer with correct language and properties', () => {
    (window as any).SpeechRecognition = MockSpeechRecognition

    const onResult = vi.fn()
    const onError = vi.fn()
    const onEnd = vi.fn()

    const recognizer = createSpeechRecognizer({
      lang: 'ar-SA',
      onResult,
      onError,
      onEnd,
    })

    expect(recognizer).not.toBeNull()
    recognizer!.start()

    expect(recognizer!.isListening).toBe(true)

    // Simulate speech recognition result
    const mockEvent = {
      resultIndex: 0,
      results: [
        [
          { transcript: 'قم بتشغيل الاختبارات' },
        ],
      ],
    }
    ;(recognizer as any).instance.onresult(mockEvent)

    expect(onResult).toHaveBeenCalledWith('قم بتشغيل الاختبارات')

    recognizer!.stop()
    expect(recognizer!.isListening).toBe(false)
  })
})

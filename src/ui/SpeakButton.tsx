import { isSpeechSupported, speak } from '@/audio/tts'

interface SpeakButtonProps {
  text: string
  label?: string
}

/** 🔊 "Read it to me". Hidden where the browser can't speak (spec 005 AC9). */
export function SpeakButton({ text, label = 'Read it to me' }: SpeakButtonProps) {
  if (!isSpeechSupported()) return null
  return (
    <button
      type="button"
      className="btn3d btn3d--sky btn3d--lg icon-btn"
      aria-label={label}
      title={label}
      onClick={() => speak(text)}
    >
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path
          d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}

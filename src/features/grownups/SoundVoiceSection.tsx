import { RATE_RANGE } from '@/audio/prefs'
import { speak } from '@/audio/tts'
import { voiceLabel } from '@/audio/voices'
import { Button3D } from '@/ui'
import { useAudioPrefs } from '@/ui/audioPrefs'
import { useVoices } from '@/ui/useSpeech'

const AUTO = 'auto'
export const SAMPLE_LINE = 'Hi! I am Kukoos. What is 36 minus 28? Let us trade a ten!'

/**
 * Sound & voice (spec 009 AC8, AC10): sound on/off and volume, the voice (best one first)
 * with a test button, and speaking speed. Saved for this device.
 */
export function SoundVoiceSection() {
  const { prefs, setPrefs } = useAudioPrefs()
  const voices = useVoices()
  const chosen = voices.some((v) => v.voiceURI === prefs.voiceURI) ? prefs.voiceURI : null

  return (
    <section className="grownup__card" aria-label="Sound and voice">
      <h2>Sound &amp; voice</h2>
      <label className="grownup__check">
        <input
          type="checkbox"
          checked={prefs.soundOn}
          onChange={(e) => setPrefs({ soundOn: e.target.checked })}
        />
        <span>Sound effects</span>
      </label>
      <label className="grownup__field">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={prefs.volume}
          disabled={!prefs.soundOn}
          onChange={(e) => setPrefs({ volume: Number(e.target.value) })}
        />
      </label>
      <label className="grownup__check">
        <input
          type="checkbox"
          checked={prefs.readAloud}
          onChange={(e) => setPrefs({ readAloud: e.target.checked })}
        />
        <span>Read questions aloud</span>
      </label>
      <label className="grownup__field">
        <span>Voice</span>
        <select
          className="grownup__select"
          value={chosen ?? AUTO}
          onChange={(e) => setPrefs({ voiceURI: e.target.value === AUTO ? null : e.target.value })}
        >
          <option value={AUTO}>
            {voices[0] ? `Best on this device: ${voiceLabel(voices[0])}` : 'Device default'}
          </option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {voiceLabel(v)}
            </option>
          ))}
        </select>
      </label>
      <label className="grownup__field">
        <span>Speed</span>
        <input
          type="range"
          min={RATE_RANGE.min}
          max={RATE_RANGE.max}
          step={0.05}
          value={prefs.speechRate}
          onChange={(e) => setPrefs({ speechRate: Number(e.target.value) })}
        />
      </label>
      <p>
        Tip: Microsoft Edge and iPads have the most natural voices. On an iPad, download an
        “Enhanced” voice in Settings → Accessibility → Spoken Content.
      </p>
      <Button3D
        variant="ghost"
        size="md"
        onClick={() =>
          speak(SAMPLE_LINE, {
            rate: prefs.speechRate,
            ...(chosen ? { voiceURI: chosen } : {}),
          })
        }
      >
        Test voice
      </Button3D>
    </section>
  )
}

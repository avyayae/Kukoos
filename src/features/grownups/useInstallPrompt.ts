import { useEffect, useState } from 'react'

/** Chrome/Edge/Android's install event (not in the TS DOM lib yet). */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const ios = (navigator as { standalone?: boolean }).standalone === true
  return ios || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/**
 * Install support (spec 012 AC4): `installed` when running as an installed app; `install`
 * is set only where the browser offers its own install prompt (Chrome, Edge, Android).
 */
export function useInstallPrompt(): { installed: boolean; install: (() => Promise<void>) | null } {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return {
    installed,
    install: event
      ? async () => {
          await event.prompt()
          const choice = await event.userChoice
          if (choice.outcome === 'accepted') setInstalled(true)
          setEvent(null)
        }
      : null,
  }
}

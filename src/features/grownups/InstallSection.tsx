import { Button3D } from '@/ui'
import { useInstallPrompt } from './useInstallPrompt'

/** Where the app lives, e.g. https://avyayae.github.io/Kukoos/ (spec 012). */
function appAddress(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}

/**
 * Grown-ups → Install on a tablet (spec 012 AC4): the address, one-tap install where the
 * browser supports it, and short steps for iPad and Android. Installed, it works offline.
 */
export function InstallSection() {
  const { installed, install } = useInstallPrompt()
  return (
    <section className="grownup__card" aria-label="Install on a tablet">
      <h2>Install on a tablet</h2>
      {installed ? (
        <p data-testid="install-status">
          ✓ Kukoos is installed on this device. It opens from the home screen and works offline.
        </p>
      ) : (
        <>
          <p>
            Open <strong className="install__address">{appAddress()}</strong> on the tablet, then:
          </p>
          <ul className="install__steps">
            <li>
              <strong>iPad / iPhone (Safari):</strong> tap Share, then <em>Add to Home Screen</em>.
            </li>
            <li>
              <strong>Android / Chrome / Edge:</strong> tap the menu (⋮), then <em>Install app</em>.
            </li>
          </ul>
          <p>Once installed it opens full-screen and works without internet.</p>
          {install && (
            <Button3D variant="primary" size="md" onClick={() => void install()}>
              Install app
            </Button3D>
          )}
        </>
      )}
    </section>
  )
}

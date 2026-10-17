import { Button3D, KukoosPlaceholder } from '@/ui'

/** F001 placeholder home screen. Replaced by onboarding / world map in later features. */
export function ShellScreen() {
  return (
    <main className="screen flex flex-col items-center justify-center gap-6 text-center">
      <KukoosPlaceholder size={168} />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-kid-3xl leading-tight font-extrabold text-primary">
          Kukoos Math Quest
        </h1>
        <p className="text-kid-lg text-ink-muted">From Earth to space! 🚀</p>
      </div>
      <div className="w-full max-w-sm">
        <Button3D variant="primary" size="xl" block>
          Start
        </Button3D>
      </div>
    </main>
  )
}

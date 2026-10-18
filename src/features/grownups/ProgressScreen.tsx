import { type CSSProperties, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useProfiles, useRepos } from '@/data'
import {
  type DayReport,
  getBadge,
  getWorld,
  NEW_WALLET,
  type ParentReport,
  parentReport,
  type TimeSettings,
  DEFAULT_TIME_SETTINGS,
  type Wallet,
} from '@/domain'
import { MISTAKES, pctText, shortDay } from './parentCopy'

interface Loaded {
  report: ParentReport
  settings: TimeSettings
  wallet: Wallet
}

/**
 * Grown-ups → Progress (spec 011 AC7): how one kid is doing over the last 14 days —
 * minutes, first-try accuracy, mastery per skill, what needs practice and which
 * regrouping mistakes keep coming back.
 */
export function ProgressScreen() {
  const repos = useRepos()
  const { profile, profiles } = useProfiles()
  const [kidId, setKidId] = useState<string | null>(null)
  const id = kidId ?? profile?.id ?? null
  const [loaded, setLoaded] = useState<{ id: string; data: Loaded } | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    void Promise.all([
      repos.reports.forProfile(id),
      repos.time.settings(id).catch(() => DEFAULT_TIME_SETTINGS),
      repos.rewards
        .wallet(id)
        .then((w) => w.wallet)
        .catch(() => NEW_WALLET),
    ]).then(([input, settings, wallet]) => {
      if (alive) setLoaded({ id, data: { report: parentReport(input), settings, wallet } })
    })
    return () => {
      alive = false
    }
  }, [repos, id])

  const kid = profiles.find((p) => p.id === id)
  const data = loaded?.id === id ? loaded.data : null

  return (
    <main className="screen grownup">
      <div className="grownup__inner progress">
        <header className="flex items-center gap-3">
          <Link
            to="/grown-ups"
            className="btn3d btn3d--ghost btn3d--md icon-btn"
            aria-label="Back to Grown-ups"
          >
            ←
          </Link>
          <h1 className="grownup__title">Progress</h1>
        </header>

        {profiles.length > 1 && (
          <div className="progress__kids" role="tablist" aria-label="Choose a kid">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === id}
                className="progress__kid"
                onClick={() => setKidId(p.id)}
              >
                {p.nickname}
              </button>
            ))}
          </div>
        )}

        {!data ? null : data.report.totals.answers === 0 && data.report.totals.missions === 0 ? (
          <section className="grownup__card">
            <h2>Nothing here yet</h2>
            <p>
              When {kid?.nickname ?? 'your explorer'} plays a mission, you&apos;ll see minutes,
              accuracy, mastery and the mistakes worth practising together.
            </p>
          </section>
        ) : (
          <Dashboard data={data} name={kid?.nickname ?? 'Your explorer'} />
        )}
      </div>
    </main>
  )
}

function Dashboard({ data, name }: { data: Loaded; name: string }) {
  const { report, settings, wallet } = data
  const tiles = [
    { label: 'Missions done', value: String(report.totals.missions) },
    { label: 'Minutes (14 days)', value: String(report.totals.minutes) },
    { label: 'First try (14 days)', value: pctText(report.totals.firstTryPct) },
    { label: 'Streak', value: `🔥 ${wallet.streakCount}` },
    { label: 'Level', value: `⭐ ${wallet.level}` },
  ]
  return (
    <>
      <section className="grownup__card" aria-label="Summary">
        <h2>{name} at a glance</h2>
        <ul className="progress__tiles">
          {tiles.map((t) => (
            <li key={t.label} className="progress__tile">
              <span className="progress__tile-value num">{t.value}</span>
              <span className="progress__tile-label">{t.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grownup__card" aria-label="Minutes per day">
        <h2>Minutes per day</h2>
        <MinutesChart days={report.days} goalMin={settings.goalMin} />
        <p className="progress__legend">
          <span className="progress__key progress__key--lesson" /> in missions
          <span className="progress__key progress__key--total" /> in the app
          <span className="progress__key progress__key--goal" /> daily goal ({settings.goalMin} min)
        </p>
      </section>

      <section className="grownup__card" aria-label="First-try accuracy">
        <h2>First-try accuracy</h2>
        <p>Share of answers right on the first try. Around 80% means the level is just right.</p>
        <ol className="progress__accuracy">
          {report.days.map((d) => (
            <li key={d.date} className="progress__acc" data-empty={d.firstTryPct === null}>
              <span className="progress__acc-day">{shortDay(d.date)}</span>
              <span className="progress__acc-pct num">{pctText(d.firstTryPct)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grownup__card" aria-label="Mistakes to practise">
        <h2>Mistakes that keep coming back</h2>
        {report.misconceptions.length === 0 ? (
          <p>No repeated regrouping mistakes in the last 14 days. 🎉</p>
        ) : (
          <ul className="progress__mistakes">
            {report.misconceptions.map((m) => {
              const copy = MISTAKES[m.key]
              return (
                <li key={m.key} className="progress__mistake" data-testid={`mistake-${m.key}`}>
                  <strong>
                    {copy.label}: {m.week}
                  </strong>{' '}
                  this week ({m.fortnight} in 14 days)
                  <span className="progress__example">e.g. {copy.example}</span>
                  <span className="progress__tip">Try together: {copy.tip}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="grownup__card" aria-label="Needs practice">
        <h2>Needs practice</h2>
        {report.needsPractice.length === 0 ? (
          <p>Nothing stands out. Keep going!</p>
        ) : (
          <ul className="progress__practice">
            {report.needsPractice.map((p) => (
              <li key={`${p.reason}:${p.skillId}`}>
                <strong>{p.title}</strong>{' '}
                {p.reason === 'review'
                  ? '— due for a review'
                  : `— ${pctText(p.firstTryPct)} first try lately`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grownup__card" aria-label="Mastery">
        <h2>Mastery by mission</h2>
        {report.mastery.map((w) => (
          <div key={w.worldId} className="progress__world">
            <h3>{getWorld(w.worldId).title}</h3>
            <ul className="progress__heatmap">
              {w.skills.map((s) => (
                <li
                  key={s.skillId}
                  className="progress__cell"
                  style={{ '--p': Math.round(s.mastery * 100) } as CSSProperties}
                  data-crowned={s.crowned}
                >
                  <span className="progress__cell-title">{s.title}</span>
                  <span className="progress__cell-value">
                    {s.crowned
                      ? s.preMastered && s.attempts === 0
                        ? '👑 known'
                        : '👑 mastered'
                      : s.attempts === 0
                        ? 'not started'
                        : `${Math.round(s.mastery * 100)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grownup__card" aria-label="Recent badges">
        <h2>Recent badges</h2>
        {report.recentBadges.length === 0 ? (
          <p>No badges yet.</p>
        ) : (
          <ul className="progress__badges">
            {report.recentBadges.map((b) => {
              const badge = getBadge(b.badgeId)
              return (
                <li key={b.badgeId}>
                  <span aria-hidden="true">{badge?.emoji}</span> {badge?.name ?? b.badgeId} ·{' '}
                  {new Date(b.unlockedAt).toLocaleDateString()}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}

const CHART = { w: 320, h: 120, pad: 4 }

/** 14 bars (app time behind, mission time in front) with a dashed goal line, plus a table for screen readers. */
function MinutesChart({ days, goalMin }: { days: readonly DayReport[]; goalMin: number }) {
  const max = Math.max(goalMin, ...days.map((d) => d.totalMinutes), 1)
  const slot = CHART.w / days.length
  const bar = slot * 0.7
  const y = (min: number) => CHART.h - (min / max) * (CHART.h - CHART.pad)
  return (
    <figure className="progress__chart">
      <svg viewBox={`0 0 ${CHART.w} ${CHART.h + 16}`} aria-hidden="true">
        {days.map((d, i) => {
          const x = i * slot + (slot - bar) / 2
          return (
            <g key={d.date}>
              <rect
                className="progress__bar progress__bar--total"
                x={x}
                y={y(d.totalMinutes)}
                width={bar}
                height={CHART.h - y(d.totalMinutes)}
                rx="3"
              />
              <rect
                className="progress__bar progress__bar--lesson"
                x={x}
                y={y(d.lessonMinutes)}
                width={bar}
                height={CHART.h - y(d.lessonMinutes)}
                rx="3"
              />
              <text className="progress__axis" x={x + bar / 2} y={CHART.h + 12} textAnchor="middle">
                {shortDay(d.date).slice(0, 1)}
              </text>
            </g>
          )
        })}
        <line className="progress__goal" x1="0" x2={CHART.w} y1={y(goalMin)} y2={y(goalMin)} />
      </svg>
      <table className="sr-only">
        <caption>Minutes per day, last 14 days</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>In missions</th>
            <th>In the app</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.lessonMinutes}</td>
              <td>{d.totalMinutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

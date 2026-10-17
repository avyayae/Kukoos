/** Local calendar date as yyyy-mm-dd (for file names). */
export function localDate(at: number): string {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function backupFileName(at: number): string {
  return `kukoos-backup-${localDate(at)}.json`
}

/** Saves `data` as a JSON file via a temporary link (works offline, no server). */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

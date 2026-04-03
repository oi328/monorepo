export function getImportDisplayStatus(exportRow, jobSummary) {
  const meta = exportRow?.meta_data || exportRow?.metaData || {}
  const jobId = Number(meta?.job_id || meta?.jobId || exportRow?.job_id || exportRow?.jobId || 0) || null

  const pickNum = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  const buildHint = ({ failed, skipped, warn, dup }) => {
    const parts = []
    if (failed > 0) parts.push(`${failed} failed`)
    if (skipped > 0) parts.push(`${skipped} skipped`)
    if (warn > 0) parts.push(`${warn} warnings`)
    if (dup > 0) parts.push(`${dup} duplicates`)
    return parts.join(', ')
  }

  // If job exists, prefer job-based logic.
  if (jobId) {
    const hasCounters =
      jobSummary &&
      (jobSummary.total_rows != null ||
        jobSummary.success_rows != null ||
        jobSummary.failed_rows != null ||
        jobSummary.duplicate_rows != null ||
        jobSummary.skipped_rows != null ||
        jobSummary.warning_rows != null)

    // If counters are not available in this context, fall back to the exports row status (if present)
    // instead of showing a misleading "Processing" for historical rows.
    if (!hasCounters) {
      const legacyStatus = String(exportRow?.status || '').toLowerCase()
      const errorMsg = String(exportRow?.error_message || exportRow?.errorMessage || '').trim()
      const hasLegacyError = errorMsg.length > 0

      // Do not include "(Legacy)" in UI labels; keep `source` for internal use.
      if (legacyStatus === 'failed') return { label: 'Failed', variant: 'error', source: 'legacy' }
      if (legacyStatus === 'success' && hasLegacyError) return { label: 'Completed with Issues', variant: 'warning', source: 'legacy' }
      if (legacyStatus === 'success') return { label: 'Completed', variant: 'success', source: 'legacy' }

      // Unknown legacy status; assume still loading.
      return { label: 'Processing', variant: 'info', source: 'job' }
    }

    const jobStatus = String(jobSummary?.status || '').toLowerCase()
    if (['queued', 'processing'].includes(jobStatus)) {
      return { label: 'Processing', variant: 'info', source: 'job' }
    }
    if (jobStatus === 'canceled') {
      return { label: 'Canceled', variant: 'neutral', source: 'job' }
    }
    if (jobStatus === 'failed') {
      return { label: 'Failed', variant: 'error', source: 'job' }
    }

    const total = pickNum(jobSummary?.total_rows)
    const success = pickNum(jobSummary?.success_rows)
    const failed = pickNum(jobSummary?.failed_rows)
    const dup = pickNum(jobSummary?.duplicate_rows)
    const skipped = pickNum(jobSummary?.skipped_rows)
    const warn = pickNum(jobSummary?.warning_rows)

    const hint = buildHint({ failed, skipped, warn, dup })

    // Rule C — Failed
    if (total === 0) return { label: 'Failed', variant: 'error', source: 'job', hint }
    if (success === 0 && dup === 0 && failed + skipped > 0) {
      return { label: 'Failed', variant: 'error', source: 'job', hint }
    }

    // Rule A — Completed (clean)
    if (success > 0 && failed === 0 && dup === 0 && skipped === 0 && warn === 0) {
      return { label: 'Completed', variant: 'success', source: 'job' }
    }

    // Rule B — Completed with Issues
    if (success > 0 && (failed > 0 || dup > 0 || skipped > 0 || warn > 0)) {
      return { label: 'Completed with Issues', variant: 'warning', source: 'job', hint }
    }
    if (success === 0 && dup > 0) {
      return { label: 'Completed with Issues', variant: 'warning', source: 'job', hint }
    }
    if (success === 0 && warn > 0) {
      return { label: 'Completed with Issues', variant: 'warning', source: 'job', hint }
    }

    // Default (safe)
    return { label: 'Completed with Issues', variant: 'warning', source: 'job', hint }
  }

  // Legacy fallback (exports only)
  const legacyStatus = String(exportRow?.status || '').toLowerCase()
  const errorMsg = String(exportRow?.error_message || exportRow?.errorMessage || '').trim()
  const hasLegacyError = errorMsg.length > 0

  // Do not show "(Legacy)" in UI labels; keep `source` for internal use.
  if (legacyStatus === 'failed') return { label: 'Failed', variant: 'error', source: 'legacy' }
  if (legacyStatus === 'success' && hasLegacyError) return { label: 'Completed with Issues', variant: 'warning', source: 'legacy' }
  if (legacyStatus === 'success') return { label: 'Completed', variant: 'success', source: 'legacy' }

  return { label: '—', variant: 'neutral', source: 'legacy' }
}

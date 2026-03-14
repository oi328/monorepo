
/**
 * Compact icon-only actions toolbar used in User Management tables.
 * Uses .btn-icon with title tooltips for accessibility.
 */
export default function UMActionButtons({
  onEdit,
  onChangePassword,
  onToggleActive,
  onDelete,
  onEnable,
  onRefresh,
  onAssignRotation,
  onDelayRotation,
}) {
  return (
    <div className="action-toolbar">
      <button className="btn-icon" title="Edit" onClick={onEdit}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
        </svg>
      </button>

      <button className="btn-icon" title="Change Password" onClick={onChangePassword}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          <path d="M12 16v3"></path>
          <path d="M10 16h4"></path>
        </svg>
      </button>

      <button className="btn-icon" title="Toggle Active" onClick={onToggleActive}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="18" height="10" rx="5"></rect>
          <circle cx="9" cy="12" r="3"></circle>
        </svg>
      </button>

      <button className="btn-icon" title="Delete" onClick={onDelete}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>

      {onEnable && (
        <button className="btn-icon" title="Enable" onClick={onEnable}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M9 12l2 2 4-4"></path>
          </svg>
        </button>
      )}
      {onRefresh && (
        <button className="btn-icon" title="Refresh" onClick={onRefresh}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a10 10 0 0 1 14.88-3.36L23 10"></path>
            <path d="M1 14l4.62 4.62A10 10 0 0 0 20.49 15"></path>
          </svg>
        </button>
      )}
      {onAssignRotation && (
        <button className="btn-icon" title="Assign Rotation" onClick={onAssignRotation}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v5"></path>
            <path d="M12 17v5"></path>
            <path d="M2 12h5"></path>
            <path d="M17 12h5"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      )}
      {onDelayRotation && (
        <button className="btn-icon" title="Delay Rotation" onClick={onDelayRotation}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5"></path>
            <path d="M21 21v-5h-5"></path>
            <path d="M5 13a7 7 0 0 0 12 3"></path>
            <path d="M19 11a7 7 0 0 0-12-3"></path>
          </svg>
        </button>
      )}
    </div>
  )
}
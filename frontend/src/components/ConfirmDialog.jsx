import { useEffect } from 'react'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}

const boxStyle = {
  background: 'Canvas',
  color: 'CanvasText',
  border: '1px solid GrayText',
  borderRadius: 8,
  padding: 24,
  maxWidth: 420,
  width: '100%',
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  busy = false,
  onConfirm,
  onCancel,
}) {
  // Escape closes the window.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={boxStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" style={{ marginTop: 0 }}>
          {title}
        </h3>
        <p>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
import Icon from './Icon'
import { useStore } from '../store'

export default function ConfirmDialog() {
  const { confirmState, closeConfirm } = useStore()
  const { open, title, message, confirmText, onConfirm } = confirmState
  if (!open) return null

  const go = () => {
    closeConfirm()
    onConfirm?.()
  }

  return (
    <div className="sheet-overlay" onClick={closeConfirm}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {title && <div style={{ fontWeight: 700, fontSize: 15, textAlign: 'center' }}>{title}</div>}
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, textAlign: 'center', padding: '10px 4px 4px' }}>
          {message}
        </p>
        <button
          className="btn btn-block"
          style={{ marginTop: 12, background: 'var(--danger-soft)', color: 'var(--danger)' }}
          onClick={go}
        >
          <Icon name="trash" size={17} /> {confirmText}
        </button>
        <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--muted)' }} onClick={closeConfirm}>
          取消
        </button>
      </div>
    </div>
  )
}

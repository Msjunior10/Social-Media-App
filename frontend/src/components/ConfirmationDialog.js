import React from 'react';
import './ConfirmationDialog.css';

function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isBusy = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirmation-dialog-backdrop" role="presentation" onClick={isBusy ? undefined : onCancel}>
      <div
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirmation-dialog-glow" aria-hidden="true"></div>
        <div className="confirmation-dialog-header">
          <span className={`confirmation-dialog-badge confirmation-dialog-badge-${tone}`}>{tone === 'danger' ? 'Warning' : 'Confirm'}</span>
          <h3 id="confirmation-dialog-title">{title}</h3>
          <p>{description}</p>
        </div>
        <div className="confirmation-dialog-actions">
          <button type="button" className="confirmation-dialog-button confirmation-dialog-button-secondary" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </button>
          <button type="button" className={`confirmation-dialog-button confirmation-dialog-button-${tone}`} onClick={onConfirm} disabled={isBusy}>
            {isBusy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog;
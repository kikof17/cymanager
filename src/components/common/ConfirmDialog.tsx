import React from "react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonClassName?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  confirmButtonClassName = "button button-danger",
}) => {
  if (!open) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        {title && <h3 className="confirm-dialog-title">{title}</h3>}
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-actions">
          <button className="button" onClick={onCancel} type="button">{cancelLabel}</button>
          <button className={confirmButtonClassName} onClick={onConfirm} type="button">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

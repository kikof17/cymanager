import React from "react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        {title && <h3 className="confirm-dialog-title">{title}</h3>}
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-actions">
          <button className="button" onClick={onCancel} type="button">Annuler</button>
          <button className="button button-danger" onClick={onConfirm} type="button">Supprimer</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

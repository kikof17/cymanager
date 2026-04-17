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
    <div style={{
      position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.25)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0002', padding: 32, minWidth: 340, maxWidth: '90vw', color: '#181c24' }}>
        {title && <h3 style={{ color: '#181c24' }}>{title}</h3>}
        <div style={{ marginBottom: 24, color: '#181c24' }}>{message}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="button" onClick={onCancel} type="button">Annuler</button>
          <button className="button button-danger" onClick={onConfirm} type="button">Supprimer</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

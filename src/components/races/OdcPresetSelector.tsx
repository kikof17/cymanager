type OdcPresetSelectorProps = {
  onApplyDefault: () => void;
};

export default function OdcPresetSelector({
  onApplyDefault,
}: OdcPresetSelectorProps) {
  return (
    <div className="inline-actions">
      <button type="button" className="button button-secondary" onClick={onApplyDefault}>
        Réappliquer les réglages automatiques
      </button>
    </div>
  );
}
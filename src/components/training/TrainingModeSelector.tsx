import type { StrategyMode } from "../../types/training";

type TrainingModeSelectorProps = {
  value: StrategyMode;
  onChange: (value: StrategyMode) => void;
};

export default function TrainingModeSelector({
  value,
  onChange,
}: TrainingModeSelectorProps) {
  return (
    <div className="training-mode-group">
      <label className="field-label" htmlFor="training-mode">
        Mode de calcul
      </label>

      <select
        id="training-mode"
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value as StrategyMode)}
      >
        <option value="mixte">Mixte</option>
        <option value="court-terme">Court terme</option>
        <option value="long-terme">Long terme</option>
      </select>
    </div>
  );
}
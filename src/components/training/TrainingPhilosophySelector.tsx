import type { TrainingPhilosophy } from "../../types/training";

type TrainingPhilosophySelectorProps = {
  value: TrainingPhilosophy;
  onChange: (value: TrainingPhilosophy) => void;
};

export default function TrainingPhilosophySelector({
  value,
  onChange,
}: TrainingPhilosophySelectorProps) {
  return (
    <div className="training-mode-group">
      <label className="field-label" htmlFor="training-philosophy">
        Philosophie du plan
      </label>

      <select
        id="training-philosophy"
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value as TrainingPhilosophy)}
      >
        <option value="polyvalent">Base polyvalente</option>
        <option value="immediat">Gagner tout de suite</option>
        <option value="montagne-clm">Montagne / CLM</option>
      </select>
    </div>
  );
}
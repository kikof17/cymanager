import { useState } from "react";

type RosterImportBoxProps = {
  onImport: (rawText: string) => void;
};

export default function RosterImportBox({ onImport }: RosterImportBoxProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    onImport(value);
    setValue("");
  }

  return (
    <form className="roster-import-form" onSubmit={handleSubmit}>
      <label htmlFor="roster-import" className="field-label">
        Colle ici un ou plusieurs coureurs
      </label>

      <textarea
        id="roster-import"
        className="textarea"
        rows={14}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Colle le texte brut CyManager ici..."
      />

      <div className="inline-actions">
        <button type="submit" className="button button-primary">
          Importer / mettre à jour
        </button>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => setValue("")}
        >
          Vider
        </button>
      </div>
    </form>
  );
}
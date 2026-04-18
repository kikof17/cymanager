import type {
  ClubObjective,
  ClubSettings,
  DivisionLevel,
  FacilityKey,
  FacilitySettings,
  SalaryTolerance,
} from "../../types/settings";

type ClubSettingsFormProps = {
  settings: ClubSettings;
  onChange: (next: ClubSettings) => void;
};

const FACILITY_LABELS: Record<FacilityKey, string> = {
  headOffice: "Siège social",
  trainingCenter: "Centre d'entraînement",
  formationCenter: "Centre de formation",
  shop: "Boutique",
};

const DIVISIONS: DivisionLevel[] = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9"];
const OBJECTIVES: ClubObjective[] = ["formation", "performance", "mixte"];
const SALARY_TOLERANCES: SalaryTolerance[] = ["prudente", "normale", "agressive"];

export default function ClubSettingsForm({
  settings,
  onChange,
}: ClubSettingsFormProps) {
  function updateFacility<K extends keyof FacilitySettings>(
    facilityKey: FacilityKey,
    key: K,
    value: FacilitySettings[K]
  ) {
    onChange({
      ...settings,
      facilities: {
        ...settings.facilities,
        [facilityKey]: {
          ...settings.facilities[facilityKey],
          [key]: value,
        },
      },
    });
  }

  function updateRoot<K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) {
    onChange({
      ...settings,
      [key]: value,
    });
  }



  return (
    <form className="page-stack" onSubmit={(event) => event.preventDefault()}>
      <div className="message-box">
        <p className="muted">
          Le solde financier n'est plus saisi ici. Il est calculé depuis la page Finance, et tout lancement de travaux sauvegardé dans cette page y crée automatiquement une dépense.
        </p>
      </div>

      {/* Bloc divisions */}
      <div className="settings-grid" style={{gridTemplateColumns: '1fr 1fr', gap: 24}}>
        {/* Ligne Pro */}
        <div>
          <label className="field-label" htmlFor="division-pro-actuelle">Division actuelle équipe Pro</label>
          <select
            id="division-pro-actuelle"
            className="input"
            value={settings.divisionPro}
            onChange={e => updateRoot("divisionPro", e.target.value as DivisionLevel)}
          >
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="division-pro-visee">Division visée équipe Pro</label>
          <select
            id="division-pro-visee"
            className="input"
            value={settings.targetDivision}
            onChange={e => updateRoot("targetDivision", e.target.value as DivisionLevel)}
          >
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
        </div>
        {/* Ligne U25 */}
        <div>
          <label className="field-label" htmlFor="division-u25-actuelle">Division actuelle équipe U25</label>
          <select
            id="division-u25-actuelle"
            className="input"
            value={settings.divisionU25}
            onChange={e => updateRoot("divisionU25", e.target.value as DivisionLevel)}
          >
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="division-u25-visee">Division visée équipe U25</label>
          <select
            id="division-u25-visee"
            className="input"
            value={settings.targetDivision}
            onChange={e => updateRoot("targetDivision", e.target.value as DivisionLevel)}
          >
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
        </div>
        {/* Ligne U21 */}
        <div>
          <label className="field-label" htmlFor="division-u21-actuelle">Division actuelle équipe U21</label>
          <select
            id="division-u21-actuelle"
            className="input"
            value={settings.divisionU21}
            onChange={e => updateRoot("divisionU21", e.target.value as DivisionLevel)}
          >
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="division-u21-visee">Division visée équipe U21</label>
          <select
            id="division-u21-visee"
            className="input"
            value={settings.targetDivision}
            onChange={e => updateRoot("targetDivision", e.target.value as DivisionLevel)}
          >
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bloc autres réglages */}
      <div className="settings-grid">
        <div>
          <label className="field-label" htmlFor="club-objective">
            Objectif club
          </label>
          <select
            id="club-objective"
            className="input"
            value={settings.clubObjective}
            onChange={(event) =>
              updateRoot("clubObjective", event.target.value as ClubObjective)
            }
          >
            {OBJECTIVES.map((objective) => (
              <option key={objective} value={objective}>
                {objective}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="salary-tolerance">
            Tolérance salariale
          </label>
          <select
            id="salary-tolerance"
            className="input"
            value={settings.salaryTolerance}
            onChange={(event) =>
              updateRoot("salaryTolerance", event.target.value as SalaryTolerance)
            }
          >
            {SALARY_TOLERANCES.map((tolerance) => (
              <option key={tolerance} value={tolerance}>
                {tolerance}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(Object.keys(FACILITY_LABELS) as FacilityKey[]).map((facilityKey) => {
        const facility = settings.facilities[facilityKey];

        return (
          <div key={facilityKey} className="settings-facility-block">
            <h3 className="card-title">{FACILITY_LABELS[facilityKey]}</h3>

            <div className="settings-grid">
              <div>
                <label className="field-label" htmlFor={`${facilityKey}-level`}>
                  Niveau actuel
                </label>
                <input
                  id={`${facilityKey}-level`}
                  className="input"
                  type="number"
                  min={0}
                  max={20}
                  value={facility.level}
                  onChange={(event) =>
                    updateFacility(
                      facilityKey,
                      "level",
                      Number.parseInt(event.target.value || "0", 10)
                    )
                  }
                />
              </div>

              <div>
                <label className="field-label" htmlFor={`${facilityKey}-target`}>
                  Niveau visé
                </label>
                <input
                  id={`${facilityKey}-target`}
                  className="input"
                  type="number"
                  min={0}
                  max={20}
                  value={facility.targetLevel ?? ""}
                  onChange={(event) =>
                    updateFacility(
                      facilityKey,
                      "targetLevel",
                      event.target.value.trim() === ""
                        ? null
                        : Number.parseInt(event.target.value, 10)
                    )
                  }
                />
              </div>
            </div>

            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={facility.upgradeInProgress}
                onChange={(event) =>
                  updateFacility(
                    facilityKey,
                    "upgradeInProgress",
                    event.target.checked
                  )
                }
              />
              <span>Travaux en cours</span>
            </label>

            <div>
              <label
                className="field-label"
                htmlFor={`${facilityKey}-started-at`}
              >
                Date de lancement
              </label>
              <input
                id={`${facilityKey}-started-at`}
                className="input"
                type="datetime-local"
                value={facility.upgradeStartedAt}
                onChange={(event) =>
                  updateFacility(
                    facilityKey,
                    "upgradeStartedAt",
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="field-label" htmlFor={`${facilityKey}-notes`}>
                Notes
              </label>
              <textarea
                id={`${facilityKey}-notes`}
                className="textarea"
                rows={4}
                value={facility.notes}
                onChange={(event) =>
                  updateFacility(facilityKey, "notes", event.target.value)
                }
                placeholder="Notes sur cette installation..."
              />
            </div>
          </div>
        );
      })}

      <div>
        <label className="field-label" htmlFor="global-notes">
          Notes globales du club
        </label>
        <textarea
          id="global-notes"
          className="textarea"
          rows={5}
          value={settings.globalNotes}
          onChange={(event) => updateRoot("globalNotes", event.target.value)}
          placeholder="Notes générales, priorités, blocages..."
        />
      </div>
    </form>
  );
}
"use client";

import {
  CONDITION_AREAS,
  CONDITION_GRADES,
  type ConditionAreaId,
  type ConditionGrade,
  type ConditionState,
} from "@/config/condition";

/**
 * Four areas, three grades, and a note box that only appears once there
 * is something to say. Nothing is pre-selected: presuming a car is
 * "good" and making the seller downgrade it is the wrong starting
 * posture, and it quietly biases the answers.
 */
export function ConditionGrid({
  value,
  onChange,
}: {
  value: ConditionState;
  onChange: (next: ConditionState) => void;
}) {
  function setGrade(area: ConditionAreaId, grade: ConditionGrade) {
    onChange({ ...value, [area]: { ...value[area], grade } });
  }

  function setNote(area: ConditionAreaId, note: string) {
    const current = value[area];
    if (!current) return;
    onChange({ ...value, [area]: { ...current, note } });
  }

  return (
    <div className="flex flex-col gap-8">
      {CONDITION_AREAS.map((area) => {
        const chosen = value[area.id]?.grade;
        return (
          <fieldset key={area.id}>
            <legend className="text-sm font-medium">{area.label}</legend>
            <p className="mt-1 text-caption text-structure">{area.prompt}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {CONDITION_GRADES.map((grade) => {
                const active = chosen === grade.id;
                return (
                  <label
                    key={grade.id}
                    title={grade.hint}
                    className={`cursor-pointer rounded border px-4 py-2.5 text-sm transition-colors duration-200 ${
                      active
                        ? "border-oxblood bg-oxblood text-paper"
                        : "border-line hover:border-structure"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`condition-${area.id}`}
                      value={grade.id}
                      checked={active ?? false}
                      onChange={() => setGrade(area.id, grade.id)}
                      className="sr-only"
                    />
                    {grade.label}
                  </label>
                );
              })}
            </div>

            {chosen && chosen !== "good" && (
              <div className="step-in mt-3">
                <label
                  htmlFor={`note-${area.id}`}
                  className="text-caption text-structure"
                >
                  {area.ask} Describing it now is what keeps the offer fixed.
                </label>
                <input
                  id={`note-${area.id}`}
                  type="text"
                  value={value[area.id]?.note ?? ""}
                  onChange={(event) => setNote(area.id, event.target.value)}
                  className="mt-1.5 w-full rounded border border-line bg-paper px-4 py-2.5 text-sm transition-colors duration-200 focus:border-oxblood"
                />
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

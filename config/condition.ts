/**
 * The condition grid for form step 2.
 *
 * Written as four questions a person would actually ask while walking
 * round a car, not as a scoring rubric. The grades deliberately avoid
 * the language of marking — nothing here is a failure, and the copy
 * says so, because an honest "poor" is worth more to us than an
 * optimistic "good" we have to correct on the driveway.
 */
export const CONDITION_AREAS = [
  {
    id: "bodywork",
    label: "Bodywork",
    prompt: "Panels, paint, bumpers, glass.",
    ask: "What should we know about the bodywork?",
  },
  {
    id: "interior",
    label: "Interior",
    prompt: "Seats, trim, carpets, and how it smells.",
    ask: "What should we know about the interior?",
  },
  {
    id: "mechanical",
    label: "How it drives",
    prompt: "Engine, gearbox, brakes, suspension, anything that has changed.",
    ask: "What should we know mechanically?",
  },
  {
    id: "tyres",
    label: "Tyres and wheels",
    prompt: "Tread left, and any kerbing.",
    ask: "What should we know about the tyres?",
  },
] as const;

export const CONDITION_GRADES = [
  {
    id: "good",
    label: "Good",
    hint: "What you would expect for the age and mileage.",
  },
  {
    id: "fair",
    label: "Fair",
    hint: "Some wear worth mentioning.",
  },
  {
    id: "poor",
    label: "Needs work",
    hint: "Something a buyer would have to put right.",
  },
] as const;

export type ConditionAreaId = (typeof CONDITION_AREAS)[number]["id"];
export type ConditionGrade = (typeof CONDITION_GRADES)[number]["id"];

export type ConditionState = Partial<
  Record<ConditionAreaId, { grade: ConditionGrade; note?: string }>
>;

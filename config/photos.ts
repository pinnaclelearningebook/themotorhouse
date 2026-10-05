/**
 * The guided shot list (ARCHITECTURE.md section 4).
 *
 * Order matters: it is the order a person actually walks around a car.
 * `repeatable` shots can be added more than once; everything else is
 * one slot. Prompts are written as instructions to a seller standing on
 * their driveway, not as field labels.
 */
export interface ShotType {
  id: string;
  label: string;
  prompt: string;
  repeatable?: boolean;
}

export const MAX_PHOTOS = 12;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const SHOT_TYPES: ShotType[] = [
  {
    id: "front-three-quarter",
    label: "Front three-quarter",
    prompt: "Stand at the front corner so you get the front and one side in one shot.",
  },
  {
    id: "rear-three-quarter",
    label: "Rear three-quarter",
    prompt: "The opposite back corner, so between them the whole car is covered.",
  },
  {
    id: "driver-side",
    label: "Driver's side",
    prompt: "Straight on from the side, far enough back to get the whole car in.",
  },
  {
    id: "passenger-side",
    label: "Passenger side",
    prompt: "The same again from the other side.",
  },
  {
    id: "interior-front",
    label: "Front interior",
    prompt: "Driver's door open, showing the seats and the wheel.",
  },
  {
    id: "interior-rear",
    label: "Rear interior",
    prompt: "The back seats, as they are. Lived-in is fine and expected.",
  },
  {
    id: "dash-with-mileage",
    label: "Dashboard and mileage",
    prompt: "Ignition on so the mileage reads. This one saves a phone call later.",
  },
  { id: "boot", label: "Boot", prompt: "Boot open, empty if that is easy." },
  {
    id: "wheels",
    label: "Wheels",
    prompt: "Each wheel, including any kerbing. Damage here is priced in, not held against you.",
    repeatable: true,
  },
  {
    id: "damage",
    label: "Damage or wear",
    prompt: "Anything you would point out in person. Showing it early is what keeps the offer fixed.",
    repeatable: true,
  },
];

export function shotType(id: string): ShotType | undefined {
  return SHOT_TYPES.find((shot) => shot.id === id);
}

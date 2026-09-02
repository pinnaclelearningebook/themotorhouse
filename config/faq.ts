/**
 * FAQ content — single source for the /faq page and its FAQPage JSON-LD.
 *
 * An entry with `answer: null` is awaiting a business decision: it renders
 * on the page with an AwaitingInfo chip (dev only) and is EXCLUDED from
 * the JSON-LD, because publishing placeholder text to Google as a
 * structured answer is worse than omitting the question until it can be
 * answered. Each pending entry has a matching line in PENDING-INFO.md.
 */
export interface FaqEntry {
  question: string;
  answer: string | null;
  /** AwaitingInfo label when answer is null. */
  pendingLabel?: string;
}

export const FAQ: FaqEntry[] = [
  {
    question: "How quickly will I get my offer?",
    answer:
      "Within two hours of your enquiry, from a person, not an algorithm. If you enquire late in the evening, you will hear from us first thing the next morning.",
  },
  {
    question: "Is the offer really firm, or will it change when you arrive?",
    answer:
      "It is firm. The number we give you is the number we pay. We do not inspect the car at collection and start finding deductions — if something about the car surprises us and you told us what you knew, that is our problem, not yours.",
  },
  {
    question: "How long does my offer stand?",
    answer:
      "Seven days from the date we send it, provided the mileage has not materially increased and the car's condition is as you described it. If seven days is not long enough, tell us and we will look at it again.",
  },
  {
    question: "How is the offer calculated?",
    answer:
      "A person who trades your kind of car prices it on model, age, mileage, specification, condition and service history — and on where the car will sell best. For young premium SUVs that often means export demand, which is why our offers on those cars can beat a general buyer's.",
  },
  {
    question: "My car has outstanding finance. Can you still buy it?",
    answer:
      "Yes, this is routine. You request a settlement figure from your finance company, we pay the lender directly and pay the balance to you. If the settlement is higher than our offer, you pay us the difference before the car is collected.",
  },
  {
    question: "Do you take a car in part-exchange?",
    answer: null,
    pendingLabel: "Part-exchange policy decision",
  },
  {
    question: "Where do you collect, and what does it cost?",
    answer:
      "We collect free anywhere in mainland UK, at a time you agree with us. You do not drive the car anywhere or pay anything for collection.",
  },
  {
    question: "When and how do I get paid?",
    answer:
      "By bank transfer, in full, before the transporter leaves with your car. You watch the money arrive before the car goes anywhere.",
  },
  {
    question: "My car has damage or warning lights. Will you still buy it?",
    answer:
      "Usually, yes. Tell us honestly when you enquire and it is priced into the offer before we make it — not deducted after. Honest detail up front is what lets the number stand.",
  },
  {
    question: "What if I do not have full service history?",
    answer:
      "We still buy cars with partial or missing history. It affects the number, and we will check the manufacturer's digital service records where they exist, but it does not rule your car out.",
  },
  {
    question: "Do you buy non-runners?",
    answer: null,
    pendingLabel: "Non-runner policy decision",
  },
  {
    question: "Do you buy Category N or Category S write-offs?",
    answer: null,
    pendingLabel: "Category N/S policy decision",
  },
  {
    question: "What documents do I need to sell my car?",
    answer:
      "The V5C logbook in your name, both sets of keys, whatever service records you have, and a finance settlement letter if there is outstanding finance. If something is missing, tell us — most gaps can be worked around.",
  },
  {
    question: "Can the offer change after you have seen the car?",
    answer:
      "No — that is the point of the service. The only exception is a car that is materially different from how it was described: significantly more mileage, or damage we were not told about. Describe the car honestly and the number does not move.",
  },
  {
    question: "Do I need to be there when you collect the car?",
    answer:
      "You, or an adult you authorise, needs to be there to hand over the keys and documents and confirm payment has arrived. Collection itself usually takes under half an hour.",
  },
  {
    question: "What happens to my car after you buy it?",
    answer:
      "Young premium SUVs often go to our buyers in Cyprus, where traffic drives on the left and right-hand-drive cars like yours are the local standard. Everything else is sold on through the motor trade. Nothing sits on our books for long, which is part of why we can pay properly.",
  },
  {
    question: "What if I change my mind?",
    answer:
      "Nothing is binding until you accept the offer and we collect the car. Decline the offer, ignore it, or come back within the seven days — there is no fee and no obligation at any point before handover.",
  },
];

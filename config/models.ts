/**
 * Model landing pages. One template, seven genuinely distinct sets of copy.
 *
 * Rules for anyone editing this file:
 * - Never template-spin. If a paragraph would read the same with the model
 *   name swapped, it is not good enough and Google treats it as a doorway page.
 * - Every model needs at least one detail only someone who actually trades
 *   that car would know (CLAUDE.md section 4, lever 8).
 * - Every external claim needs a source here AND a line in SOURCES.md.
 * - Data tokens (years, mileages, figures, money) are wrapped in [[...]] and
 *   render in mono. See renderCopy() in components/models/Prose.tsx.
 */

export interface ModelFaq {
  question: string;
  answer: string;
}

export interface ModelSource {
  label: string;
  url: string;
}

export interface ModelEntry {
  slug: string;
  /** Display name, e.g. "Range Rover Evoque". */
  name: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Why we want this car and what moves its value. */
  opener: string[];
  specialist: {
    heading: string;
    body: string[];
    sources: ModelSource[];
  };
  /**
   * Model-specific framing of the export story. Never names the
   * destination — that belongs on /export only. Frame it as export
   * demand, and never as a condition of selling to us.
   */
  exportNote: string[];
  lookFor: string[];
  faqs: ModelFaq[];
  /** Three sibling slugs. */
  siblings: string[];
}

export const MODELS: ModelEntry[] = [
  {
    slug: "sell-my-range-rover",
    name: "Range Rover",
    h1: "Sell your Range Rover",
    metaTitle: "Sell my Range Rover",
    metaDescription:
      "We buy Range Rover and Range Rover Sport across the UK. A firm offer within two hours, free collection, payment before the transporter leaves.",
    opener: [
      "The full-size Range Rover is the car the exporters we work with ask for by name, and it is the one where the gap between a general buyer's offer and ours tends to be widest. This page covers the Range Rover Sport as well — the two trade closely enough that the same reasoning applies to both.",
      "What actually moves the number: which generation you have, the engine, and the specification. An Autobiography with the right options is a different car commercially from a base HSE of the same age and mileage. Beyond that, and unusually for any car, a Range Rover's value in the UK has been shaped by something that has nothing to do with the car itself.",
    ],
    specialist: {
      heading: "The theft and insurance question, and why it works in your favour",
      body: [
        "Between roughly [[2018]] and [[2022]], Range Rover values in the UK were hit by a problem that was never about the cars being bad. Keyless relay theft made them a target, and insurers responded by pricing the risk brutally — some owners were quoted as much as [[£20,000]], and others could not get cover at any price. DVLA figures put more than [[5,500]] Range Rovers stolen across the UK in [[2023]].",
        "Jaguar Land Rover put around [[£15m]] into retrofitting security to older cars, updating more than [[65,000]] vehicles, and says thefts of [[2018]]–[[2022]] Range Rover and Range Rover Sport models fell by over [[40%]] as a result. It also launched its own insurance product for owners who had been priced out.",
        "Here is why that matters to you. The theft and insurance problem is a UK problem. It does not travel with the car. An export buyer is not pricing in a London insurance quote, which means the discount the UK market applies to your car is a discount we do not have to apply. It is also why the first thing we ask about a car from those years is whether the security update has been done — a question a general buyer will not think to ask.",
      ],
      sources: [
        {
          label: "JLR on the security programme and theft reduction",
          url: "https://www.fleetnews.co.uk/news/range-rover-thefts-fall-after-security-enhanced-with-10m-investment",
        },
        {
          label: "Autocar on insurance costs and JLR's response",
          url: "https://www.autocar.co.uk/car-news/new-cars/range-rover-thefts",
        },
      ],
    },
    exportNote: [
      "We buy every Range Rover, whatever its age. On the younger ones there is export demand as well as UK demand, and that is usually where our strongest numbers come from. On an older car the number is priced against the UK trade — still a firm offer, still collected free, just arrived at a different way.",
    ],
    lookFor: [
      "Whether the security update has been applied, on cars from 2018 to 2022",
      "Air suspension behaviour — how it sits after standing overnight",
      "Specification, particularly the options that were expensive when new",
      "Service history, main dealer or specialist, and when the last one was done",
      "Anything on the dashboard you have learned to ignore",
    ],
    faqs: [
      {
        question: "Does the theft situation mean you will offer me less?",
        answer:
          "No, and for most cars it is the reason we can offer more. UK buyers discount these cars because of insurance costs and theft risk. Export buyers do not, because that problem does not travel with the car. We price against the market the car is actually going to.",
      },
      {
        question: "Do you buy the Range Rover Sport as well?",
        answer:
          "Yes. The Sport trades closely enough to the full-size car that everything on this page applies to it. Give us the registration and the offer comes back the same way.",
      },
      {
        question: "My air suspension has a fault. Will you still buy it?",
        answer:
          "Yes. Air suspension work is routine on these cars and we factor it in before we make the offer, not after. Tell us what it is doing and the number we give you accounts for it.",
      },
      {
        question: "Is a high-mileage Range Rover worth anything?",
        answer:
          "Yes, and often more than owners expect. Mileage matters less on these than condition and history. A well-kept car with a full record and a sensible specification is straightforward for us to place.",
      },
    ],
    siblings: [
      "sell-my-range-rover-velar",
      "sell-my-land-rover-defender",
      "sell-my-discovery-sport",
    ],
  },

  {
    slug: "sell-my-range-rover-evoque",
    name: "Range Rover Evoque",
    h1: "Sell your Range Rover Evoque",
    metaTitle: "Sell my Range Rover Evoque",
    metaDescription:
      "We buy the Range Rover Evoque across the UK. A firm offer within two hours, free collection, and no deductions when we arrive.",
    opener: [
      "The Evoque is the car Land Rover sells most of, which changes how it is valued. There are a lot of them, so specification separates cars far less than condition and history do. Two Evoques of the same year and trim can be worth meaningfully different amounts based on nothing more than how they were serviced.",
      "The generation split matters too. The first-generation L538 ran from [[2011]] to [[2018]]; the L551 that replaced it in [[2019]] is a better car in most of the ways that count, and the used market knows it.",
    ],
    specialist: {
      heading: "The timing chain question, and why how you drove it matters",
      body: [
        "The 2.0-litre Ingenium diesel has a well-documented timing chain issue. Chains stretch, and on these engines a stretched chain can take the oil pump drive with it, which is how a chain problem becomes an engine problem.",
        "The part most people miss is the cause. Chain wear on these is driven substantially by oil dilution — diesel getting into the oil when DPF regeneration cycles start and do not finish. That is not random. It is a direct consequence of short journeys.",
        "So when we ask what the car was used for, we are not making conversation. An Evoque that did the school run and nothing else carries more risk at [[60,000]] miles than a motorway car at [[100,000]], and we price the two differently. If yours did long runs and had its oil done more often than the service schedule demanded, tell us — it is worth money and most buyers will not ask.",
      ],
      sources: [
        {
          label: "PistonHeads used buying guide, Evoque L551",
          url: "https://www.pistonheads.com/news/ph-buying-guides/range-rover-evoque-l551--ph-used-buying-guide/48935",
        },
        {
          label: "LR Direct technical guide on Ingenium timing chain faults",
          url: "https://www.lrdirect.com/technical-guides/2-0-ingenium-timing-chain-faults",
        },
      ],
    },
    exportNote: [
      "We buy Evoques of any age. On the younger ones there is export demand for well-specified cars on top of the UK market, and that is generally where our strongest Evoque numbers come from.",
    ],
    lookFor: [
      "Oil change history, and whether it was serviced more often than the minimum",
      "The kind of journeys the car did — short urban runs or longer distances",
      "Which generation, and for L538 cars, how the engine sounds from cold",
      "Specification and colour, which matter more on the second generation",
      "Any warning lights, including ones that come and go",
    ],
    faqs: [
      {
        question: "My Evoque has the timing chain problem. Will you buy it?",
        answer:
          "Yes. We know what the repair costs and we price it in before we make the offer. What we will not do is give you a number that ignores it and then reduce the offer when the car arrives.",
      },
      {
        question: "Does a full Land Rover service history matter that much?",
        answer:
          "On this engine, more than usual. Oil change frequency is directly connected to the chain wear question, so a thick service record is worth real money on an Evoque in a way it is not on every car.",
      },
      {
        question: "Do you buy the Evoque Convertible?",
        answer:
          "Yes. It sold in small numbers and was discontinued, so it trades in a narrower market than the standard car. That cuts both ways and we will tell you honestly which way it falls for yours.",
      },
      {
        question: "What about the P300e plug-in hybrid?",
        answer:
          "We buy it. Plug-in Evoques are valued differently from the diesels and we will want to know the battery has been charged regularly rather than left flat for months.",
      },
    ],
    siblings: [
      "sell-my-range-rover-velar",
      "sell-my-discovery-sport",
      "sell-my-range-rover",
    ],
  },

  {
    slug: "sell-my-range-rover-velar",
    name: "Range Rover Velar",
    h1: "Sell your Range Rover Velar",
    metaTitle: "Sell my Range Rover Velar",
    metaDescription:
      "We buy the Range Rover Velar across the UK. A firm offer within two hours from someone who knows which spec actually sells.",
    opener: [
      "The Velar was sold on how it looks, and that is still how it trades. Specification and colour swing Velar values more than they do on any other Land Rover — a well-configured car in a good colour on the right wheels is straightforward to sell, and an awkwardly specified one in a difficult colour is genuinely harder work, regardless of mileage.",
      "That is useful to you if your car is a good one, because it means the detail is worth describing properly rather than skipping.",
    ],
    specialist: {
      heading: "Which infotainment system your car has, and why it decides the bracket",
      body: [
        "Velars fall either side of a line that most sellers do not know exists. Launch cars use InControl Touch Pro Duo, the twin-screen setup that was criticised at the time for slow start-up and lag. The facelift replaced it with Pivi Pro, which is a substantially better system.",
        "In the used market this is not a minor trim detail — it is a hard desirability boundary. Two Velars that look near-identical on paper can sit in visibly different demand brackets depending on which system is in the dashboard, because anyone who has lived with the older one knows the difference.",
        "We check which system a car has before we price it. If yours is the later one, that is worth saying up front. If it is the earlier one, it does not stop us buying, and we would rather tell you where the car sits than pretend the distinction is not there.",
      ],
      sources: [
        {
          label: "Stratstone on Pivi Pro and the systems it replaced",
          url: "https://www.stratstone.com/blog/what-is-land-rover-pivi-pro/",
        },
      ],
    },
    exportNote: [
      "We buy any Velar. A younger, well-specified one also attracts export demand on top of the UK market, and higher-specification cars in restrained colours do best there.",
    ],
    lookFor: [
      "Which infotainment system the car has",
      "Specification level and the optional extras that were costly new",
      "Colour and wheel size, which matter more here than on most cars",
      "Whether the deployable door handles operate cleanly every time",
      "Service history and any outstanding software updates",
    ],
    faqs: [
      {
        question: "How do I know which infotainment system my Velar has?",
        answer:
          "The earlier cars have two separate screens in the centre console. If you are not sure, tell us the registration and the year and we will work it out — it is not something you need to research before speaking to us.",
      },
      {
        question: "Does specification really change the offer that much?",
        answer:
          "On a Velar, yes, more than on most cars. It was bought on configuration and it sells on configuration. It is worth spending two minutes listing the options rather than leaving them out.",
      },
      {
        question: "One of my door handles is not deploying properly. Is that a problem?",
        answer:
          "Not one that stops us buying. Tell us about it when you enquire and it is in the number from the start rather than becoming a conversation on your driveway.",
      },
      {
        question: "Do you buy the plug-in hybrid Velar?",
        answer:
          "Yes. As with any plug-in, we will ask whether it has been charged regularly, because a battery left flat for long periods is worth knowing about before we price the car.",
      },
    ],
    siblings: [
      "sell-my-range-rover-evoque",
      "sell-my-range-rover",
      "sell-my-discovery-sport",
    ],
  },

  {
    slug: "sell-my-discovery-sport",
    name: "Discovery Sport",
    h1: "Sell your Discovery Sport",
    metaTitle: "Sell my Discovery Sport",
    metaDescription:
      "We buy the Land Rover Discovery Sport across the UK. A firm offer within two hours, free collection anywhere in mainland UK.",
    opener: [
      "The Discovery Sport is bought as a family car and sold as one, which means the questions that matter are practical rather than emotional. Condition inside is worth more here than on most premium SUVs, because the next owner is buying it for the same reason you did and will look at the back seats first.",
      "There is also one configuration question on this car that changes which market it belongs to entirely.",
    ],
    specialist: {
      heading: "Whether you have the third row, and why it narrows the field",
      body: [
        "The Discovery Sport can be had as a 5+2, with two extra fold-flat seats in the boot. That option is unusual in a way most owners underrate: no BMW X3, Audi Q5 or Mercedes GLC offers a third row at all. In its segment, it is close to being the only game in town.",
        "The practical effect is that a seven-seat Discovery Sport is not competing with every other Discovery Sport. It is competing for a specific buyer who needs occasional extra seats and has very few alternatives at that size.",
        "We will not put a percentage on what that is worth, because we have not seen figures we would stand behind and we would rather say so than invent one. What we will say is that it is the first thing we ask about on this model, and it is worth telling us either way.",
      ],
      sources: [
        {
          label: "Autoblog on the Third Row Pack and segment rivals",
          url: "https://www.autoblog.com/cars/land-rover/discovery-sport/2025",
        },
      ],
    },
    exportNote: [
      "We buy every Discovery Sport. On a younger one there is export demand as well, because practical seven-seat options this size are thin on the ground — a young 5+2 is about the strongest position this model can be in.",
    ],
    lookFor: [
      "Whether the car has the third row of seats",
      "Interior condition, particularly the rear seats and boot",
      "Service and oil change history on the 2.0 diesel",
      "Which generation, and whether it is the mild hybrid",
      "Towing use, if the car has been used to tow",
    ],
    faqs: [
      {
        question: "Is my seven-seat Discovery Sport worth more than a five-seat one?",
        answer:
          "It sells into a smaller and less contested market, because almost nothing else that size offers a third row. We will tell you what that is worth on your specific car rather than quoting a general figure we cannot evidence.",
      },
      {
        question: "The interior has taken a beating from the children. Does that ruin it?",
        answer:
          "No. Family wear on a family car is expected and priced in. Describe it honestly and the offer accounts for it — that is the whole point of us asking before rather than deducting after.",
      },
      {
        question: "Does it matter that mine is the older shape?",
        answer:
          "It changes the number, not whether we are interested. The 2019 update brought a new platform and mild hybrid running gear, and we price the two generations separately.",
      },
      {
        question: "Do you buy Discovery Sports that have towed a caravan?",
        answer:
          "Yes. Tell us and we will ask a couple of sensible questions about how much and how often. It is not a problem, it is just information we would rather have up front.",
      },
    ],
    siblings: [
      "sell-my-range-rover-evoque",
      "sell-my-range-rover-velar",
      "sell-my-land-rover-defender",
    ],
  },

  {
    slug: "sell-my-land-rover-defender",
    name: "Land Rover Defender",
    h1: "Sell your Land Rover Defender",
    metaTitle: "Sell my Land Rover Defender",
    metaDescription:
      "We buy the Land Rover Defender across the UK. A firm offer within two hours on the one Land Rover that holds its value.",
    opener: [
      "The Defender is the outlier. Where most of the range depreciates in the way premium SUVs generally do, the Defender has held its value unusually well since launch — supply has been managed tightly and demand has stayed ahead of it. If you own one, you are in a stronger position than most sellers we speak to, and you should expect an offer that reflects that.",
      "Body style and specification drive the number here more than mileage does. A 90 and a 110 are different cars commercially, and the option packs were expensive enough when new that they still register in the used market.",
    ],
    specialist: {
      heading: "The timing chain worry belongs to a different engine",
      body: [
        "If someone has told you the D300 has a timing chain problem, they have confused two engines, and it is worth knowing which is which before you accept an offer built on the wrong assumption.",
        "The timing chain issue that has been widely written about belongs to the 2.0-litre four-cylinder Ingenium diesel. The D300 is the 3.0-litre straight-six, and it is a different engine with a different reputation — smoother, better at managing heat, revised chain arrangement, and largely free of the oil dilution problem that drives chain wear on the smaller unit. It is generally regarded as one of the sounder engines in the family.",
        "We mention it because sellers get talked down on this fairly often. A buyer references a well-known problem, the owner has no reason to doubt it, and the offer quietly drops. On a D300 Defender, that argument does not hold.",
      ],
      sources: [
        {
          label: "RCV on the Ingenium range and how the six-cylinder differs",
          url: "https://www.rcv.co.uk/land-rover-ingenium-engine/",
        },
        {
          label: "LR Direct on which engine the chain fault affects",
          url: "https://www.lrdirect.com/technical-guides/2-0-ingenium-timing-chain-faults",
        },
      ],
    },
    exportNote: [
      "We buy any Defender. A younger one is among the most straightforward cars we place with exporters, and strong home-market values alongside strong export demand is a rare combination — it is the reason our Defender offers tend to surprise people.",
    ],
    lookFor: [
      "Body style — 90, 110 or 130 — and the exact trim",
      "Option packs, which were expensive new and still carry weight",
      "Whether the car is a Hard Top commercial version",
      "Any modifications, and whether the original parts came with the car",
      "Genuine off-road use, if there has been any",
    ],
    faqs: [
      {
        question: "Does my D300 have the timing chain problem I have read about?",
        answer:
          "That issue belongs to the 2.0-litre four-cylinder, not the D300 straight-six. They are different engines with different reputations. If an offer has been reduced on that basis, it was reduced on a misunderstanding.",
      },
      {
        question: "Do you buy the Hard Top commercial Defender?",
        answer:
          "Yes. Commercial versions sit in a different tax position from passenger cars, so tell us which you have and whether you are VAT registered, and we will make sure the offer is structured correctly.",
      },
      {
        question: "My Defender has been modified. Is that a problem?",
        answer:
          "Not necessarily, but it changes who the car suits. Tell us what has been done and whether you still have the original parts — standard cars generally travel better, and having the takeoffs can matter.",
      },
      {
        question: "Is it worth waiting, given how well they hold value?",
        answer:
          "That is your call and we will not push you. What we would say honestly is that a Defender still depreciates, and it is still costing you tax and insurance while it sits. Our offer stands for seven days, so there is no rush built into it.",
      },
    ],
    siblings: [
      "sell-my-range-rover",
      "sell-my-discovery-sport",
      "sell-my-range-rover-velar",
    ],
  },

  {
    slug: "sell-my-lexus",
    name: "Lexus",
    h1: "Sell your Lexus",
    metaTitle: "Sell my Lexus",
    metaDescription:
      "We buy Lexus across the UK — RX, NX, UX, ES and IS. A firm offer within two hours from someone who knows how hybrid cover works.",
    opener: [
      "We buy the Lexus range, most often the RX, NX and UX, and regularly the ES and IS as well. Almost all of them are hybrids, and that is where most of the misunderstanding about what a used Lexus is worth comes from.",
      "Owners frequently expect to be marked down for a hybrid battery as the car ages. On a Lexus specifically, that expectation is usually wrong, and it is worth understanding why before you accept anyone's offer.",
    ],
    specialist: {
      heading: "Your hybrid battery is probably still under warranty, and that is worth money",
      body: [
        "Lexus hybrid battery and component cover can be extended annually by having a Hybrid Health Check carried out, and it can run as far as [[15]] years from first registration with no mileage limit. It is not a one-off purchase — each check extends the cover again.",
        "The part that catches people out is the servicing condition. Under the Relax programme, cars that have been serviced outside the Lexus network still qualify. Owners routinely assume that going to an independent garage voided everything, and quietly accept a lower offer on that basis.",
        "So when we price a Lexus hybrid, we want to know whether the health checks have been kept up, because a car with live battery cover is a materially easier car to sell on than one without. If you have had them done, that is money. If you have not, it is often recoverable, and we will tell you rather than simply pricing the car down.",
      ],
      sources: [
        {
          label: "Lexus UK on warranty and the Hybrid Health Check extension",
          url: "https://www.lexus.co.uk/owners/warranty/lexus-warranty",
        },
        {
          label: "Lexus on the Relax programme and non-network servicing",
          url: "https://media.lexus.co.uk/lexus-offers-customers-unprecedented-warranty-cover-with-new-relax-programme/",
        },
      ],
    },
    exportNote: [
      "We buy any Lexus. On the younger ones there is export demand too, where the brand's reliability reputation does a lot of the selling, and the RX and NX in particular travel well.",
    ],
    lookFor: [
      "Whether Hybrid Health Checks have been kept up, and when the last one was",
      "Which model and generation, and the trim level",
      "Service history, including independent garages, which still counts",
      "Battery behaviour — how the car drives from cold and how often the engine cuts in",
      "Condition of the interior, which tends to wear well on these",
    ],
    faqs: [
      {
        question: "Will you knock money off because of the age of the hybrid battery?",
        answer:
          "Not by default, and often the opposite. If the health checks have been maintained, the battery cover can still be live many years in, and that makes the car easier for us to sell on. It is one of the first things we check.",
      },
      {
        question: "I have had my Lexus serviced at an independent garage. Does that hurt me?",
        answer:
          "Less than most owners assume. Lexus extended cover under the Relax programme does not require a full main-dealer history to qualify. Keep the invoices and bring them up when we call.",
      },
      {
        question: "Which Lexus models do you buy?",
        answer:
          "All of them. Most often the RX, NX and UX, and regularly the ES and IS. If yours is not on that list, put the registration in anyway — we buy anything, and the models we name are just the ones we see most.",
      },
      {
        question: "Is high mileage a problem on a Lexus hybrid?",
        answer:
          "Less than on most cars. These accumulate miles well and the market knows it. Condition, history and the state of the battery cover matter more than the number on the odometer.",
      },
    ],
    siblings: [
      "sell-my-mercedes-gle",
      "sell-my-range-rover-velar",
      "sell-my-discovery-sport",
    ],
  },

  {
    slug: "sell-my-mercedes-gle",
    name: "Mercedes GLE",
    h1: "Sell your Mercedes GLE",
    metaTitle: "Sell my Mercedes GLE",
    metaDescription:
      "We buy the Mercedes-Benz GLE across the UK. A firm offer within two hours, free collection, and the number does not change.",
    opener: [
      "The GLE covers a lot of ground. The W166 that ran to [[2019]] was effectively a renamed ML and trades accordingly; the V167 that followed is a more modern car and sits well clear of it in value. Knowing which you have is the starting point for any sensible conversation about the number.",
      "Across both, specification does real work — the GLE was ordered with some genuinely expensive options, and the ones that cost most new still register. But there is one version that behaves like a different car altogether.",
    ],
    specialist: {
      heading: "The 350de is not a normal plug-in hybrid",
      body: [
        "Most plug-in hybrids carry a small battery and a modest electric range that owners stop bothering with after a year. The GLE 350de is not built that way. It carries a [[31.2]] kWh battery, which is roughly three times what a typical plug-in of its era has, and enough that a lot of owners genuinely do run it as an electric car during the week.",
        "It is also one of very few plug-in hybrids that will accept a DC rapid charge, which is not a specification most people expect to find on a hybrid at all.",
        "Commercially that puts the 350de in its own bracket rather than in with the rest of the GLE range. We will not quote you an electric range figure, because the published numbers vary depending on which test cycle you read. What we will do is price the car as the thing it actually is, which not everyone does.",
      ],
      sources: [
        {
          label: "DrivingElectric on GLE plug-in hybrid battery and charging",
          url: "https://www.drivingelectric.com/mercedes-benz/gle/range",
        },
      ],
    },
    exportNote: [
      "We buy any GLE. On a younger one there is export demand as well as UK demand — large, well-specified and right-hand drive is a good combination for an exporter — and that is usually where the strongest GLE numbers come from.",
    ],
    lookFor: [
      "Which generation — the 2019 change matters more than a facelift usually would",
      "Whether it is the 350de, and if so how it has been charged",
      "Airmatic suspension behaviour, particularly after standing overnight",
      "Whether the third row is fitted",
      "Specification, and the options that were expensive when new",
    ],
    faqs: [
      {
        question: "I have the 350de. Does the big battery actually help my value?",
        answer:
          "It puts your car in a different bracket from the rest of the range rather than being an incidental option. We price it separately, and we will tell you what the charging history does to the number.",
      },
      {
        question: "My air suspension is sitting low. Will that reduce the offer later?",
        answer:
          "It will be in the offer from the start, not applied later. Airmatic work is normal on these and we would rather account for it up front than surprise you on the day.",
      },
      {
        question: "Does the seven-seat option make a difference?",
        answer:
          "It helps, and it is worth mentioning when you enquire. It widens the pool of buyers for the car, which is generally reflected in what we can pay.",
      },
      {
        question: "Do you buy the AMG versions?",
        answer:
          "Yes. They are priced quite differently from the standard range and we will want the specification in detail, because on those cars the options list can move the number considerably.",
      },
    ],
    siblings: [
      "sell-my-lexus",
      "sell-my-range-rover",
      "sell-my-range-rover-velar",
    ],
  },
];

export function getModel(slug: string): ModelEntry {
  const model = MODELS.find((entry) => entry.slug === slug);
  if (!model) {
    throw new Error(`Unknown model slug: ${slug}`);
  }
  return model;
}

import type {
  ChapterScene,
  DialogueNode,
  EvidenceCard,
  Hotspot,
  HypothesisDefinition,
  InvestigationLocation,
  MapDeathPoint,
} from "./types";

export const chapterScenes: ChapterScene[] = [
  {
    id: "briefing",
    title: "Snow's Desk",
    subtitle: "September 1854",
    body: [
      "John Snow already suspects contaminated water can carry cholera, but the Broad Street outbreak must be investigated from field evidence, not certainty.",
      "Your work is to collect addresses, listen for exposure histories, notice exceptions, and help turn scattered records into a map the parish can act on.",
    ],
  },
  {
    id: "field",
    title: "Broad Street Field Inquiry",
    subtitle: "First evidence round",
    body: [
      "Inspect the street scene. Each marker opens a source: an interview, document, or observation that may add one evidence card to your notebook.",
      "Look for a cluster, a household exposure history, a water sample that does not settle the question, a timeline, and places that should have been devastated if bad air alone explained the pattern.",
    ],
  },
  {
    id: "synthesis",
    title: "Snow's Desk",
    subtitle: "From testimony to theory",
    body: [
      "Enough evidence is in the notebook to build an argument. Return to Snow's desk and compare the evidence against competing explanations.",
      "The question is not whether every uncertainty has vanished. The question is which explanation best predicts the pattern and what temporary action is justified.",
    ],
  },
  {
    id: "board",
    title: "Board of Guardians",
    subtitle: "September 7, 1854",
    body: [
      "Snow presents the case for removing the Broad Street pump handle. The evidence is circumstantial, but it is specific, mapped, and action-oriented.",
      "The decision should be framed as temporary public health action while investigation continues.",
    ],
  },
  {
    id: "complete",
    title: "Late September",
    subtitle: "Three weeks after the meeting",
    body: [
      "The pump handle was removed on September 8. By late September the Broad Street outbreak has spent itself, leaving the parish to count its dead and argue over what the pattern means.",
      "Snow keeps the notebook open. The addresses, exceptions, and parish returns still need to be checked against new testimony from the streets around Broad Street.",
    ],
  },
];

export const hypothesisDefinitions: HypothesisDefinition[] = [
  {
    id: "waterborne",
    title: "Broad Street pump water",
    shortTitle: "Water",
    summary:
      "A common-source exposure centered on drinking water from the Broad Street pump or water carried from it.",
    boardAction: "Remove the Broad Street pump handle temporarily while inquiry continues.",
    supportingEvidenceIds: [
      "pump-cluster",
      "household-exposure",
      "attack-timeline",
      "workhouse-exception",
      "brewery-exception",
    ],
    complicatingEvidenceIds: ["pump-water-inspection"],
    snowChallenge:
      "Strongest case. Snow still wants the uncertainty stated plainly: a clean-looking sample does not give final proof, but a mapped pattern and exposure histories may justify temporary action.",
  },
  {
    id: "miasma",
    title: "Miasma or bad air",
    shortTitle: "Miasma",
    summary:
      "Poisonous air from smells, drains, sewers, weather, or street conditions is driving illness near Broad Street.",
    boardAction: "Prioritize street cleansing, drainage, and odor abatement around the affected streets.",
    supportingEvidenceIds: ["pump-cluster", "pump-water-inspection"],
    complicatingEvidenceIds: ["household-exposure", "workhouse-exception", "brewery-exception"],
    snowChallenge:
      "Snow asks why nearby institutions and workplaces exposed to the same street air were not devastated in the same way.",
  },
  {
    id: "person-to-person",
    title: "Household transmission",
    shortTitle: "Household",
    summary:
      "Cholera is spreading mainly through nursing, shared rooms, and direct contact between sick people and families.",
    boardAction: "Emphasize household isolation and care precautions while collecting more case histories.",
    supportingEvidenceIds: ["household-exposure"],
    complicatingEvidenceIds: ["attack-timeline", "pump-cluster", "pump-water-inspection"],
    snowChallenge:
      "Snow asks whether a slow chain of household spread predicts the abrupt surge and dense pump-centered geography.",
  },
  {
    id: "crowding",
    title: "Crowding, poverty, or occupation",
    shortTitle: "Crowding",
    summary:
      "The pattern follows class, occupation, crowded lodging, or institutional living more than a shared water exposure.",
    boardAction: "Target inspections and relief at crowded homes and affected occupations.",
    supportingEvidenceIds: ["pump-cluster"],
    complicatingEvidenceIds: ["household-exposure", "pump-water-inspection", "workhouse-exception", "brewery-exception"],
    snowChallenge:
      "Snow asks why the workhouse and brewery complicate a simple social or occupational explanation.",
  },
];

export const evidenceCards: EvidenceCard[] = [
  {
    id: "pump-cluster",
    title: "Deaths cluster around the Broad Street pump",
    summary:
      "The first plotted addresses form a dense cluster around Broad Street, strongest near the public pump.",
    confidence: "observed",
    sourceType: "observation",
    sourceLabel: "Street observation and address plotting",
    supports: ["Waterborne exposure", "Mapping deaths by address"],
    complicates: ["Miasma alone"],
  },
  {
    id: "attack-timeline",
    title: "The outbreak rises and falls abruptly",
    summary:
      "Parish figures show a sharp surge after August 30: 31 fatal attacks on August 31, then 131 and 125 over the next two days.",
    confidence: "reported",
    sourceType: "document",
    sourceLabel: "Registrar's daily returns",
    supports: ["Common-source exposure", "Urgent public health action"],
    complicates: ["Slow person-to-person spread"],
  },
  {
    id: "household-exposure",
    title: "A bereaved household gives an exposure history",
    summary:
      "A Broad Street survivor reports a death during the surge and records the household's pump-water use, attack timing, and close nursing contact.",
    confidence: "reported",
    sourceType: "interview",
    sourceLabel: "Broad Street household interview",
    supports: ["Exposure history", "Household field inquiry", "Common-source testing"],
    complicates: ["Place-only explanations"],
  },
  {
    id: "pump-water-inspection",
    title: "Pump water gives no decisive visible proof",
    summary:
      "Snow's sample from the Broad Street pump did not make the danger obvious by ordinary inspection, leaving the case dependent on exposure histories and mapped pattern.",
    confidence: "observed",
    sourceType: "observation",
    sourceLabel: "Snow's pump-water inspection",
    supports: ["Uncertainty", "Need for epidemiological evidence"],
    complicates: ["Waterborne exposure as obvious contamination"],
  },
  {
    id: "workhouse-exception",
    title: "Nearby workhouse has few deaths",
    summary:
      "The Poland Street workhouse is close to affected streets, but its inmates used a separate water supply.",
    confidence: "reported",
    sourceType: "interview",
    sourceLabel: "Workhouse steward interview",
    supports: ["Water source matters", "Negative evidence"],
    complicates: ["Distance from bad air"],
  },
  {
    id: "brewery-exception",
    title: "Brewery workers are largely spared",
    summary:
      "Broad Street brewery workers had beer or brewery water available and were not regular users of the street pump.",
    confidence: "reported",
    sourceType: "interview",
    sourceLabel: "Brewery worker interview",
    supports: ["Exposure history", "Negative evidence"],
    complicates: ["Street-level miasma"],
  },
  {
    id: "snow-method",
    title: "Snow combines records with interviews",
    summary:
      "Snow's case depends on death records, addresses, household interviews, and exceptions, not a conclusive water test.",
    confidence: "inferred",
    sourceType: "inference",
    sourceLabel: "Snow's methodological briefing",
    supports: ["Field epidemiology", "Reasoning under uncertainty"],
    complicates: ["Single-proof explanations"],
  },
];

export const dialogueNodes: DialogueNode[] = [
  {
    id: "snow-briefing",
    locationId: "snow-desk",
    speaker: "John Snow",
    role: "Physician and investigator",
    intro:
      "Snow stands over his notes, careful rather than triumphant. He wants every claim tied to an address, a date, or a witness.",
    questions: [
      {
        id: "snow-method-question",
        prompt: "How should I begin the inquiry?",
        response:
          "Begin in Broad Street with particulars. Where did the person live, when did the attack begin, and what water did the household use? Bring me addresses, dates, exposure histories, and exceptions; the map must grow out of testimony and records, not guesswork.",
        unlocksEvidenceId: "snow-method",
      },
      {
        id: "snow-uncertainty-question",
        prompt: "Are we trying to prove the water theory today?",
        response:
          "We are trying to learn whether the pattern is strong enough to justify action. A reversible measure may be warranted before every mechanism is settled.",
      },
    ],
  },
  {
    id: "pump-observation",
    locationId: "broad-street",
    speaker: "Broad Street pump",
    role: "Street observation",
    intro:
      "The pump is busy even in the anxious quiet. Its position matters only if the addresses and exposures begin to point back to it.",
    questions: [
      {
        id: "pump-cluster-question",
        prompt: "What do the first plotted addresses show?",
        response:
          "The marks crowd around Broad Street. The pattern does not explain every case, but it gives the inquiry a center of gravity.",
        unlocksEvidenceId: "pump-cluster",
      },
      {
        id: "pump-caution-question",
        prompt: "What did Snow's water sample show?",
        response:
          "The sample did not give decisive proof by sight, taste, smell, or simple inspection. Snow records that absence as a problem for the argument, not a reason to ignore the map.",
        unlocksEvidenceId: "pump-water-inspection",
      },
      {
        id: "pump-limits-question",
        prompt: "Does the cluster alone settle the cause?",
        response:
          "No. A cluster is a lead, not proof. You still need timing, exposure histories, exceptions, and a way to explain why the water did not plainly reveal its danger.",
      },
    ],
  },
  {
    id: "registrar-ledger-interview",
    locationId: "registrar",
    speaker: "Registrar",
    role: "Parish records",
    intro:
      "The registrar's ledger turns the outbreak into dates, addresses, and a curve of fatal attacks.",
    questions: [
      {
        id: "ledger-timeline-question",
        prompt: "When did the outbreak surge?",
        response:
          "The returns rise sharply after August 30: 31 fatal attacks on August 31, then 131 and 125 over the next two days before falling.",
        unlocksEvidenceId: "attack-timeline",
      },
      {
        id: "ledger-address-question",
        prompt: "Why copy addresses instead of totals alone?",
        response:
          "Totals show severity. Addresses show pattern. Snow needs both to compare the timing with the geography.",
      },
    ],
  },
  {
    id: "household-interview",
    locationId: "household",
    speaker: "Bereaved household survivor",
    role: "Household witness",
    intro:
      "A black ribbon hangs at the door. The survivor has already told the story to neighbors, but Snow needs the exact address, timing, care, and water habits.",
    questions: [
      {
        id: "household-water-question",
        prompt: "What water did the household use before the illness?",
        response:
          "The family fetched from the Broad Street pump because it was near and well regarded. Record the address, the water source, and the time symptoms began.",
        unlocksEvidenceId: "household-exposure",
      },
      {
        id: "household-contact-question",
        prompt: "Could nursing the sick person explain the spread?",
        response:
          "Close care may matter inside a home, but the question is whether many separate households were struck after drawing from the same pump.",
      },
    ],
  },
  {
    id: "workhouse-interview",
    locationId: "workhouse",
    speaker: "Workhouse steward",
    role: "Institutional witness",
    intro:
      "The workhouse is close to affected streets, but its experience does not match the surrounding alarm.",
    questions: [
      {
        id: "workhouse-water-question",
        prompt: "Where did the inmates get water?",
        response:
          "The workhouse had its own supply. Its nearness to Broad Street makes the small number of deaths important negative evidence.",
        unlocksEvidenceId: "workhouse-exception",
      },
      {
        id: "workhouse-miasma-question",
        prompt: "If the street air were the cause, what would we expect?",
        response:
          "We would expect the nearby institution to suffer heavily as well. Its relative escape pushes the inquiry back toward water source and exposure.",
      },
    ],
  },
  {
    id: "brewery-interview",
    locationId: "brewery",
    speaker: "Brewery worker",
    role: "Workplace witness",
    intro:
      "The brewery stands near the affected area, yet the workers' daily habits differ from nearby households.",
    questions: [
      {
        id: "brewery-drink-question",
        prompt: "What did workers drink during the day?",
        response:
          "Workers had beer or brewery water available and were not regular users of the Broad Street pump.",
        unlocksEvidenceId: "brewery-exception",
      },
      {
        id: "brewery-exposure-question",
        prompt: "Why does this exception matter?",
        response:
          "It shows why place alone is not enough. The inquiry must ask what people actually consumed, not merely where they stood.",
      },
    ],
  },
];

export const locations: InvestigationLocation[] = [
  {
    id: "snow-desk",
    title: "Snow's Desk",
    shortTitle: "Desk",
    description: "Return to Snow's working notes and the wider question of waterborne transmission.",
    mapPoint: { x: 9, y: 88 },
  },
  {
    id: "broad-street",
    title: "Broad Street Pump",
    shortTitle: "Pump",
    description: "The public pump at the center of the first visible cluster.",
    mapPoint: { x: 51, y: 50 },
  },
  {
    id: "household",
    title: "Broad Street Household",
    shortTitle: "Household",
    description: "A household interview turns a death mark into timing, care, and water-use testimony.",
    mapPoint: { x: 55, y: 56 },
    unlocksWith: "pump-cluster",
  },
  {
    id: "registrar",
    title: "Registrar's Ledger",
    shortTitle: "Ledger",
    description: "Daily returns and addresses that turn rumor into a line list.",
    mapPoint: { x: 15, y: 12 },
  },
  {
    id: "workhouse",
    title: "Poland Street Workhouse",
    shortTitle: "Workhouse",
    description: "A nearby institution that complicates any simple bad-air explanation.",
    mapPoint: { x: 73, y: 53 },
  },
  {
    id: "brewery",
    title: "Broad Street Brewery",
    shortTitle: "Brewery",
    description: "A workplace exception that makes exposure history matter.",
    mapPoint: { x: 63, y: 67 },
  },
  {
    id: "board-room",
    title: "Board of Guardians",
    shortTitle: "Board",
    description: "Where the evidence becomes a public health recommendation.",
    mapPoint: { x: 92, y: 88 },
    boardOnly: true,
  },
];

export const hotspots: Hotspot[] = [
  {
    id: "broad-street-pump",
    locationId: "broad-street",
    label: "Broad Street pump",
    shortLabel: "Pump",
    description: "A much-used public pump stands at the center of the first cluster.",
    evidenceId: "pump-cluster",
    position: [1.45, 1.45, -4.2],
  },
  {
    id: "registrar-ledger",
    locationId: "registrar",
    label: "Registrar's ledger",
    shortLabel: "Ledger",
    description: "Daily returns show how quickly the outbreak intensified.",
    evidenceId: "attack-timeline",
    position: [-3.2, 1.3, -2.2],
  },
  {
    id: "broad-street-household",
    locationId: "household",
    label: "Bereaved household",
    shortLabel: "Household",
    description: "A survivor can give the address, water source, and timing behind one death mark.",
    evidenceId: "household-exposure",
    position: [-2.25, 1.42, -0.95],
  },
  {
    id: "poland-workhouse",
    locationId: "workhouse",
    label: "Poland Street workhouse",
    shortLabel: "Workhouse",
    description: "A nearby institution appears to have escaped the worst of the outbreak.",
    evidenceId: "workhouse-exception",
    position: [3.6, 1.55, -1.7],
  },
  {
    id: "broad-street-brewery",
    locationId: "brewery",
    label: "Broad Street brewery",
    shortLabel: "Brewery",
    description: "Workers nearby do not fit a simple distance-from-smell explanation.",
    evidenceId: "brewery-exception",
    position: [3.4, 1.7, 1.8],
  },
  {
    id: "john-snow",
    locationId: "snow-desk",
    label: "John Snow",
    shortLabel: "Snow",
    description: "Snow asks what the pattern would look like if the water were the vehicle.",
    evidenceId: "snow-method",
    position: [-2.8, 1.55, 2.4],
  },
];

export const mapDeathPoints: MapDeathPoint[] = [
  { id: "broad-1", x: 48, y: 50, count: 12, unlocksWith: "pump-cluster" },
  { id: "broad-2", x: 43, y: 53, count: 9, unlocksWith: "pump-cluster" },
  { id: "cambridge-1", x: 55, y: 45, count: 8, unlocksWith: "pump-cluster" },
  { id: "pulteney-1", x: 39, y: 60, count: 7, unlocksWith: "pump-cluster" },
  { id: "household-broad", x: 55, y: 56, count: 1, unlocksWith: "household-exposure" },
  { id: "marshall-1", x: 33, y: 70, count: 5, unlocksWith: "attack-timeline" },
  { id: "berwick-1", x: 31, y: 38, count: 4, unlocksWith: "attack-timeline" },
  { id: "workhouse", x: 73, y: 53, count: 1, unlocksWith: "workhouse-exception" },
  { id: "brewery", x: 63, y: 67, count: 1, unlocksWith: "brewery-exception" },
  { id: "outlier-1", x: 19, y: 28, count: 2, unlocksWith: "snow-method" },
  { id: "outlier-2", x: 83, y: 31, count: 1, unlocksWith: "snow-method" },
];

export const boardThreshold = 6;

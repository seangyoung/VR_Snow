export type EvidenceConfidence = "observed" | "reported" | "inferred";
export type ChapterStage = "briefing" | "field" | "synthesis" | "board" | "complete";
export type HypothesisId = "waterborne" | "miasma" | "person-to-person" | "crowding";
export type SynthesisConfidence = "tentative" | "proportionate" | "overstated";
export type LocationId =
  | "snow-desk"
  | "broad-street"
  | "household"
  | "registrar"
  | "workhouse"
  | "brewery"
  | "board-room";
export type EvidenceSourceType = "observation" | "interview" | "document" | "inference";

export interface EvidenceCard {
  id: string;
  title: string;
  summary: string;
  confidence: EvidenceConfidence;
  sourceType: EvidenceSourceType;
  sourceLabel: string;
  supports: string[];
  complicates?: string[];
}

export interface ChapterScene {
  id: ChapterStage;
  title: string;
  subtitle: string;
  body: string[];
}

export interface InvestigationLocation {
  id: LocationId;
  title: string;
  shortTitle: string;
  description: string;
  mapPoint: { x: number; y: number };
  unlocksWith?: string;
  boardOnly?: boolean;
}

export interface Hotspot {
  id: string;
  locationId: LocationId;
  label: string;
  shortLabel: string;
  description: string;
  evidenceId: string;
  position: [number, number, number];
}

export interface DialogueQuestion {
  id: string;
  prompt: string;
  response: string;
  unlocksEvidenceId?: string;
}

export interface DialogueNode {
  id: string;
  locationId: LocationId;
  speaker: string;
  role: string;
  intro: string;
  questions: DialogueQuestion[];
}

export interface HypothesisDefinition {
  id: HypothesisId;
  title: string;
  shortTitle: string;
  summary: string;
  boardAction: string;
  supportingEvidenceIds: string[];
  complicatingEvidenceIds: string[];
  snowChallenge: string;
}

export interface MapDeathPoint {
  id: string;
  x: number;
  y: number;
  count: number;
  unlocksWith?: string;
}

export interface InvestigationSnapshot {
  inspectedHotspots: Set<string>;
  collectedEvidence: Set<string>;
  askedQuestions: Set<string>;
  selectedHypothesisId?: HypothesisId;
  synthesisConfidence?: SynthesisConfidence;
  preparedForBoard: boolean;
  stage: ChapterStage;
  currentLocationId: LocationId;
}

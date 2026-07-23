import {
  boardThreshold,
  chapterScenes,
  dialogueNodes,
  evidenceCards,
  hotspots,
  hypothesisDefinitions,
  locations,
} from "./content";
import type {
  ChapterScene,
  ChapterStage,
  DialogueNode,
  DialogueQuestion,
  EvidenceCard,
  Hotspot,
  HypothesisDefinition,
  HypothesisId,
  InvestigationLocation,
  InvestigationSnapshot,
  LocationId,
  SynthesisConfidence,
} from "./types";

type ChangeHandler = () => void;

export class GameState {
  private inspectedHotspots = new Set<string>();
  private collectedEvidence = new Set<string>();
  private askedQuestions = new Set<string>();
  private changeHandlers = new Set<ChangeHandler>();
  stage: ChapterStage = "field";
  currentLocationId: LocationId = "snow-desk";
  activeDialogueId?: string;
  selectedHypothesisId?: HypothesisId;
  synthesisConfidence?: SynthesisConfidence;
  preparedForBoard = false;
  boardPresented = false;

  inspectHotspot(hotspotId: string): { dialogue?: DialogueNode; message: string } {
    if (this.stage === "briefing") {
      return { message: "Begin the field inquiry before collecting evidence." };
    }

    if (this.stage === "board" || this.stage === "complete") {
      return { message: "The evidence has already been presented to the Board." };
    }

    const hotspot = this.getHotspot(hotspotId);
    if (!hotspot) {
      return { message: "No evidence found." };
    }

    this.inspectedHotspots.add(hotspot.id);
    const dialogue = this.getDialogueForLocation(hotspot.locationId);
    if (dialogue) {
      this.activeDialogueId = dialogue.id;
    }
    this.emitChange();

    return {
      dialogue,
      message: dialogue ? `Opened ${dialogue.speaker}.` : `${hotspot.shortLabel} inspected.`,
    };
  }

  askQuestion(questionId: string): { evidence?: EvidenceCard; response?: string; message: string } {
    const dialogue = this.getActiveDialogue();
    const question = dialogue?.questions.find((candidate) => candidate.id === questionId);

    if (!dialogue || !question) {
      return { message: "That question is not available here." };
    }

    const alreadyAsked = this.askedQuestions.has(question.id);
    this.askedQuestions.add(question.id);

    let evidence: EvidenceCard | undefined;
    let reachedSynthesis = false;
    if (question.unlocksEvidenceId) {
      const alreadyCollected = this.collectedEvidence.has(question.unlocksEvidenceId);
      const hadEnoughEvidence = this.hasEnoughEvidenceForSynthesis();
      this.collectedEvidence.add(question.unlocksEvidenceId);
      evidence = this.getEvidence(question.unlocksEvidenceId);
      reachedSynthesis = !alreadyCollected && !hadEnoughEvidence && this.hasEnoughEvidenceForSynthesis();
      if (reachedSynthesis) {
        this.stage = "synthesis";
      }
    }

    this.emitChange();

    return {
      evidence,
      response: question.response,
      message:
        evidence && !alreadyAsked
          ? reachedSynthesis
            ? `${evidence.title} added to your notebook. Return to Snow's Desk to prepare the theory.`
            : evidence.id === "snow-method"
              ? "Snow assigns you to begin in Broad Street: collect addresses, water histories, dates, and exceptions before drawing conclusions."
              : `${evidence.title} added to your notebook.`
          : alreadyAsked
            ? "You have already recorded that answer."
            : `${dialogue.speaker} answered your question.`,
    };
  }

  getObjective(): string {
    if (this.stage === "briefing") {
      return "Begin at Snow's desk, then enter Broad Street with a field notebook.";
    }

    if (this.stage === "field" && !this.hasEvidence("snow-method")) {
      return "Talk with Snow and receive the field assignment.";
    }

    if (this.stage === "synthesis") {
      if (this.preparedForBoard) {
        return "Open the map table and present the prepared argument to the Board.";
      }

      if (this.currentLocationId === "snow-desk") {
        return "Test the evidence against each theory with Snow.";
      }

      return "Return to Snow's Desk and decide which theory best fits the evidence.";
    }

    if (this.stage === "board") {
      return "State the case honestly: strong pattern, urgent action, incomplete proof.";
    }

    if (this.stage === "complete") {
      return "Late September: the parish sees the consequence of the Board's decision.";
    }

    if (this.preparedForBoard) {
      return "Open the map table and present the prepared argument to the Board.";
    }

    const remaining = Math.max(boardThreshold - this.collectedEvidence.size, 0);
    return `Gather ${remaining} more evidence ${remaining === 1 ? "card" : "cards"} before meeting the Board.`;
  }

  getCollectedEvidence(): EvidenceCard[] {
    return evidenceCards.filter((card) => this.collectedEvidence.has(card.id));
  }

  getAllEvidence(): EvidenceCard[] {
    return evidenceCards;
  }

  getCurrentScene(): ChapterScene {
    return chapterScenes.find((scene) => scene.id === this.stage) ?? chapterScenes[0];
  }

  getCurrentSceneBody(): string[] {
    const scene = this.getCurrentScene();
    const hypothesis = this.getSelectedHypothesis();

    if (this.stage === "board" && hypothesis) {
      if (hypothesis.id === "waterborne") {
        return [
          `Snow presents your prepared theory: ${hypothesis.title}. The evidence is circumstantial, but it is specific, mapped, and action-oriented.`,
          `Recommended action: ${hypothesis.boardAction}`,
        ];
      }

      return [
        `Snow presents your prepared theory: ${hypothesis.title}, then tests it against the evidence that remains unexplained.`,
        `Recommended action: ${hypothesis.boardAction}`,
        "The pump handle case is not yet strong under this theory, so Snow urges more inquiry before a pump-specific intervention.",
      ];
    }

    if (this.stage === "complete" && hypothesis) {
      if (hypothesis.id === "waterborne") {
        return [
          this.synthesisConfidence === "overstated"
            ? "Snow tempers the claim before the Board: the evidence supports temporary action, not final proof. The pump handle is removed on September 8, and by late September the Broad Street outbreak has spent itself."
            : "The pump handle is removed on September 8. By late September the Broad Street outbreak has spent itself, leaving the parish to count its dead and argue over what the pattern means.",
          "Snow keeps the notebook open. Whitehead's later inquiry will press into the households around Broad Street and the drainage near number 40.",
        ];
      }

      return [
        "Alternate course: the Board leaves the Broad Street pump in use after September 8. Within days, fresh cases appear near the pump and the parish faces a second rise before officials finally close it.",
        "When Whitehead and the parish investigators later trace the 40 Broad Street household and the foul ground around the well, Snow marks the missed warning in his notebook: the water route had remained open.",
      ];
    }

    return scene.body;
  }

  getStage(): ChapterStage {
    return this.stage;
  }

  beginFieldwork(): void {
    this.stage = "field";
    this.currentLocationId = "broad-street";
    this.activeDialogueId = undefined;
    this.emitChange();
  }

  presentToBoard(): { accepted: boolean; message: string } {
    if (!this.preparedForBoard) {
      return {
        accepted: false,
        message: this.hasEnoughEvidenceForSynthesis()
          ? "Snow asks you to prepare a theory at his desk before going to the Board."
          : `The Board asks for ${boardThreshold} evidence cards before considering action.`,
      };
    }

    this.stage = "board";
    this.currentLocationId = "board-room";
    this.boardPresented = true;
    this.emitChange();
    return {
      accepted: true,
      message:
        this.selectedHypothesisId === "waterborne"
          ? "The Board agrees to remove the pump handle while the inquiry continues."
          : "The Board hears the argument, but the pump intervention remains unresolved.",
    };
  }

  finishBoard(): void {
    this.stage = "complete";
    this.currentLocationId = "board-room";
    this.emitChange();
  }

  travelToLocation(locationId: LocationId): { traveled: boolean; message: string } {
    const location = this.getLocation(locationId);
    if (!location) {
      return { traveled: false, message: "That location is not on the inquiry map." };
    }

    if (!this.canTravelToLocation(locationId)) {
      return { traveled: false, message: `${location.title} is not available for field travel yet.` };
    }

    this.currentLocationId = locationId;
    this.activeDialogueId = undefined;
    this.emitChange();
    return {
      traveled: true,
      message:
        locationId === "snow-desk" && this.stage === "synthesis" && !this.preparedForBoard
          ? "Returned to Snow's Desk. Test the evidence against the possible theories."
          : `Arrived at ${location.title}.`,
    };
  }

  closeDialogue(): void {
    this.activeDialogueId = undefined;
    this.emitChange();
  }

  selectHypothesis(hypothesisId: HypothesisId): { selected: boolean; message: string } {
    const hypothesis = this.getHypothesis(hypothesisId);
    if (!hypothesis) {
      return { selected: false, message: "That theory is not on Snow's board." };
    }

    this.selectedHypothesisId = hypothesis.id;
    this.preparedForBoard = false;
    this.emitChange();
    return { selected: true, message: `${hypothesis.title} selected for Snow's review.` };
  }

  setSynthesisConfidence(confidence: SynthesisConfidence): { selected: boolean; message: string } {
    this.synthesisConfidence = confidence;
    this.preparedForBoard = false;
    this.emitChange();
    return { selected: true, message: `Confidence set to ${this.getConfidenceLabel(confidence).toLowerCase()}.` };
  }

  prepareBoardArgument(): { prepared: boolean; message: string } {
    if (!this.hasEnoughEvidenceForSynthesis()) {
      return { prepared: false, message: `Snow asks for ${boardThreshold} evidence cards before synthesis.` };
    }

    if (this.currentLocationId !== "snow-desk") {
      return { prepared: false, message: "Return to Snow's Desk before preparing the Board argument." };
    }

    if (!this.selectedHypothesisId) {
      return { prepared: false, message: "Choose the theory that best fits the evidence." };
    }

    if (!this.synthesisConfidence) {
      return { prepared: false, message: "State your confidence before going to the Board." };
    }

    this.preparedForBoard = true;
    this.stage = "synthesis";
    this.emitChange();
    return {
      prepared: true,
      message:
        this.selectedHypothesisId === "waterborne" && this.synthesisConfidence === "proportionate"
          ? "Snow accepts the argument: strong enough for temporary pump closure, not final proof."
          : "Snow records the argument, including the evidence it still struggles to explain.",
    };
  }

  getBoardFindings(): string[] {
    const findings: string[] = [];
    const hypothesis = this.getSelectedHypothesis();

    if (hypothesis) {
      findings.push(`Prepared theory: ${hypothesis.title}.`);
      if (this.synthesisConfidence) {
        findings.push(`Confidence: ${this.getConfidenceLabel(this.synthesisConfidence)}.`);
      }
    }

    findings.push(...this.getMappedEvidenceFindings());

    findings.push(
      hypothesis
        ? `Recommended action: ${hypothesis.boardAction}`
        : "The recommendation is a reversible intervention under uncertainty, not final proof.",
    );
    return findings;
  }

  getMappedEvidenceFindings(): string[] {
    const findings: string[] = [];

    if (this.hasEvidence("pump-cluster")) {
      findings.push("The address marks cluster around the Broad Street pump.");
    }

    if (this.hasEvidence("household-exposure")) {
      findings.push("A household interview ties one death mark to water use, attack timing, and close care.");
    }

    if (this.hasEvidence("pump-water-inspection")) {
      findings.push("The pump-water sample gives no decisive visible proof of danger.");
    }

    if (this.hasEvidence("attack-timeline")) {
      findings.push("The daily returns add timing: a sudden rise and fall, not a slow chain alone.");
    }

    if (this.hasEvidence("workhouse-exception")) {
      findings.push("The workhouse sits near the cluster but marks a separate water supply.");
    }

    if (this.hasEvidence("brewery-exception")) {
      findings.push("The brewery sits near Broad Street but marks different drinking habits.");
    }

    if (this.hasEvidence("snow-method")) {
      findings.push("Outliers and exceptions stay on the map instead of being discarded.");
    }

    return findings;
  }

  getPreparedMapSummary(): string {
    const hypothesis = this.getSelectedHypothesis();
    if (!hypothesis) {
      return "No theory has been prepared from the map.";
    }

    if (hypothesis.id === "waterborne") {
      return "The map ties a pump-centered cluster to household pump use, an abrupt timeline, and nearby exceptions, while admitting the water sample did not visibly prove contamination.";
    }

    if (hypothesis.id === "miasma") {
      return "The clean-looking sample gives bad-air advocates room, but the map still leaves them struggling with household water histories and nearby places that did not suffer in the same way.";
    }

    if (hypothesis.id === "person-to-person") {
      return "The map accepts household contact and the ambiguous water sample as cautions, but leaves person-to-person spread struggling with the sudden rise and dense pump-centered geography.";
    }

    return "The map leaves crowding or occupation struggling with household water use and the workhouse and brewery exceptions, even though the water sample is not decisive on its own.";
  }

  getHotspots(): Hotspot[] {
    if (this.stage !== "field" && this.stage !== "synthesis") {
      return [];
    }

    return hotspots.filter((hotspot) => hotspot.locationId === this.currentLocationId);
  }

  getAllHotspots(): Hotspot[] {
    return hotspots;
  }

  getHotspot(id: string): Hotspot | undefined {
    return hotspots.find((hotspot) => hotspot.id === id);
  }

  getDialogueForLocation(locationId: LocationId): DialogueNode | undefined {
    return dialogueNodes.find((dialogue) => dialogue.locationId === locationId);
  }

  getActiveDialogue(): DialogueNode | undefined {
    return this.activeDialogueId ? dialogueNodes.find((dialogue) => dialogue.id === this.activeDialogueId) : undefined;
  }

  hasAskedQuestion(questionId: string): boolean {
    return this.askedQuestions.has(questionId);
  }

  getQuestionEvidence(question: DialogueQuestion): EvidenceCard | undefined {
    return question.unlocksEvidenceId ? this.getEvidence(question.unlocksEvidenceId) : undefined;
  }

  getHypotheses(): HypothesisDefinition[] {
    return hypothesisDefinitions;
  }

  getHypothesis(id: HypothesisId): HypothesisDefinition | undefined {
    return hypothesisDefinitions.find((hypothesis) => hypothesis.id === id);
  }

  getSelectedHypothesis(): HypothesisDefinition | undefined {
    return this.selectedHypothesisId ? this.getHypothesis(this.selectedHypothesisId) : undefined;
  }

  getHypothesisEvidence(hypothesis: HypothesisDefinition): {
    supporting: EvidenceCard[];
    complicating: EvidenceCard[];
  } {
    return {
      supporting: hypothesis.supportingEvidenceIds
        .filter((evidenceId) => this.hasEvidence(evidenceId))
        .map((evidenceId) => this.getEvidence(evidenceId))
        .filter((evidence): evidence is EvidenceCard => Boolean(evidence)),
      complicating: hypothesis.complicatingEvidenceIds
        .filter((evidenceId) => this.hasEvidence(evidenceId))
        .map((evidenceId) => this.getEvidence(evidenceId))
        .filter((evidence): evidence is EvidenceCard => Boolean(evidence)),
    };
  }

  getConfidenceLabel(confidence: SynthesisConfidence): string {
    if (confidence === "tentative") {
      return "Tentative lead";
    }

    if (confidence === "overstated") {
      return "Final proof";
    }

    return "Strong enough for temporary action";
  }

  getSnowSynthesisFeedback(): string {
    const hypothesis = this.getSelectedHypothesis();
    if (!hypothesis) {
      return "Snow asks you to use the map as a test: what would each theory expect to see, and how should the clean-looking pump sample temper the argument?";
    }

    if (hypothesis.id !== "waterborne") {
      return hypothesis.snowChallenge;
    }

    if (this.synthesisConfidence === "overstated") {
      return "Snow agrees the water case is strongest, but the pump-water inspection is exactly why he cautions that the evidence supports temporary action rather than final proof.";
    }

    if (this.synthesisConfidence === "tentative") {
      return "Snow asks whether a reversible intervention is justified when the mapped pattern, timing, and exceptions point in the same direction despite an inconclusive sample.";
    }

    return hypothesis.snowChallenge;
  }

  getCurrentLocation(): InvestigationLocation {
    return this.getLocation(this.currentLocationId) ?? locations[0];
  }

  getLocations(): InvestigationLocation[] {
    return locations;
  }

  getLocation(id: LocationId): InvestigationLocation | undefined {
    return locations.find((location) => location.id === id);
  }

  getUnlockedLocations(): InvestigationLocation[] {
    return locations.filter((location) => this.isLocationUnlocked(location));
  }

  canTravelToLocation(id: LocationId): boolean {
    const location = this.getLocation(id);
    if (!location || location.boardOnly || this.stage === "briefing" || this.stage === "board") {
      return false;
    }

    if (!this.hasEvidence("snow-method")) {
      return location.id === "snow-desk";
    }

    return this.isLocationUnlocked(location);
  }

  isLocationUnlocked(location: InvestigationLocation): boolean {
    if (location.boardOnly) {
      return this.preparedForBoard || this.boardPresented || this.stage === "complete";
    }

    if (this.stage === "briefing") {
      return location.id === "snow-desk";
    }

    if (!this.hasEvidence("snow-method")) {
      return location.id === "snow-desk";
    }

    if (location.unlocksWith) {
      return this.hasEvidence(location.unlocksWith);
    }

    return true;
  }

  getEvidence(id: string): EvidenceCard | undefined {
    return evidenceCards.find((card) => card.id === id);
  }

  hasEvidence(id: string): boolean {
    return this.collectedEvidence.has(id);
  }

  hasEnoughEvidenceForSynthesis(): boolean {
    return this.collectedEvidence.size >= boardThreshold;
  }

  hasInspected(hotspotId: string): boolean {
    return this.inspectedHotspots.has(hotspotId);
  }

  getProgressText(): string {
    return `${this.collectedEvidence.size}/${boardThreshold}`;
  }

  getSnapshot(): InvestigationSnapshot {
    return {
      inspectedHotspots: new Set(this.inspectedHotspots),
      collectedEvidence: new Set(this.collectedEvidence),
      askedQuestions: new Set(this.askedQuestions),
      selectedHypothesisId: this.selectedHypothesisId,
      synthesisConfidence: this.synthesisConfidence,
      preparedForBoard: this.preparedForBoard,
      stage: this.stage,
      currentLocationId: this.currentLocationId,
    };
  }

  onChange(handler: ChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  reset(): void {
    this.inspectedHotspots.clear();
    this.collectedEvidence.clear();
    this.askedQuestions.clear();
    this.stage = "field";
    this.currentLocationId = "snow-desk";
    this.activeDialogueId = undefined;
    this.selectedHypothesisId = undefined;
    this.synthesisConfidence = undefined;
    this.preparedForBoard = false;
    this.boardPresented = false;
    this.emitChange();
  }

  private emitChange(): void {
    this.changeHandlers.forEach((handler) => handler());
  }
}

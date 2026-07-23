import { createIcons, icons } from "lucide";
import { boardThreshold, mapDeathPoints } from "../simulation/content";
import type { GameState } from "../simulation/gameState";
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
  LocationId,
  SynthesisConfidence,
} from "../simulation/types";

type OverlayMode = "none" | "notebook" | "map";
type MapLayerId = "evidence" | HypothesisId;

const mapLayers: Array<{ id: MapLayerId; label: string; icon: string; summary: string }> = [
  {
    id: "evidence",
    label: "Evidence",
    icon: "map-pinned",
    summary: "Plot the deaths, pump, exceptions, and outliers as the notebook fills.",
  },
  {
    id: "waterborne",
    label: "Water",
    icon: "droplets",
    summary: "A common-source exposure should radiate from pump use, even when ordinary inspection does not make contamination obvious.",
  },
  {
    id: "miasma",
    label: "Air",
    icon: "cloud-fog",
    summary: "Bad air should follow streets, drains, and proximity rather than a particular drinking source.",
  },
  {
    id: "person-to-person",
    label: "Household",
    icon: "users",
    summary: "Direct spread should grow by contact chains instead of erupting sharply around one shared source.",
  },
  {
    id: "crowding",
    label: "Crowding",
    icon: "building-2",
    summary: "Crowding should make institutions and dense workplaces suffer with nearby households.",
  },
];

const mapAnnotations: Array<{
  evidenceId: string;
  title: string;
  body: string;
  x: number;
  y: number;
  kind: "cluster" | "record" | "household" | "conflict" | "exception" | "method";
}> = [
  {
    evidenceId: "pump-cluster",
    title: "Address cluster",
    body: "Deaths crowd toward the pump, giving the inquiry a center.",
    x: 42,
    y: 30,
    kind: "cluster",
  },
  {
    evidenceId: "household-exposure",
    title: "Household account",
    body: "A death mark gains timing, care, and pump-water testimony.",
    x: 39,
    y: 73,
    kind: "household",
  },
  {
    evidenceId: "pump-water-inspection",
    title: "Sample inconclusive",
    body: "The water does not visibly prove danger; the map must carry more weight.",
    x: 66,
    y: 31,
    kind: "conflict",
  },
  {
    evidenceId: "attack-timeline",
    title: "Abrupt return",
    body: "Daily returns turn the addresses into a sudden common-source curve.",
    x: 18,
    y: 18,
    kind: "record",
  },
  {
    evidenceId: "workhouse-exception",
    title: "Workhouse exception",
    body: "Near the outbreak, but protected by a separate supply.",
    x: 76,
    y: 39,
    kind: "exception",
  },
  {
    evidenceId: "brewery-exception",
    title: "Brewery exception",
    body: "Near Broad Street, but workers did not rely on pump water.",
    x: 70,
    y: 77,
    kind: "exception",
  },
  {
    evidenceId: "snow-method",
    title: "Outliers checked",
    body: "Snow keeps exceptions and distant addresses in the argument.",
    x: 23,
    y: 35,
    kind: "method",
  },
];

export interface PrototypeUi {
  onReset?: () => void;
  openSnowReview: () => void;
  render: () => void;
  setPrompt: (hotspot?: Hotspot) => void;
  setMessage: (message: string) => void;
}

export function createUi(root: HTMLDivElement, gameState: GameState): PrototypeUi {
  let overlayMode: OverlayMode = "none";
  let mapLayer: MapLayerId = "evidence";
  let focusedHotspot: Hotspot | undefined;
  let message = "Speak with Snow at the desk to receive your field assignment.";
  let isTransitioning = false;
  let snowReviewOpen = false;

  const ui: PrototypeUi = {
    openSnowReview() {
      if (canOpenSnowReview()) {
        gameState.closeDialogue();
        overlayMode = "none";
        snowReviewOpen = true;
        message = "Snow reviews the competing theories with you.";
        render();
        return;
      }

      message = "Return to Snow with enough evidence before preparing the Board argument.";
      render();
    },
    render,
    setPrompt(hotspot?: Hotspot) {
      focusedHotspot = hotspot;
      render();
    },
    setMessage(nextMessage: string) {
      message = nextMessage;
    },
  };

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const actionTarget = target.closest<HTMLElement>("[data-action]");
    const action = actionTarget?.dataset.action;
    if (!action) {
      return;
    }

    const stage = gameState.getStage();
    const toolsAvailable = stage !== "briefing" && stage !== "board";

    if (action === "travel") {
      const locationId = actionTarget.dataset.locationId as LocationId | undefined;
      beginTravel(locationId);
      return;
    }

    if (action === "map-primary") {
      if (gameState.preparedForBoard && stage === "synthesis") {
        const result = gameState.presentToBoard();
        overlayMode = "none";
        message = result.message;
        render();
        return;
      }

      if (gameState.hasEnoughEvidenceForSynthesis() && !gameState.preparedForBoard) {
        if (gameState.getCurrentLocation().id === "snow-desk") {
          snowReviewOpen = true;
          overlayMode = "none";
          message = "Review the theories with Snow, choose a confidence level, then prepare the Board argument.";
          render();
          return;
        }

        beginTravel("snow-desk");
        return;
      }

      message = `Gather ${boardThreshold} evidence cards before preparing a Board argument.`;
      render();
      return;
    }

    if (action === "ask") {
      const questionId = actionTarget.dataset.questionId;
      if (!questionId) {
        return;
      }
      const result = gameState.askQuestion(questionId);
      message = result.message;
    }

    if (action === "select-hypothesis") {
      const hypothesisId = actionTarget.dataset.hypothesisId as HypothesisId | undefined;
      if (!hypothesisId) {
        return;
      }
      const result = gameState.selectHypothesis(hypothesisId);
      mapLayer = hypothesisId;
      message = result.message;
    }

    if (action === "map-layer") {
      const layerId = actionTarget.dataset.mapLayer as MapLayerId | undefined;
      if (!layerId || !mapLayers.some((layer) => layer.id === layerId)) {
        return;
      }
      mapLayer = layerId;
      message =
        layerId === "evidence"
          ? "Map table shows the plotted evidence."
          : `${mapLayers.find((layer) => layer.id === layerId)?.label ?? "Theory"} overlay selected.`;
    }

    if (action === "set-confidence") {
      const confidence = actionTarget.dataset.confidence as SynthesisConfidence | undefined;
      if (!confidence) {
        return;
      }
      const result = gameState.setSynthesisConfidence(confidence);
      message = result.message;
    }

    if (action === "prepare-board") {
      const result = gameState.prepareBoardArgument();
      message = result.message;
    }

    if (action === "close-dialogue") {
      gameState.closeDialogue();
    }

    if (action === "close-snow-review") {
      snowReviewOpen = false;
      message = "Snow waits at the desk. Click him when you want to continue the review.";
    }

    if (action === "begin") {
      overlayMode = "none";
      snowReviewOpen = false;
      message = "Broad Street field inquiry opened. Inspect evidence markers around the street.";
      gameState.beginFieldwork();
    }
    if (action === "notebook" && toolsAvailable) {
      snowReviewOpen = false;
      overlayMode = overlayMode === "notebook" ? "none" : "notebook";
    }
    if (action === "map" && toolsAvailable) {
      gameState.closeDialogue();
      snowReviewOpen = false;
      overlayMode = overlayMode === "map" ? "none" : "map";
    }
    if (action === "close") {
      overlayMode = "none";
    }
    if (action === "reset") {
      overlayMode = "none";
      mapLayer = "evidence";
      snowReviewOpen = false;
      message = "Speak with Snow at the desk to receive your field assignment.";
      ui.onReset?.();
    }
    if (action === "present") {
      const result = gameState.presentToBoard();
      overlayMode = "none";
      message = result.message;
    }
    if (action === "finish-board") {
      gameState.finishBoard();
      overlayMode = "none";
      message = "Late September records are open. Review the notebook or replay the inquiry.";
    }
    render();
  });

  function render(): void {
    const collected = gameState.getCollectedEvidence();
    const allEvidence = gameState.getAllEvidence();
    const activeDialogue = gameState.getActiveDialogue();
    const stage = gameState.getStage();
    const currentLocation = gameState.getCurrentLocation();
    const showChapterPanel = stage === "briefing" || stage === "board" || stage === "complete";
    const showSynthesisPanel =
      stage === "synthesis" &&
      currentLocation.id === "snow-desk" &&
      snowReviewOpen &&
      overlayMode === "none" &&
      !activeDialogue &&
      !isTransitioning;
    document.body.dataset.overlayOpen =
      overlayMode === "none" && !showChapterPanel && !isTransitioning && !activeDialogue && !showSynthesisPanel
        ? "false"
        : "true";
    document.body.dataset.stage = stage;

    root.innerHTML = `
      <div class="hud" data-overlay="${overlayMode}" data-stage="${stage}" data-synthesis-panel="${showSynthesisPanel}">
        <section class="objective-chip" aria-label="Current objective">
          <span class="objective-kicker">Broad Street Inquiry</span>
          <strong>${escapeHtml(gameState.getObjective())}</strong>
          <span class="location-line">${escapeHtml(currentLocation.title)}</span>
        </section>

        <nav class="tool-rail" aria-label="Investigation tools">
          <button class="icon-button ${overlayMode === "notebook" ? "is-active" : ""}" data-action="notebook" aria-label="Notebook">
            <i data-lucide="notebook-tabs"></i>
            <span>${gameState.getProgressText()}</span>
          </button>
          <button class="icon-button ${overlayMode === "map" ? "is-active" : ""}" data-action="map" aria-label="Map">
            <i data-lucide="map"></i>
          </button>
          <button class="icon-button" data-action="reset" aria-label="Reset inquiry">
            <i data-lucide="rotate-ccw"></i>
          </button>
        </nav>

        <div class="reticle" aria-hidden="true"></div>
        <div class="prompt-strip">${renderPrompt()}</div>
        <div class="toast-line">${escapeHtml(message)}</div>

        ${showChapterPanel ? renderChapterPanel(gameState.getCurrentScene(), stage, gameState) : ""}
        ${showSynthesisPanel ? renderSynthesisPanel(gameState, mapLayer) : ""}
        ${activeDialogue && overlayMode === "none" ? renderDialoguePanel(activeDialogue, gameState) : ""}
        ${overlayMode === "notebook" ? renderNotebook(collected, allEvidence) : ""}
        ${overlayMode === "map" ? renderMap(collected, gameState, mapLayer) : ""}
        ${isTransitioning ? renderTravelFade(message) : ""}
      </div>
    `;

    createIcons({ icons });
  }

  function beginTravel(locationId: LocationId | undefined): void {
    const location = locationId ? gameState.getLocation(locationId) : undefined;
    if (!location || !locationId) {
      message = "That location is not on the inquiry map.";
      render();
      return;
    }

    if (!gameState.canTravelToLocation(locationId)) {
      message = `${location.title} is not available for field travel yet.`;
      render();
      return;
    }

    isTransitioning = true;
    snowReviewOpen = false;
    message = `Traveling to ${location.title}...`;
    render();
    window.setTimeout(() => {
      const result = gameState.travelToLocation(locationId);
      overlayMode = "none";
      message = result.message;
      render();
      window.setTimeout(() => {
        isTransitioning = false;
        render();
      }, 260);
    }, 260);
  }

  function renderPrompt(): string {
    if (gameState.getStage() === "briefing") {
      return `<span class="prompt-muted">Read Snow's desk briefing, then begin fieldwork.</span>`;
    }

    if (gameState.getStage() === "board") {
      return `<span class="prompt-muted">The Board is considering temporary pump closure.</span>`;
    }

    if (gameState.getStage() === "complete") {
      return `<span class="prompt-muted">Late September records are open. Review evidence or reset the inquiry.</span>`;
    }

    if (!focusedHotspot) {
      if (
        gameState.getStage() === "field" &&
        gameState.getCurrentLocation().id === "snow-desk" &&
        !gameState.hasEvidence("snow-method")
      ) {
        return `<span class="prompt-muted">Look toward John Snow, then press Enter or select him.</span>`;
      }

      return `<span class="prompt-muted">Look toward an interview or evidence marker.</span>`;
    }

    if (
      focusedHotspot.id === "john-snow" &&
      gameState.getStage() === "synthesis" &&
      gameState.getCurrentLocation().id === "snow-desk"
    ) {
      return `
        <span class="prompt-title">John Snow</span>
        <span class="prompt-copy">Review the evidence against each possible theory.</span>
        <span class="prompt-state">Press Enter or select</span>
      `;
    }

    const inspected = gameState.hasInspected(focusedHotspot.id);
    const evidence = gameState.getEvidence(focusedHotspot.evidenceId);
    const recorded = evidence ? gameState.hasEvidence(evidence.id) : false;
    return `
      <span class="prompt-title">${escapeHtml(focusedHotspot.label)}</span>
      <span class="prompt-copy">${escapeHtml(focusedHotspot.description)}</span>
      <span class="prompt-state">${recorded ? "Recorded" : inspected ? "Interview open" : "Press Enter or select"}</span>
    `;
  }

  function canOpenSnowReview(): boolean {
    return (
      gameState.getStage() === "synthesis" &&
      gameState.getCurrentLocation().id === "snow-desk" &&
      gameState.hasEnoughEvidenceForSynthesis()
    );
  }

  return ui;
}

function renderDialoguePanel(dialogue: DialogueNode, gameState: GameState): string {
  const questionRows = dialogue.questions
    .map((question) => renderDialogueQuestion(question, gameState))
    .join("");

  return `
    <aside class="dialogue-panel" aria-label="${escapeHtml(dialogue.speaker)} interview">
      <div class="dialogue-header">
        <div>
          <span>${escapeHtml(dialogue.role)}</span>
          <strong>${escapeHtml(dialogue.speaker)}</strong>
        </div>
        <button class="icon-button" data-action="close-dialogue" aria-label="Close interview"><i data-lucide="x"></i></button>
      </div>
      <p class="dialogue-intro">${escapeHtml(dialogue.intro)}</p>
      <div class="question-list">
        ${questionRows}
      </div>
    </aside>
  `;
}

function renderDialogueQuestion(question: DialogueQuestion, gameState: GameState): string {
  const asked = gameState.hasAskedQuestion(question.id);
  const evidence = gameState.getQuestionEvidence(question);
  const collected = evidence ? gameState.hasEvidence(evidence.id) : false;
  return `
    <article class="question-card ${asked ? "is-asked" : ""}">
      <button class="question-button" data-action="ask" data-question-id="${escapeHtml(question.id)}">
        <span>${escapeHtml(question.prompt)}</span>
        <i data-lucide="${asked ? "rotate-ccw" : "message-circle-question"}"></i>
      </button>
      ${
        asked
          ? `<p>${escapeHtml(question.response)}</p>
             ${
               evidence
                 ? `<div class="question-evidence ${collected ? "is-collected" : ""}">
                    <i data-lucide="${collected ? "check-circle-2" : "circle"}"></i>
                    <span>${escapeHtml(collected ? `Recorded: ${evidence.title}` : evidence.title)}</span>
                  </div>`
                 : ""
             }`
          : ""
      }
    </article>
  `;
}

function renderTravelFade(message: string): string {
  return `
    <div class="travel-fade" aria-label="Travel transition">
      <div>
        <i data-lucide="map-pinned"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

function renderChapterPanel(scene: ChapterScene, stage: ChapterStage, gameState: GameState): string {
  const body = gameState.getCurrentSceneBody().map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const boardFindings =
    stage === "board" || stage === "complete"
      ? `<ol class="findings-list">${gameState
          .getBoardFindings()
          .map((finding) => `<li>${escapeHtml(finding)}</li>`)
          .join("")}</ol>`
      : "";
  const preparedArgument = stage === "board" || stage === "complete" ? renderPreparedArgument(gameState) : "";

  const action =
    stage === "briefing"
      ? `<button class="primary-action wide-action" data-action="begin">
          <i data-lucide="footprints"></i>
          Begin field inquiry
        </button>`
      : stage === "board"
        ? `<button class="primary-action wide-action" data-action="finish-board">
            <i data-lucide="check-circle-2"></i>
            Continue after meeting
          </button>`
        : `<button class="primary-action wide-action" data-action="reset">
            <i data-lucide="rotate-ccw"></i>
            Replay chapter
          </button>`;

  return `
    <aside class="chapter-panel" aria-label="${escapeHtml(scene.title)}">
      <div class="chapter-heading">
        <span>${escapeHtml(scene.subtitle)}</span>
        <h2>${escapeHtml(scene.title)}</h2>
      </div>
      <div class="chapter-copy">
        ${body}
        ${preparedArgument}
        ${boardFindings}
      </div>
      <div class="chapter-actions">
        ${action}
      </div>
    </aside>
  `;
}

function renderPreparedArgument(gameState: GameState): string {
  const hypothesis = gameState.getSelectedHypothesis();
  if (!hypothesis) {
    return "";
  }

  return `
    <section class="argument-summary" aria-label="Prepared argument">
      <span>Prepared theory</span>
      <strong>${escapeHtml(hypothesis.title)}</strong>
      <p>${escapeHtml(gameState.synthesisConfidence ? gameState.getConfidenceLabel(gameState.synthesisConfidence) : "Confidence not stated")}</p>
      <p>${escapeHtml(gameState.getPreparedMapSummary())}</p>
    </section>
  `;
}

function renderNotebook(collected: EvidenceCard[], allEvidence: EvidenceCard[]): string {
  const evidenceRows = allEvidence
    .map((card) => {
      const unlocked = collected.some((collectedCard) => collectedCard.id === card.id);
      return `
        <article class="evidence-row ${unlocked ? "is-unlocked" : ""}">
          <div class="evidence-status">
            <i data-lucide="${unlocked ? "check-circle-2" : "circle-dot"}"></i>
          </div>
          <div>
            <h3>${escapeHtml(unlocked ? card.title : "Unrecorded evidence")}</h3>
            <p>${escapeHtml(unlocked ? card.summary : "Inspect the street scene to add this note.")}</p>
            ${
              unlocked
                ? `<div class="source-line">
                    <i data-lucide="${sourceIcon(card.sourceType)}"></i>
                    <span>${escapeHtml(card.sourceLabel)}</span>
                  </div>
                  <div class="tag-row">${card.supports
                    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
                    .join("")}</div>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <aside class="overlay-panel notebook-panel" aria-label="Field notebook">
      <div class="panel-header">
        <div>
          <span>Field notebook</span>
          <strong>${collected.length} evidence ${collected.length === 1 ? "card" : "cards"}</strong>
        </div>
        <button class="icon-button" data-action="close" aria-label="Close notebook"><i data-lucide="x"></i></button>
      </div>
      <div class="panel-body evidence-list">
        ${evidenceRows}
      </div>
    </aside>
  `;
}

function sourceIcon(sourceType: EvidenceCard["sourceType"]): string {
  if (sourceType === "document") {
    return "file-text";
  }
  if (sourceType === "interview") {
    return "messages-square";
  }
  if (sourceType === "inference") {
    return "brain";
  }
  return "eye";
}

function renderSynthesisPanel(gameState: GameState, mapLayer: MapLayerId): string {
  const selectedHypothesis = gameState.getSelectedHypothesis();
  const confidenceOptions: SynthesisConfidence[] = ["tentative", "proportionate", "overstated"];
  const canPrepare = Boolean(selectedHypothesis && gameState.synthesisConfidence);
  const hypothesisRows = gameState
    .getHypotheses()
    .map((hypothesis) => renderHypothesisCard(hypothesis, gameState, selectedHypothesis?.id === hypothesis.id))
    .join("");
  const confidenceRows = confidenceOptions
    .map((confidence) => {
      const active = gameState.synthesisConfidence === confidence;
      return `
        <button
          class="confidence-button ${active ? "is-selected" : ""}"
          data-action="set-confidence"
          data-confidence="${confidence}"
          aria-pressed="${active}"
        >
          ${escapeHtml(gameState.getConfidenceLabel(confidence))}
        </button>
      `;
    })
    .join("");

  return `
    <aside class="synthesis-panel" aria-label="Snow hypothesis board">
      <div class="synthesis-header">
        <div>
          <span>Snow's Desk</span>
          <strong>Hypothesis board</strong>
        </div>
        <div class="synthesis-header-actions">
          <div class="synthesis-status ${gameState.preparedForBoard ? "is-ready" : ""}">
            <i data-lucide="${gameState.preparedForBoard ? "check-circle-2" : "clipboard-list"}"></i>
            <span>${gameState.preparedForBoard ? "Board ready" : "Snow review"}</span>
          </div>
          <button class="icon-button" data-action="close-snow-review" aria-label="Close Snow review">
            <i data-lucide="x"></i>
          </button>
        </div>
      </div>
      <p class="synthesis-copy">${escapeHtml(gameState.getSnowSynthesisFeedback())}</p>
      ${renderSynthesisMapStrip(gameState, mapLayer)}
      <div class="synthesis-controls">
        <div class="confidence-row" aria-label="Confidence">
          ${confidenceRows}
        </div>
        <div class="synthesis-actions">
          <button class="primary-action wide-action" data-action="prepare-board" ${canPrepare ? "" : "disabled"}>
            <i data-lucide="clipboard-check"></i>
            Prepare Board argument
          </button>
        </div>
      </div>
      <div class="hypothesis-grid">
        ${hypothesisRows}
      </div>
    </aside>
  `;
}

function renderSynthesisMapStrip(gameState: GameState, mapLayer: MapLayerId): string {
  const mappedFindings = gameState.getMappedEvidenceFindings();
  const layer = mapLayers.find((candidate) => candidate.id === mapLayer) ?? mapLayers[0];
  const findings = mappedFindings.length
    ? mappedFindings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")
    : `<li class="is-empty">Map evidence appears as you collect addresses, returns, and exceptions.</li>`;

  return `
    <section class="synthesis-map-strip" aria-label="Map evidence summary">
      <div class="map-strip-heading">
        <i data-lucide="${layer.icon}"></i>
        <div>
          <span>Map layer</span>
          <strong>${escapeHtml(layer.label)}</strong>
        </div>
      </div>
      <ul>${findings}</ul>
      <button class="secondary-action" data-action="map">
        <i data-lucide="map"></i>
        Open map table
      </button>
    </section>
  `;
}

function renderHypothesisCard(
  hypothesis: HypothesisDefinition,
  gameState: GameState,
  selected: boolean,
): string {
  const { supporting, complicating } = gameState.getHypothesisEvidence(hypothesis);
  return `
    <article class="hypothesis-card ${selected ? "is-selected" : ""}">
      <button
        class="hypothesis-select"
        data-action="select-hypothesis"
        data-hypothesis-id="${hypothesis.id}"
        aria-pressed="${selected}"
      >
        <span>${escapeHtml(hypothesis.title)}</span>
        <i data-lucide="${selected ? "check-circle-2" : "circle"}"></i>
      </button>
      <p>${escapeHtml(hypothesis.summary)}</p>
      <div class="fit-columns">
        ${renderEvidenceFit("Supports", supporting, "supports")}
        ${renderEvidenceFit("Complicates", complicating, "complicates")}
      </div>
    </article>
  `;
}

function renderEvidenceFit(label: string, evidenceCards: EvidenceCard[], kind: "supports" | "complicates"): string {
  const items = evidenceCards.length
    ? evidenceCards.map((card) => `<li>${escapeHtml(card.title)}</li>`).join("")
    : `<li class="is-empty">${kind === "supports" ? "No recorded evidence yet" : "No major conflict recorded"}</li>`;

  return `
    <div class="fit-list is-${kind}">
      <span>${escapeHtml(label)}</span>
      <ul>${items}</ul>
    </div>
  `;
}

function renderMap(collected: EvidenceCard[], gameState: GameState, mapLayer: MapLayerId): string {
  const collectedIds = new Set(collected.map((card) => card.id));
  const activeLayer = mapLayers.find((layer) => layer.id === mapLayer) ?? mapLayers[0];
  const points = mapDeathPoints
    .filter((point) => !point.unlocksWith || collectedIds.has(point.unlocksWith))
    .map(
      (point) => `
        <circle
          class="death-point"
          cx="${point.x}"
          cy="${point.y}"
          r="${3 + point.count * 0.45}"
          style="--plot-delay: ${plotDelay(point.id)}ms"
        >
          <title>${point.count} recorded ${point.count === 1 ? "death" : "deaths"}</title>
        </circle>
      `,
    )
    .join("");

  const stage = gameState.getStage();
  const evidenceReady = gameState.hasEnoughEvidenceForSynthesis();
  const fieldAssigned = gameState.hasEvidence("snow-method");
  const canPresent = gameState.preparedForBoard && stage === "synthesis";
  const needsSnowReview = evidenceReady && !gameState.preparedForBoard && stage === "synthesis";
  const currentLocation = gameState.getCurrentLocation();
  const canUseMapPrimary = fieldAssigned && (canPresent || needsSnowReview);
  let actionText = "Need more support";
  let primaryLabel = "Gather more evidence";
  let primaryIcon = "circle-dot";
  let primaryCopy = "Collect more evidence before preparing a Board argument.";

  if (!fieldAssigned) {
    actionText = "Assignment needed";
    primaryLabel = "Talk to Snow first";
    primaryIcon = "message-circle";
    primaryCopy = "Snow has not sent you into the streets yet.";
  } else if (canPresent) {
    actionText = "Ready for Board";
    primaryLabel = "Present prepared argument";
    primaryIcon = "map-pin";
    primaryCopy = "Snow's theory is prepared for the Board.";
  } else if (stage === "complete") {
    actionText = "Presented";
    primaryLabel = "Evidence presented";
  } else if (needsSnowReview) {
    actionText = currentLocation.id === "snow-desk" ? "Open Snow review" : "Return to Snow";
    primaryLabel = currentLocation.id === "snow-desk" ? "Open Snow review" : "Return to Snow's Desk";
    primaryIcon = "clipboard-list";
    primaryCopy =
      currentLocation.id === "snow-desk"
        ? "Open Snow's review board before the meeting."
        : "Return to Snow before approaching the Board.";
  } else if (evidenceReady) {
    actionText = "Review needed";
  }
  const locationNodes = gameState
    .getLocations()
    .map((location) => renderLocationNode(location, gameState, currentLocation.id))
    .join("");
  const layerControls = mapLayers
    .map((layer) => {
      const active = layer.id === activeLayer.id;
      return `
        <button
          class="map-layer-button ${active ? "is-selected" : ""}"
          data-action="map-layer"
          data-map-layer="${layer.id}"
          aria-pressed="${active}"
        >
          <i data-lucide="${layer.icon}"></i>
          <span>${escapeHtml(layer.label)}</span>
        </button>
      `;
    })
    .join("");
  const evidenceDocket = renderMapEvidenceDocket(gameState);
  const mappedFindings = gameState.getMappedEvidenceFindings();
  const mapFindings = mappedFindings.length
    ? mappedFindings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")
    : `<li class="is-empty">No mapped evidence yet. Start with the pump observation.</li>`;

  return `
    <aside class="overlay-panel map-panel" aria-label="Snow map table">
      <div class="panel-header">
        <div>
          <span>Map table</span>
          <strong>Deaths, pumps, and exceptions</strong>
        </div>
        <button class="icon-button" data-action="close" aria-label="Close map"><i data-lucide="x"></i></button>
      </div>
      <div class="map-action-bar">
        <div class="map-action-copy">
          <span>${escapeHtml(actionText)}</span>
          <strong>${escapeHtml(primaryCopy)}</strong>
        </div>
        <button class="primary-action" data-action="map-primary" ${canUseMapPrimary ? "" : "disabled"}>
          <i data-lucide="${primaryIcon}"></i>
          ${escapeHtml(primaryLabel)}
        </button>
      </div>
      <div class="map-layer-row" aria-label="Map layers">
        ${layerControls}
      </div>
      <div class="map-layout">
        <div class="map-canvas" data-layer="${activeLayer.id}">
          <svg class="snow-map" viewBox="0 0 100 100" role="img" aria-label="Stylized Broad Street evidence map">
            ${renderHistoricMapBase()}
            ${renderHypothesisOverlay(activeLayer.id, collectedIds)}
            ${points}
            ${renderExceptionMarkers(collectedIds)}
            ${renderSampleMarkers(collectedIds)}
            <circle class="pump-point" cx="51" cy="50" r="4.4" />
          </svg>
          <div class="map-annotations" aria-label="Plotted notes">
            ${renderMapAnnotations(collectedIds)}
          </div>
          ${locationNodes}
        </div>
        <div class="map-brief">
          <div class="layer-summary">
            <span>${escapeHtml(activeLayer.label)} layer</span>
            <p>${escapeHtml(activeLayer.summary)}</p>
          </div>
          <ul class="map-findings">
            ${mapFindings}
          </ul>
          <dl>
            <div><dt>Current place</dt><dd>${escapeHtml(currentLocation.shortTitle)}</dd></div>
            <div><dt>Evidence cards</dt><dd>${collected.length}/${boardThreshold}</dd></div>
            <div><dt>Snow review</dt><dd>${gameState.preparedForBoard ? "Prepared" : evidenceReady ? "Needed" : "Locked"}</dd></div>
            <div><dt>Action</dt><dd>${escapeHtml(actionText)}</dd></div>
          </dl>
          ${evidenceDocket}
        </div>
      </div>
    </aside>
  `;
}

function renderHistoricMapBase(): string {
  return `
    <g class="map-blocks" aria-hidden="true">
      <path d="M7 41 L25 37 L29 51 L11 55 Z" />
      <path d="M35 37 L51 35 L49 49 L36 51 Z" />
      <path d="M58 34 L71 36 L69 49 L56 49 Z" />
      <path d="M78 35 L94 40 L92 51 L77 49 Z" />
      <path d="M9 58 L29 58 L30 70 L14 73 Z" />
      <path d="M38 56 L50 56 L49 70 L36 70 Z" />
      <path d="M57 55 L70 54 L69 66 L57 67 Z" />
      <path d="M76 55 L94 56 L93 67 L76 66 Z" />
      <path d="M13 76 L32 73 L34 85 L11 91 Z" />
      <path d="M40 73 L57 71 L59 80 L39 84 Z" />
      <path d="M66 70 L88 68 L94 73 L69 79 Z" />
    </g>
    <g class="street-labels" aria-hidden="true">
      <text x="47" y="46" transform="rotate(-4 47 46)">BROAD STREET</text>
      <text x="56" y="24" transform="rotate(-86 56 24)">CAMBRIDGE ST</text>
      <text x="76" y="29" transform="rotate(-86 76 29)">POLAND ST</text>
      <text x="25" y="31" transform="rotate(76 25 31)">BERWICK ST</text>
      <text x="35" y="76" transform="rotate(-3 35 76)">MARSHALL ST</text>
      <text x="71" y="82" transform="rotate(-8 71 82)">BREWER ST</text>
      <text x="75" y="45" transform="rotate(21 75 45)">GREAT PULTENEY</text>
      <text x="64" y="61" transform="rotate(-86 64 61)">NEW ST</text>
    </g>
  `;
}

function renderHypothesisOverlay(layerId: MapLayerId, collectedIds: Set<string>): string {
  if (layerId === "evidence") {
    return "";
  }

  if (layerId === "waterborne") {
    return `
      <g class="hypothesis-overlay is-waterborne">
        <circle class="source-wash" cx="51" cy="50" r="11" />
        ${collectedIds.has("household-exposure") ? `<circle class="household-wash" cx="55" cy="56" r="5" />` : ""}
        ${
          collectedIds.has("workhouse-exception") || collectedIds.has("brewery-exception")
            ? `<rect class="exception-wash" x="61" y="48" width="15" height="23" rx="4" />`
            : ""
        }
      </g>
    `;
  }

  if (layerId === "miasma") {
    return `
      <g class="hypothesis-overlay is-miasma">
        <rect class="miasma-wash" x="8" y="42" width="86" height="13" rx="6" transform="rotate(-4 51 48)" />
        <rect class="miasma-wash" x="66" y="12" width="12" height="76" rx="6" transform="rotate(1 72 50)" />
      </g>
    `;
  }

  if (layerId === "person-to-person") {
    return `
      <g class="hypothesis-overlay is-household">
        <circle class="household-node" cx="39" cy="60" r="3.6" />
        <circle class="household-node" cx="48" cy="50" r="3.6" />
        <circle class="household-node" cx="55" cy="45" r="3.6" />
        <circle class="household-node" cx="61" cy="52" r="3.6" />
        <circle class="household-node" cx="31" cy="38" r="3.6" />
        ${collectedIds.has("household-exposure") ? `<circle class="household-wash" cx="55" cy="56" r="5.2" />` : ""}
      </g>
    `;
  }

  return `
    <g class="hypothesis-overlay is-crowding">
      <rect class="crowding-wash" x="67" y="45" width="17" height="17" rx="3" />
      <rect class="crowding-wash" x="23" y="29" width="17" height="21" rx="3" />
      <rect class="crowding-wash" x="56" y="61" width="16" height="15" rx="3" />
    </g>
  `;
}

function renderExceptionMarkers(collectedIds: Set<string>): string {
  const markers = [
    collectedIds.has("household-exposure")
      ? `<g class="household-marker" transform="translate(55 56)">
          <circle r="4.6" />
          <text y="1.5">H</text>
        </g>`
      : "",
    collectedIds.has("workhouse-exception")
      ? `<g class="exception-marker" transform="translate(73 53)">
          <path d="M0 -5 L5 0 L0 5 L-5 0 Z" />
          <text y="1.5">W</text>
        </g>`
      : "",
    collectedIds.has("brewery-exception")
      ? `<g class="exception-marker" transform="translate(63 67)">
          <path d="M0 -5 L5 0 L0 5 L-5 0 Z" />
          <text y="1.5">B</text>
        </g>`
      : "",
  ];
  return markers.join("");
}

function renderSampleMarkers(collectedIds: Set<string>): string {
  if (!collectedIds.has("pump-water-inspection")) {
    return "";
  }

  return `
    <g class="sample-marker" transform="translate(58 43)">
      <path d="M-3 -6 L3 -6 L2 0 L5 5 L-5 5 L-2 0 Z" />
      <text y="2">?</text>
    </g>
  `;
}

function renderMapAnnotations(collectedIds: Set<string>): string {
  return mapAnnotations
    .filter((annotation) => collectedIds.has(annotation.evidenceId))
    .map(
      (annotation) => `
        <article
          class="map-note is-${annotation.kind}"
          style="left: ${annotation.x}%; top: ${annotation.y}%; --note-delay: ${plotDelay(annotation.evidenceId)}ms"
        >
          <strong>${escapeHtml(annotation.title)}</strong>
          <span>${escapeHtml(annotation.body)}</span>
        </article>
      `,
    )
    .join("");
}

function renderMapEvidenceDocket(gameState: GameState): string {
  const rows = gameState
    .getAllEvidence()
    .map((card) => {
      const plotted = gameState.hasEvidence(card.id);
      return `
        <li class="${plotted ? "is-plotted" : ""}">
          <i data-lucide="${plotted ? "check-circle-2" : "circle"}"></i>
          <span>${escapeHtml(plotted ? card.title : "Awaiting source")}</span>
        </li>
      `;
    })
    .join("");

  return `
    <section class="map-docket" aria-label="Evidence plotted on map">
      <span>Plotted sources</span>
      <ul>${rows}</ul>
    </section>
  `;
}

function plotDelay(id: string): number {
  return Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0) % 420;
}

function renderLocationNode(
  location: InvestigationLocation,
  gameState: GameState,
  currentLocationId: LocationId,
): string {
  const unlocked = gameState.isLocationUnlocked(location);
  const active = location.id === currentLocationId;
  const canTravel = gameState.canTravelToLocation(location.id) && !active;
  const offMap = location.id === "snow-desk" || location.id === "registrar" || location.id === "board-room";
  const classes = [
    "map-node",
    active ? "is-current" : "",
    unlocked ? "is-unlocked" : "is-locked",
    location.boardOnly ? "is-board" : "",
    offMap ? "is-off-map" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const boardReady = location.boardOnly && unlocked;
  const label = active
    ? `Current location: ${location.title}`
    : boardReady
      ? `${location.title} is ready; use Present prepared argument`
    : canTravel
      ? `Travel to ${location.title}`
      : `${location.title} is locked`;

  return `
    <button
      class="${classes}"
      style="left: ${location.mapPoint.x}%; top: ${location.mapPoint.y}%"
      data-action="travel"
      data-location-id="${location.id}"
      aria-label="${escapeHtml(label)}"
      ${canTravel ? "" : "disabled"}
    >
      <span class="node-dot"></span>
      <span class="node-label">${escapeHtml(location.shortTitle)}</span>
    </button>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

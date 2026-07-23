# The Broad Street Inquiry

Educational browser game design for WebXR and desktop fallback.

## One-Sentence Pitch

In September 1854, the player becomes John Snow's apprentice in Soho, gathering testimony, tracing water sources, challenging miasma assumptions, and transforming scattered grief into a map persuasive enough to change public action.

## Intended Audience

- Secondary school, undergraduate public health, history of science, GIS, and epidemiology learners.
- Museum, public health outreach, and classroom deployments.
- Target session length: 35-50 minutes for a class-ready version; 90-120 minutes for a full narrative edition.

## Design Pillars

1. **Think under uncertainty.** The player never gets a modern bacteriology shortcut. They must reason from addresses, dates, water sources, anomalies, and testimony.
2. **Make fieldwork human.** Interviews are respectful and emotionally grounded, with survivors, workers, parish officials, and Henry Whitehead treated as collaborators rather than clue dispensers.
3. **Let the map become the argument.** Data visualization is not a menu screen; it is the dramatic turn where local details become an epidemiological pattern.
4. **Avoid the lone-genius myth.** Snow matters, but the game foregrounds registrars, local residents, Henry Whitehead, parish authorities, and later inquiry work.
5. **Show public health action as provisional.** The pump handle removal is framed as a decision made from strong circumstantial evidence while the outbreak was already declining, not as a magic ending.

## Historical Spine

The game takes place around the Soho outbreak centered on Broad Street, now Broadwick Street, in late August and September 1854. Most physicians still favored airborne "miasma" explanations, while Snow had argued since 1849 that cholera spread through contaminated water. The outbreak begins as scattered reports, then surges dramatically around August 31 and early September.

The St. James parish inquiry later counted 618 resident deaths in the defined cholera area and 45 known non-resident deaths. It recorded a sharp rise after August 30: 31 fatal attacks on August 31, 131 on September 1, 125 on September 2, then a fall over the next days. Snow interviewed households, used death records, tested the Broad Street pump water but did not get conclusive chemical proof, and presented his evidence to the Board of Guardians on September 7. The pump handle was removed the following day.

Henry Whitehead, assistant curate of St. Luke's, began as a skeptic of Snow's water hypothesis and used his local trust to investigate further. His later work helped connect apparently contradictory cases, strengthen the pump-water argument, and reconstruct the likely contamination pathway around the infant at 40 Broad Street and a nearby cesspool. The game treats that later reconstruction as a separate chapter rather than knowledge the player has at the beginning.

## Learning Outcomes

By the end, players should be able to:

- Explain why cholera transmission was disputed in 1854.
- Distinguish correlation, mechanism, and public health action.
- Collect a basic line list: person, place, onset/death date, exposure, and uncertainty.
- Compare competing hypotheses against observed evidence.
- Interpret Snow-style spatial clustering around pumps and walking access.
- Explain why exceptions matter, including the workhouse, brewery, Hampstead water delivery, schoolchildren, and workplace exposures.
- Describe how mapping and local knowledge can change a public health decision.
- Recognize the limitations of Snow's immediate evidence and why later inquiry mattered.

## Player Role

The player is a fictional apprentice working with Snow. This keeps the player close to the historical action without inventing implausible agency for Snow himself.

The player can:

- Conduct interviews.
- Copy death records and addresses.
- Inspect water use, household routines, and work sites.
- Ask Snow, Whitehead, or parish officials for interpretation.
- Build and revise a map.
- Present evidence to a skeptical committee.

The player cannot:

- Diagnose cholera with modern microbiology.
- Discover Vibrio cholerae directly.
- Save every victim through individual treatment choices.
- Force agreement by selecting a single "correct" dialogue line.

## Core Loop

1. **Enter a 360 location.** The player is placed in a historically grounded scene.
2. **Observe and collect.** Hotspots reveal testimony, records, environmental details, and contradictions.
3. **Record evidence.** The field notebook stores case records and evidence cards with confidence levels.
4. **Test hypotheses.** The player tags evidence against miasma, crowding, water source, person-to-person contact, occupation, and elevation theories.
5. **Update the map.** New addresses and pumps appear as marks, clusters, catchment boundaries, and routes.
6. **Debrief.** Snow or Whitehead asks the player to explain what changed and what remains uncertain.

## Current Prototype Interaction Model

The vertical slice uses stationary 360-style locations with desktop and VR-friendly interaction. Each location has a marker that opens an authored interview, document, or observation panel. The player chooses questions, reads the response, and records evidence only when the answer supports a specific line of inquiry. Recorded notes carry a source label such as interview, document, observation, or inference, so the notebook teaches where knowledge came from rather than treating every clue as equal.

The map is now a standard investigation tool. It supports travel between unlocked locations, reveals deaths and exceptions as evidence is collected, and sends the player back to Snow's Desk once there is enough evidence for synthesis.

Snow's Desk now serves as the hypothesis board. Before approaching the Board of Guardians, the player compares the recorded evidence against competing theories, chooses the explanation that best fits the pattern, states a confidence level, and prepares a Board argument. This keeps the Board scene from being a simple evidence-count gate and makes the scientific reasoning step explicit.

The final panel jumps forward to late September. If the pump-water case is prepared and the handle is removed, the outbreak has spent itself and Snow continues checking the parish record. If the player advances a theory that leaves the pump in use, the ending becomes a clearly labeled alternate course: a renewed rise of cases forces closure later, with Whitehead's later reconstruction around 40 Broad Street revealing why the missed water route mattered.

## Game Structure

### Chapter 0: The Apprentice's Desk

**Setting:** Snow's study, papers spread across a desk, a wall map, water company returns, a portable microscope, and cholera notes.

**Purpose:** Teach the starting knowledge state.

**Player tasks:**

- Read a short briefing on cholera symptoms and the dominant miasma theory.
- Review Snow's existing water hypothesis.
- Learn the field notebook and evidence confidence UI.
- Practice adding an address to a map.

**Historical guardrail:** The game makes clear that Snow already had a theory before Broad Street; the outbreak is a test of that theory, not a sudden inspiration.

### Chapter 1: Broad Street, August 31-September 2

**Setting:** A 360 view near the Broad Street pump at dusk, with shuttered shops, anxious residents, and messengers moving between homes.

**Purpose:** Establish urgency and human stakes without sensationalizing illness.

**Player tasks:**

- Collect first reports from households around Broad Street and Cambridge Street.
- Record onset and death dates from urgent notes and registrar returns.
- Identify early competing explanations: smell, overcrowding, weather, sewers, and water.
- Mark the pump and neighboring pumps on the base map.

**Key design beat:** The first map is messy and incomplete. The player sees clusters, but also enough uncertainty to avoid premature certainty.

### Chapter 2: Households and Exceptions

**Setting:** Linked 360 interiors and thresholds: a household room, a lodging house stair, a washhouse entrance, and a school doorway.

**Purpose:** Teach line-listing and exposure histories.

**Player tasks:**

- Interview relatives and neighbors about daily water use.
- Distinguish residence from exposure location.
- Record whether people drank pump water at home, work, school, or nearby shops.
- Add uncertainty notes when witnesses are gone, grieving, or unsure.

**Evidence examples:**

- Children who pass the pump on the way to school.
- Workers drinking water near Broad Street.
- A person who lived outside the area but consumed water carried from Broad Street.

### Chapter 3: The Workhouse and the Brewery

**Setting:** Poland Street workhouse courtyard and Broad Street brewery.

**Purpose:** Teach negative evidence and confounding.

**Player tasks:**

- Investigate why the workhouse, though close to affected streets, had few deaths.
- Interview staff about the workhouse's own water supply.
- Visit the brewery and learn why workers were largely spared.
- Add "expected but absent" cases to the hypothesis board.

**Key design beat:** The player learns that evidence is not only where deaths occurred; it is also where they did not occur.

### Chapter 4: The Map Room

**Setting:** A semi-abstract 3D map table. In VR, the player stands over a raised Soho street map; on desktop, it appears as an interactive oblique map.

**Purpose:** Make visualization the mystery's central reveal.

**Player tasks:**

- Place death marks by address.
- Toggle pumps, streets, walking routes, sewer grates, elevation, household density, and date layers.
- Compare Euclidean distance with actual walking distance to pumps.
- Trace apparently distant cases back to work, school, errands, or delivered water.
- Build a concise evidence bundle for the Board of Guardians.

**UI idea:** Evidence cards can be placed physically onto the map table. Strong cards glow subtly only after the player can explain why they matter.

### Chapter 5: September 7, The Board of Guardians

**Setting:** A parish meeting room with Snow, officials, and skeptical local voices.

**Purpose:** Teach public health persuasion under incomplete evidence.

**Player tasks:**

- Present three to five evidence cards.
- Respond to objections: bad smells, class prejudice, "many pump drinkers survived," and cases outside the immediate cluster.
- Recommend temporary pump closure by handle removal.
- State the uncertainty honestly.

**Outcome:** The handle is removed on September 8, but the game notes that the epidemic had already begun to subside. The win condition is not "prove everything"; it is "make a proportionate public health case."

### Chapter 6: Henry Whitehead's Inquiry

**Setting:** St. Luke's parish spaces, revisited Broad Street households, and a late reconstruction scene around 40 Broad Street.

**Purpose:** Show collaboration, correction, and post-outbreak investigation.

**Player tasks:**

- Work with Whitehead, who knows local families and can ask questions Snow cannot.
- Recheck cases that seemed to weaken the pump hypothesis.
- Identify the infant case and the possible cesspool contamination pathway.
- Revise the map and timeline with later evidence.

**Key design beat:** Whitehead's skepticism becomes a scientific strength. He does not just "confirm Snow"; he improves the investigation by testing it.

### Chapter 7: Aftermath and the Grand Experiment

**Setting:** Snow's desk returns, now with a wider London water-supply map.

**Purpose:** Connect Broad Street to broader epidemiological reasoning.

**Player tasks:**

- Compare neighborhoods served by different water companies.
- See why the South London water-supply comparison provided stronger population-level evidence than the Broad Street story alone.
- Reflect on sanitation, sewer infrastructure, and later acceptance of waterborne transmission.

## Main Characters

### John Snow

A physician and anesthetist with a disciplined, understated presence. He is careful about evidence and often asks the player, "What would we expect to see if this were true?"

### Henry Whitehead

Assistant curate of St. Luke's. He is locally trusted, initially skeptical, socially observant, and essential to later reconstruction. He challenges the player to account for specific people, not only map points.

### Local Registrars and Parish Officials

They provide returns, mortality tables, and procedural pressure. They are not villains; they represent uncertainty, public inconvenience, and the limits of accepted medical theory.

### William Farr

Used through documents or optional dialogue as an important statistical voice associated with elevation and miasma-oriented explanations. He helps the game avoid making alternative hypotheses look foolish.

### Residents, Workers, and Survivors

Mostly composite characters unless a specific historical person is source-supported. Each interview has a reason to exist: water source, timing, location, social trust, or anomaly.

## Natural Language Character Conversations

Future versions can support natural language conversations with selected characters, especially Snow, Whitehead, parish officials, and a small set of composite residents. This should be a hybrid system rather than a fully open-ended replacement for authored dialogue.

Recommended approach:

- Keep required investigation beats authored and testable.
- Let the chatbot handle optional follow-up questions, clarification, and role-play around known evidence.
- Give each character a constrained source pack, timeline, vocabulary, social position, and uncertainty rules.
- Allow characters to say they do not know, cannot infer something, or would not know later historical facts.
- Record useful statements as source-tagged evidence cards only when they match approved facts or scenario data.
- Provide a scripted fallback path for classrooms, offline demos, accessibility, and cost control.

Guardrails:

- Do not let a character reveal modern bacteriology, germ theory consensus, or later Whitehead reconstruction before the story reaches that point.
- Do not fabricate named victims or direct quotations unless they are clearly marked as fictionalized composites.
- Keep student/player personal information out of prompts and logs by default.
- Treat generative dialogue as educational interpretation, while the map, evidence cards, and assessment logic remain deterministic.

Good first experiment: make Henry Whitehead a natural-language companion in Chapter 6, where open-ended questioning fits his local inquiry role and the player already has enough evidence to evaluate answers.

## Mystery Design

The central mystery is not "which object is cursed." It is: **Which explanation best predicts the pattern of illness, and what action is justified before proof is complete?**

Competing hypotheses:

- **Miasma:** bad smells, drains, overcrowding, weather.
- **Waterborne exposure:** drinking water from Broad Street or water carried from it.
- **Direct person-to-person spread:** nursing, household contact, shared rooms.
- **Occupation or class:** tailors, workers, poorer households, crowded lodging.
- **Elevation or geography:** low-lying areas or street topography.
- **Random providence or divine explanation:** represented historically, but handled with care.

Hypothesis tests:

- Does the theory predict the cluster around the pump?
- Does it explain the workhouse and brewery?
- Does it explain deaths outside the area?
- Does it account for timing?
- Does it suggest an action that is reversible and proportionate?

## Field Notebook

The notebook is the player's main tool.

Sections:

- **Line list:** case ID, address, date, age band when known, exposure, source confidence.
- **Interview notes:** witness, relationship, reliability, missing information.
- **Evidence cards:** concise claims tied to source data.
- **Hypothesis board:** player tags evidence for and against each theory.
- **Map layers:** deaths, pumps, roads, walking routes, dates, density, special sites.
- **Glossary:** cholera, miasma, cesspool, registrar, workhouse, exposure, confounder.

Evidence confidence:

- **Observed:** player saw a document, place, or testimony directly.
- **Reported:** a witness or official reported it.
- **Inferred:** the player or Snow derived it from patterns.
- **Later reconstruction:** learned after the immediate crisis.

## WebXR Experience

### Camera and Comfort

- Primary mode: seated or standing stationary 360 scenes.
- Movement: scene-to-scene travel by map, carriage, or doorway fade; no continuous artificial locomotion.
- VR interactions: gaze reticle and controller ray selection.
- Comfort options: snap turn, vignette during transitions, seated height calibration, left/right hand support.
- Desktop fallback: drag-to-look, WASD or arrow key rotation, click/tap hotspots, keyboard shortcuts for notebook and map.

### Immersive 360 Scene Model

Each location uses:

- A historically guided 360 panorama or skybox.
- A small number of placed 3D props for readable interaction: pump, ledger, map pins, cups, buckets, chalkboard, water jugs.
- Spatial audio beds: distant carts, footsteps, church bells, rain, papers, low street murmur.
- Hotspots attached to objects and people, not floating generic markers when avoidable.

### Desktop Fallback

The desktop version is not a second-class mode. It uses the same scene data, case logic, map, and dialogue. It replaces head tracking with mouse/keyboard camera control and keeps notebook/map interactions in DOM panels.

### Map Travel

The map should become a standard investigation mechanic. In VR, the player remains mostly stationary within each node, then opens the map to travel to other known locations through a short fade out/fade in transition. In desktop mode, the same map controls work as point-and-click travel.

Travel nodes should include places such as Snow's desk, Broad Street pump, the registrar's ledger, Poland Street workhouse, Broad Street brewery, and the Board of Guardians. Evidence should progressively add death marks, exceptions, and contextual annotations to the same map, so the player experiences movement through Soho and the growth of the epidemiological argument as one linked activity.

## UI Direction

The normal play view should stay low-chrome:

- Top-left compact objective chip.
- Bottom-center transient interaction prompt.
- Right-side small evidence counter or notebook icon.
- Map and notebook open as dedicated overlays that pause camera input.

Visual language:

- Materials: paper, ink, brass, dark wood, chalk, glass, wet stone.
- Palette: soot black, off-white paper, muted teal for water layers, dark red for deaths, brass for active tools, gray-blue for uncertainty.
- Typography: readable serif for documents, sturdy sans-serif for UI labels.
- Motion: restrained page turns, ink spreading into map marks, subtle table lighting when a pattern emerges.

No always-on walls of text in VR. Long historical explanation lives in optional notebook pages, classroom debriefs, or post-scene summaries.

## Technical Architecture

Recommended implementation path:

- **Runtime:** vanilla Three.js with TypeScript and Vite.
- **XR:** WebXR through Three.js `VRButton` and `renderer.xr.enabled`.
- **Loop:** `renderer.setAnimationLoop(...)` for VR compatibility.
- **UI:** DOM overlay for notebook, menus, captions, and accessibility-sensitive text.
- **Assets:** GLB/glTF for 3D props, KTX2 or compressed textures for shipped builds, equirectangular JPEG/WebP/AVIF panoramas for 360 scenes.
- **Data:** JSON content files for scenes, dialogue, evidence, and map records.
- **State:** simulation state outside Three.js scene objects.

Suggested directories:

```text
src/
  simulation/
    gameState.ts
    evidence.ts
    hypotheses.ts
    progression.ts
  render/
    app/
    scenes/
    hotspots/
    xr/
  ui/
    notebook/
    map/
    dialogue/
    settings/
  content/
    scenes/
    dialogue/
    evidence/
    cases/
  data/
    snow-map/
    sources/
```

### Minimal Data Shapes

```ts
type EvidenceConfidence = "observed" | "reported" | "inferred" | "later_reconstruction";

interface CaseRecord {
  id: string;
  address: string;
  dateOfAttack?: string;
  dateOfDeath?: string;
  exposureClaims: ExposureClaim[];
  mapPoint?: { x: number; y: number };
  confidence: EvidenceConfidence;
}

interface ExposureClaim {
  source: "broad_street_pump" | "other_pump" | "workhouse_well" | "brewery_well" | "unknown";
  route: "home" | "work" | "school" | "delivered" | "public_house" | "unknown";
  confidence: EvidenceConfidence;
  note: string;
}

interface HypothesisScore {
  hypothesisId: string;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  playerExplanation: string;
}
```

## Historical Data Strategy

Use real data where possible, dramatize only where documented detail is insufficient.

Priority data sources:

- Snow's 1855 map and text.
- St. James Cholera Inquiry Committee report, including daily attack counts, mortality area, and Snow's special report.
- Digitized Snow-map datasets such as the R `cholera` package or GIS derivatives for deaths, pumps, streets, and walking neighborhoods.
- Whitehead's later report and historical scholarship for the post-outbreak reconstruction.

Content rules:

- Use exact historical names only when source-supported and educationally necessary.
- Use composite residents for interviews when the precise words or identities are not known.
- Label later reconstruction separately from September 1854 field evidence.
- Distinguish "Snow believed," "the map suggested," "the committee accepted," and "later evidence showed."

## Assessment and Debrief

The game should grade reasoning, not speed.

Assessment moments:

- **Line-list check:** Did the player distinguish residence from exposure?
- **Hypothesis explanation:** Can the player state what evidence supports and weakens each theory?
- **Map interpretation:** Can the player explain clustering, exceptions, and pump access?
- **Committee case:** Did the player recommend a proportionate intervention with uncertainty acknowledged?
- **Reflection:** What did Whitehead add that Snow alone could not?

End-of-game debrief:

- Show the player's final map beside Snow's.
- Summarize missed anomalies.
- Explain what modern epidemiology would add today: microbiology, water testing, ethics review, privacy protection, and rapid surveillance.

## MVP Vertical Slice

Build a 20-30 minute prototype first:

1. Snow's desk tutorial.
2. Broad Street pump 360 scene.
3. Two interview scenes: household and brewery or workhouse.
4. Interactive map table with 30-50 case points.
5. Board of Guardians evidence presentation.
6. Desktop fallback and basic WebXR session entry.

Success criteria:

- Player can enter VR on a WebXR-capable browser.
- Player can complete the full path on desktop without VR.
- Evidence collection changes the map and the committee outcome.
- The game teaches why the pump hypothesis was persuasive but not magically proven.

## Full Production Scope

Full version scenes:

- Snow's study.
- Broad Street pump.
- Household interior near Broad Street.
- Washhouse/school exposure route.
- Poland Street workhouse.
- Broad Street brewery.
- Hampstead delivered-water vignette.
- Parish meeting room.
- St. Luke's / Whitehead inquiry.
- 40 Broad Street reconstruction.
- South London water company epilogue.

Production systems:

- Scene manifest and hotspot editor.
- Dialogue authoring format.
- Map-data import pipeline.
- Classroom mode with teacher controls and exportable learner report.
- Localization-ready text and captions.
- Accessibility settings for comfort, contrast, text size, subtitles, and input mode.

## Historical Sources

- CDC, "150th Anniversary of John Snow and the Pump Handle" - concise chronology including August 31, September 8, interviews, death records, and public health action: https://www.cdc.gov/mmwr/preview/mmwrhtml/mm5334a1.htm
- Report on the Cholera Outbreak in the Parish of St. James, Westminster, During the Autumn of 1854 - parish inquiry report with mortality counts, daily progression, Snow's special report, and committee context: https://upload.wikimedia.org/wikipedia/commons/0/0f/Report_on_the_cholera_outbreak_in_the_parish_of_St._james%2C_Westminster%2C_during_the_autumn_of_1854._%28electronic_resource%29_%28IA_b21363870%29.pdf
- London Museum, "John Snow: Cholera & the Broad Street pump" - public history summary and visual references: https://www.londonmuseum.org.uk/collections/london-stories/john-snow-cholera-broad-street-pump/
- PubMed abstract, Newsom, "Pioneers in infection control: John Snow, Henry Whitehead, the Broad Street pump, and the beginnings of geographical epidemiology" - concise scholarly framing of Snow and Whitehead: https://pubmed.ncbi.nlm.nih.gov/16891036/
- UCLA Department of Epidemiology, John Snow archive and Snow's 1855 text pages - Snow's own account and map context: https://www.ph.ucla.edu/epi/snow.html
- R `cholera` package documentation - digitized map, pump, fatality, road, and walking-neighborhood data useful for implementation: https://www.rdocumentation.org/packages/cholera/versions/0.9.1

## Technical References

- MDN WebXR permissions and security - immersive sessions require appropriate permission policy, focused/trustworthy context, and user intent: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security
- MDN WebXR startup and shutdown - session creation, `immersive-vr`, reference spaces, and lifecycle: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown
- Three.js VRButton docs - WebXR entry button utility: https://threejs.org/docs/pages/VRButton.html
- Three.js WebXR basics - enabling XR and using `renderer.setAnimationLoop`: https://threejs.org/manual/en/webxr-basics.html

# HVAC UI Competitiveness Plan vs BuildVision

## Purpose

This plan translates the BuildVision competitor analysis into a practical UI roadmap for the Angular application, with focus on:

- Application feature competitiveness
- Human-factor design quality (trust, speed, adoption)

Primary input: `documentation/buildvision-competitor-analysis.md`

## Strategic Positioning

BuildVision appears strong in:

- Bid triage and early qualification
- Spec extraction and equipment identification
- Quote drafting workflows
- Lightweight memory/history framing

HVAC product opportunity to differentiate:

- Deep HVAC engineering workflow (not only category detection)
- Tool-path vs manufacturer-path model comparison
- Explainability and audit trace for high-liability decisions
- Human-in-the-loop approvals at critical gates

## Product Goals (Next 2-3 Sprints)

1. Improve speed-to-decision during intake and qualification.
2. Increase user trust through evidence-backed recommendations.
3. Make selection decisions safer and more consistent across users.
4. Preserve human judgment while reducing repetitive manual work.

## MVP Alignment Guardrails (From Meeting Transcript)

Use these rules to accept or defer any BuildVision-inspired feature:

1. Proposal-phase first
- Prioritize features that reduce wasted effort before award.

2. Qualification before deep detail
- Optimize "Should we pursue?" before adding submittal-grade detail UX.

3. Cooling-tower workflow first
- Keep MVP centered on cooling tower opportunities and represented manufacturer fit.

4. Human decision gates remain mandatory
- Suggestions can accelerate work, but GO/NO-GO and final selection approvals stay human.

5. Engineering liability requires explainability
- Any recommendation shown in UI must include confidence and source evidence.

6. Prefer repeatable high-frequency wins
- Ship changes that apply across most daily bids, not edge-case polish.

## Value-Impact Filter (Use Before Sprint Commitment)

Score each candidate from 1-5 on:

1. Volume impact: How often does this affect daily proposal work?
2. Cycle-time impact: Does it reduce time-to-bid or time-to-decision?
3. Decision quality impact: Does it lower false pursuits or bad selections?
4. Trust impact: Does it improve explainability and reviewer confidence?
5. Delivery risk: Can it ship with current API and UI surface area?

Prioritization rule:
- Implement now if total score >= 18 and delivery risk is manageable.
- Defer if score < 18 or requires major backend dependencies.

## MVP-Scoped Feature Set (Highest Value Only)

Implement now:

1. Bid Triage Scorecard
- High volume and immediate cycle-time reduction during proposal intake.

2. BOD Qualification Panel
- Directly improves GO/NO-GO quality for represented manufacturer fit.

3. Selection Workbench Delta View
- Core HVAC differentiator: tool-path vs manufacturer-path comparison with rationale.

Defer to post-MVP:

1. Engineer Memory Sidebar
- Valuable, but not required for initial proposal-phase throughput gains.

2. Proposal Readiness Meter
- Useful operationally, but lower impact than triage + qualification + selection.

3. Advanced historical KPI dashboarding
- Add once event instrumentation and usage volume stabilize.

## UX Principles (Human-Factor Attributes)

1. Confidence over novelty
- Every recommendation must show confidence and evidence source.

2. Explainability at point of decision
- Users should not navigate away to understand why the system recommends an action.

3. Fast triage under time pressure
- Surface priority and blockers in one glance for estimators.

4. Guardrails over automation theater
- Keep explicit human approvals for Qualification and Selection.

5. Cognitive load reduction
- Use progressive disclosure, clear severity labels, and concise reason codes.

6. Operational memory capture
- Turn human rationale into reusable organizational knowledge.

## Recommended Feature Changes

### Priority 1: Bid Triage Scorecard (Queue + Opportunity Header)

Outcome:
- Users can quickly answer: "Should we spend time on this bid?"

Add:
- Win probability
- BOD fit score
- Due-date risk
- Manufacturer-fit indicator
- Recommendation badge: Pursue / Pass / Needs Review

Primary UI locations:
- Proposal Intake Queue
- Project Summary header

Success metrics:
- Time-to-first-decision decreases
- More consistent triage outcomes between users

### Priority 1: Basis-of-Design (BOD) Panel in Qualification

Outcome:
- Clear visibility into represented line-card fit and exclusions.

Add:
- Detected BOD manufacturers
- Represented manufacturer overlap/conflict
- Policy pass/fail reason list
- Confidence + citations

Primary UI location:
- Qualification Assistant card

Success metrics:
- Fewer false-positive pursuits
- Higher confidence in Go/No-Go decisions

### Priority 2: Evidence-Backed Scope Detection

Outcome:
- Scope decisions become verifiable, not checkbox-only.

Add:
- "Detected" vs "Manual" tags
- Confidence per equipment type
- Citation snippets from spec docs
- Missing-evidence flags

Primary UI location:
- New Proposal Wizard, Scope Detection step

Success metrics:
- Reduced scope selection rework
- Higher agreement between users on scope

### Priority 2: Selection Workbench (Tool-Path vs Manufacturer-Path)

Outcome:
- Product differentiates beyond generic line-card matching.

Add:
- Side-by-side model comparison
- Delta severity badges
- Required override rationale
- Approval history timeline

Primary UI location:
- Selection Assistant section

Success metrics:
- Faster approved selections
- Fewer selection-related escalations

### Priority 3: Engineer Memory Sidebar

Outcome:
- Institutional knowledge becomes reusable context.

Add:
- Engineer preferences and typical constraints
- Recent outcomes for similar opportunities
- Historical win/loss cues (non-authoritative)

Primary UI location:
- Evidence and Activity panel

Success metrics:
- Improved triage quality for repeat engineers
- Reduced dependency on tribal knowledge

### Priority 3: Proposal Readiness Meter

Outcome:
- Users know exactly what blocks release.

Add:
- Completeness score
- Blocking checklist
- Confidence trend
- "Ready for review" criteria gate

Primary UI location:
- Decision Packet / Final Recommendation area

Success metrics:
- Fewer incomplete submissions
- Improved review throughput

## Implementation Roadmap

### Sprint 1

- Bid Triage Scorecard
- BOD Panel
- Basic confidence + reason code rendering

### Sprint 2

- Selection Workbench deltas and rationale capture

### Sprint 3

- Evidence-Backed Scope Detection (if still scoring >= 18 by value-impact filter)

Post-MVP backlog:

- Engineer Memory Sidebar
- Proposal Readiness Meter
- KPI instrumentation and dashboard hooks

## Data and Telemetry Requirements

To support these UX features, ensure backend contracts include:

- Confidence scores for qualification/scope/selection outputs
- Citation objects (document, page, snippet)
- BOD extraction results and conflict flags
- Selection comparison deltas with severity
- User decision rationale and timestamps

Instrumentation events:

- triage_recommendation_rendered
- triage_decision_submitted
- selection_override_submitted
- readiness_blocker_seen
- readiness_gate_passed

## Risks and Mitigations

1. Risk: Over-automation reduces trust
- Mitigation: Keep suggest-only patterns and explicit approvals.

2. Risk: UI density overwhelms users
- Mitigation: Use progressive disclosure and compact summary cards.

3. Risk: Confidence scores misinterpreted
- Mitigation: Add confidence tooltips and evidence links.

4. Risk: Incomplete data contracts
- Mitigation: Ship features in stages with graceful placeholders.

## Definition of Done for Competitiveness Phase

1. Development users can complete triage and qualification with visible confidence and evidence.
2. Selection decisions show side-by-side deltas and mandatory rationale for overrides.
3. Readiness gating is visible before final review action.
4. Product team can measure cycle-time and decision-consistency improvements from telemetry.

## Immediate Next Actions

1. Create UI tickets for Sprint 1 features.
2. Confirm API payload additions for confidence/citations/BOD fields.
3. Align frontend and backend acceptance criteria per feature.
4. Run a short user walkthrough with estimator and reviewer roles before Sprint 2.

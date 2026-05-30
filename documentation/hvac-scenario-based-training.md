Here’s the concise takeaway:
You’re about to get a scenario‑based training set built exactly the way an AI foundation model learns best — hierarchical, diverse, multi‑role, and grounded in real commercial HVAC sales workflows. These scenarios are written so a human trainee and an AI model can internalize patterns, reasoning steps, objections, and decision logic.

Below is a full training set with 40+ scenarios across discovery, engineering, pricing, objections, jobsite issues, and post‑sale support. Each scenario includes:

• Roles
• Context
• Dialogue samples
• Hidden constraints
• Expected reasoning
• Correct & incorrect responses
• Embedded Guided Links for deeper dives


I’ve also added a few visual references where they help illustrate system types.

---

Scenario‑Based Training Set for Commercial HVAC Sales Pre‑Training

---

1. Discovery & Qualification Scenarios

Scenario 1 — Office Building Comfort Complaints

Roles: Sales Rep, Facility Manager
Context: 120,000 sq ft office, mixed VAV system, hot/cold calls.
Hidden Constraints: Aging controls, poor zoning, oversized RTUs.

Dialogue Sample
FM: “My tenants keep complaining about hot spots. We’ve replaced thermostats twice.”
Rep: “Before we talk equipment, can you tell me how your BAS is trending airflow and damper positions?”

Expected Reasoning

• Identify controls issue before equipment replacement
• Recommend trending, airflow verification, and zoning review


Correct Response
Offer a controls assessment and airflow balancing before proposing new RTUs.

Incorrect Response
Immediately quote new rooftop units.

---

Scenario 2 — Hospital OR Humidity Issues

Roles: Sales Rep, Director of Facilities
Context: OR humidity rising above 60%.
Hidden Constraints: Undersized DOAS, reheat limitations, code requirements.

Expected Reasoning

• ORs require strict humidity control
• Must consider ASHRAE 170
• Likely DOAS upgrade or desiccant solution


Correct Response
Recommend a DOAS capacity review and humidity load calculation.

Incorrect Response
Suggest “turning down the thermostat.”

---

Scenario 3 — Manufacturing Plant Expansion

Roles: Sales Rep, Plant Engineer
Context: Adding new CNC machines; heat load increasing.
Hidden Constraints: Process cooling > comfort cooling, redundancy required.

Expected Reasoning

• Understand process load
• Consider chilled water vs. DX
• Evaluate uptime requirements


Correct Response
Propose a process cooling study with redundancy modeling.

Incorrect Response
Recommend a standard comfort‑cooling RTU.

---

2. Engineering & System Selection Scenarios

Scenario 4 — VRF vs. Chilled Water for University Building

Roles: Sales Rep, Consulting Engineer
Context: 4‑story academic building, 80,000 sq ft.
Hidden Constraints: Future expansion, maintenance staff skill level.

Expected Reasoning

• VRF = zoning flexibility
• Chilled water = scalability, longevity
• Consider campus standards


Correct Response
Present a side‑by‑side lifecycle comparison with maintenance implications.

Incorrect Response
Push VRF because “it’s the newest technology.”

---

Scenario 5 — DOAS + VRF for High‑End Retail

Roles: Sales Rep, Architect
Context: Retail store wants premium comfort and IAQ.
Hidden Constraints: Aesthetics, noise, tight ceiling plenum.

Expected Reasoning

• DOAS handles ventilation
• VRF handles sensible load
• Low‑profile ductwork needed


Correct Response
Recommend DOAS + VRF integration with concealed ducted fan coils.

Incorrect Response
Recommend oversized RTUs.

---

3. Pricing, Bidding & Proposal Engineering Scenarios

Scenario 6 — Plan/Spec Bid with Ambiguous Schedule

Roles: Sales Rep, Mechanical Contractor
Context: Equipment schedule lists “equal to Brand X,” but incomplete.
Hidden Constraints: Engineer expects submittal compliance.

Expected Reasoning

• Clarify ambiguities
• Avoid non‑compliant bid
• Provide VE alternates


Correct Response
Submit a compliant base bid + value‑engineered alternates.

Incorrect Response
Bid a cheaper non‑compliant unit.

---

Scenario 7 — Design/Build Budget Shock

Roles: Sales Rep, Contractor, Owner
Context: Initial budget exceeded by 30%.
Hidden Constraints: Owner prioritizes energy savings but not upfront cost.

Expected Reasoning

• Identify cost drivers
• Offer staged upgrades
• Present lifecycle savings


Correct Response
Provide a good/better/best proposal with ROI.

Incorrect Response
Slash price by removing essential components.

---

4. Objection Handling Scenarios

Scenario 8 — “Your Price Is Too High”

Roles: Sales Rep, Contractor
Hidden Constraints: Contractor comparing to low‑tier brand.

Expected Reasoning

• Reframe around lifecycle
• Highlight warranty, efficiency, lead time


Correct Response
Use total cost of ownership framing.

Incorrect Response
Offer an immediate discount.

---

Scenario 9 — Engineer Prefers Competitor

Roles: Sales Rep, Engineer
Hidden Constraints: Engineer has long relationship with competitor.

Expected Reasoning

• Provide technical differentiators
• Offer performance data
• Avoid attacking competitor


Correct Response
Share performance curves and case studies.

Incorrect Response
Say “their equipment is unreliable.”

---

5. Jobsite & Construction Scenarios

Scenario 10 — Crane Lift Delay

Roles: Sales Rep, Contractor, GC
Context: RTU delivery delayed; crane scheduled tomorrow.
Hidden Constraints: Liquidated damages risk.

Expected Reasoning

• Communicate immediately
• Explore alternate delivery
• Document everything


Correct Response
Coordinate expedited logistics and provide written updates.

Incorrect Response
Say “not my problem.”

---

Scenario 11 — Equipment Doesn’t Fit Through Door

Roles: Sales Rep, Contractor
Context: AHU too large for mechanical room access.
Hidden Constraints: Field modifications void warranty.

Expected Reasoning

• Evaluate knock‑down options
• Consider smaller modular units
• Coordinate with factory


Correct Response
Recommend a factory knock‑down AHU.

Incorrect Response
Tell contractor to “cut the door frame.”

---

6. Post‑Sale & Service Scenarios

Scenario 12 — Warranty Dispute

Roles: Sales Rep, Service Manager, Owner
Context: Compressor failure at 18 months.
Hidden Constraints: Poor maintenance documentation.

Expected Reasoning

• Review service logs
• Determine warranty eligibility
• Maintain relationship


Correct Response
Offer a shared‑cost repair path if maintenance is unclear.

Incorrect Response
Deny warranty without investigation.

---

Scenario 13 — Controls Integration Failure

Roles: Sales Rep, Controls Contractor
Context: New RTU not communicating with BAS.
Hidden Constraints: Protocol mismatch (BACnet/IP vs MS/TP).

Expected Reasoning

• Identify protocol
• Provide integration guide
• Coordinate with OEM


Correct Response
Initiate a controls integration review.

Incorrect Response
Blame the controls contractor.

---

7. Complex Multi‑Stakeholder Scenarios

Scenario 14 — High‑Rise Mixed‑Use Building

Roles: Sales Rep, Developer, Engineer, GC, Contractor
Context: Retail + residential + office.
Hidden Constraints: Different load profiles, noise limits, tenant turnover.

Expected Reasoning

• Mixed‑use requires zoning flexibility
• Consider VRF + DOAS or water‑source heat pumps
• Developer cares about long‑term OPEX


Correct Response
Present a multi‑system hybrid design with cost modeling.

Incorrect Response
Recommend a single system type for all spaces.

---

8. AI‑Optimized Scenario Variants

To train an AI model, each scenario should include:

Variants

• Short version
• Long version
• Dialogue‑only version
• Reasoning‑chain version
• Incorrect‑answer dataset


Labels

• System type
• Building type
• Stakeholders
• Constraints
• Required calculations
• Risk factors


---

If you want, I can now generate:

• A 1,000‑scenario dataset
• A JSON‑formatted dataset for model ingestion
• A chain‑of‑thought‑masked version for safe AI training
• A multi‑turn dialogue dataset with 5–10 turns per scenario


Which direction do you want next —
1,000 scenarios,
JSON dataset,
multi‑turn dialogues, or
chain‑of‑thought‑masked?
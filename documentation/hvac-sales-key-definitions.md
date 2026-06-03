Yes. As we've dug deeper into the HVAC proposal/submittal process, a domain glossary is becoming one of the most valuable artifacts for both:

1. Human onboarding
2. AI agent grounding

In fact, I would argue that before building a single agent, the team should build an:

> **HVAC Proposal & Submittal Taxonomy**

because the AI needs to understand the language exactly as Scott and Daniel use it.

---

# Commercial HVAC Proposal Cycle Glossary (Draft v1)

## Addenda (Addendum)

Definition:

Changes or clarifications issued after the original bid documents are released.

Example:

```text
Addendum #2

Replace Marley NC8408
with Marley NC8414.
```

Why Important:

Many proposal errors occur because bidders miss an addendum.

AI Use:

* Change detection
* Requirement reconciliation
* Bid risk scoring

---

## Approved Manufacturer

Definition:

Manufacturer explicitly permitted by the project specifications.

Example:

```text
Approved Manufacturers:

Marley
BAC
Evapco
```

Why Important:

If your manufacturer is not approved, the opportunity may be unqualified.

AI Use:

* Qualification assistant
* Win probability scoring

---

## Basis of Design (BOD)

Definition:

Manufacturer or product used by the engineer as the reference design.

Example:

```text
Basis of Design:
Marley Cooling Tower
```

Why Important:

BOD vendors often have a significant advantage during bidding.

AI Use:

* Opportunity scoring
* Competitive analysis

---

## Bid

Definition:

A formal request to provide equipment, labor, or services for a project.

Example:

```text
Houston Medical Center Expansion
```

AI Use:

* Qualification workflow entry point

---

## Bid Invitation

Definition:

Notification requesting participation in a bidding opportunity.

Sources:

* Email
* Procore
* ConstructConnect
* BuildingConnected

AI Use:

* Opportunity intake

---

## Bid Board

Definition:

Online platform used to distribute project opportunities.

Examples:

* Procore
* ConstructConnect
* BuildingConnected

AI Use:

* Opportunity discovery

---

## Closed Bid

Definition:

Bid opportunity sent only to selected contractors.

Why Important:

Usually higher probability of success.

AI Use:

* Qualification scoring

---

## Open Bid

Definition:

Bid opportunity publicly available to many contractors.

Why Important:

Typically lower probability of winning.

AI Use:

* Qualification scoring

---

## Cooling Tower

Definition:

Equipment used to reject heat from building water systems.

Example Manufacturers:

* Marley
* BAC
* Evapco

Why Important:

Primary MVP product category.

AI Use:

* Product-specific domain assistant

---

## Cut Sheet

Definition:

Manufacturer technical document describing a specific product model.

Contains:

* Dimensions
* Weights
* Electrical requirements
* Performance characteristics

AI Use:

* Proposal generation
* Submittal generation

---

## Duty

Definition:

The required operating performance of equipment.

Example:

```text
Flow:
6000 GPM

Entering Water:
95°F

Leaving Water:
85°F
```

Why Important:

Drives equipment selection.

AI Use:

* Model selection
* Compliance checking

---

## Engineer of Record (EOR)

Definition:

Licensed engineer responsible for project design.

Why Important:

Ultimately approves submittals.

AI Use:

* Workflow routing
* Approval tracking

---

## Equipment Schedule

Definition:

Structured table listing equipment requirements.

Common Location:

```text
M601
M602
```

AI Use:

* Primary extraction source

---

## General Contractor (GC)

Definition:

Company responsible for overall construction delivery.

Role:

Coordinates subcontractors.

AI Use:

* Relationship intelligence

---

## HVAC Manufacturer Representative (Rep)

Definition:

Company authorized to sell a manufacturer's products within a territory.

Example:

```text
SNS represents Marley in Houston.
```

AI Use:

* Tenant definition

---

## Line Card

Definition:

List of manufacturers represented by a sales rep.

Example:

```text
Marley
Bell & Gossett
Cleaver-Brooks
```

AI Use:

* Qualification filtering

---

## Mechanical Contractor

Definition:

Contractor responsible for HVAC installation.

Role:

Purchases equipment from reps.

AI Use:

* CRM intelligence

---

## Mechanical Schedule

Definition:

Structured equipment requirements table.

Often:

```text
CT-1
CT-2
CT-3
```

Why Important:

Most important qualification artifact.

AI Use:

* Extraction
* Model selection

---

## Model Selection Program

Definition:

Manufacturer-provided software that determines which equipment model satisfies required duty.

Example:

```text
Marley Selection Software
```

Why Important:

Current "ground truth" selection mechanism.

AI Use:

* Human verification
* Benchmark comparison

---

## Proposal

Definition:

Pre-award commercial offer.

Contains:

* Equipment
* Pricing
* Scope

Usually short.

AI Use:

* MVP output

---

## Proposal Stage

Definition:

Pre-award phase where multiple vendors compete.

Characteristics:

* High volume
* Unpaid effort
* Lower detail

AI Use:

* Initial MVP focus

---

## Qualification

Definition:

Process of determining whether a project is worth pursuing.

Questions:

```text
Can we bid?
Should we bid?
Can we win?
```

AI Use:

* Qualification assistant

---

## Request For Proposal (RFP)

Definition:

Formal request seeking pricing and scope responses.

AI Use:

* Opportunity intake

---

## Scope

Definition:

Products and services being offered.

Example:

```text
Cooling Towers
Boilers
Pumps
```

AI Use:

* Opportunity classification

---

## Specification (Spec)

Definition:

Engineering requirements document.

Typically:

```text
Division 23
```

AI Use:

* RAG corpus
* Compliance validation

---

## Subcontractor

Definition:

Contractor performing a specialized portion of work.

Examples:

* Mechanical
* Electrical
* Plumbing

AI Use:

* Relationship mapping

---

## Submittal

Definition:

Post-award engineering package submitted for approval.

Contains:

* Cut sheets
* Compliance matrices
* Drawings
* Manuals

Why Important:

Much more detailed than proposals.

AI Use:

* Phase 2 functionality

---

## Tenant

Definition:

A distinct customer organization using the SaaS platform.

Example:

```text
SNS Houston
ABC Reps Dallas
XYZ Mechanical Atlanta
```

AI Use:

* Multi-tenant isolation

---

## Win Rate

Definition:

Percentage of proposals that result in awarded projects.

Example:

```text
25%
```

Meaning:

```text
4 proposals
→
1 awarded project
```

AI Use:

* Opportunity prioritization

---

One thing I noticed from the meeting transcript is that **"Basis of Design", "Line Card", "Duty", "Model Selection Program", "Approved Manufacturer", and "Qualification"** are probably the six most important terms for the MVP. Those six concepts drive almost every decision in the proposal workflow before a single price is generated.

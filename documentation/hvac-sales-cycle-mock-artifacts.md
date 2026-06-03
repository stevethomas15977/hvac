# Prompt
Act as an experienced HVAC Sales Representative and Mechanical Engineer that has joined a team of experienced Agentic AI Software Developers. The goal of this team is to design and build a solution that reduces the time to bid on HVAC opportunities while also maintaining a high level of engineering and revenue maximizing efficiency. Your task here is to help create mock example artifacts, such as documents, engineering specifications and equipment manufacturers pricing schedules, that are most important when trying to qualify a HVAC bid opportunities. The goal is to provide the Agentic AI Agents with enough information so they may aid and assist the HVAV Sales Representative. First provide a list of the most important artifacts. Then we can iterate through this list to create the mock artifacts.

# Response

This is exactly the right exercise.

One thing that became clear from your meeting is that the HVAC proposal process is **not fundamentally an AI problem**. It is primarily a **document, knowledge, and workflow problem**.

Before building agents, we need to identify:

1. What information does a senior HVAC sales engineer use?
2. Where does that information come from?
3. What decisions are being made?
4. What artifacts support those decisions?

Then we can determine:

* Prompt Context
* RAG Knowledge Base
* Structured Database
* Human-in-the-loop approval points

---

# Proposed HVAC Proposal Qualification Artifact Catalog

I would organize the artifacts into six categories.

---

# Category 1: Opportunity Intake Artifacts

Purpose:

> Should we pursue this opportunity?

These are consumed by the Qualification Assistant.

## Artifact 1.1 Bid Invitation Email

Example:

```text
Subject:
Houston Medical Center Expansion

Bid Due:
July 15, 2026

Mechanical Contractor:
ABC Mechanical

Project Value:
$45M

Requested Scope:
Cooling Towers
```

AI Use:

* Prompt Context
* Structured Extraction

---

## Artifact 1.2 Bid Board Listing

Examples:

* Procore
* ConstructConnect
* BuildingConnected

Contains:

```text
Project Name
Bid Date
Project Location
GC
Engineer
Architect
```

AI Use:

* Qualification Scoring

---

## Artifact 1.3 Historical Customer Relationship Profile

Internal CRM-style record.

Example:

```text
Customer:
ABC Mechanical

Projects Bid:
53

Projects Won:
18

Win Rate:
34%

Relationship:
Strong
```

AI Use:

* Qualification Score

---

# Category 2: Project Technical Artifacts

Purpose:

> What equipment is required?

These become the primary RAG corpus.

---

## Artifact 2.1 Mechanical Schedule

Most important artifact.

Example:

```text
CT-1

Cooling Capacity:
2500 Tons

Flow:
6000 GPM

Entering Water:
95°F

Leaving Water:
85°F

Approved Manufacturers:
Marley
BAC
Evapco
```

AI Use:

* Structured Extraction
* Equipment Matching

---

## Artifact 2.2 Mechanical Specifications

Usually Division 23.

Example:

```text
23 65 00
Cooling Towers

Acceptable Manufacturers:
Marley
BAC
Evapco

Fan Type:
Direct Drive

Drift Rate:
0.0005%
```

AI Use:

* RAG
* Compliance Checking

---

## Artifact 2.3 Mechanical Drawings

M Sheets

Examples:

```text
M201
M501
M601
```

Contains:

```text
Locations
Schedules
Notes
```

AI Use:

* Vision Models
* RAG

---

## Artifact 2.4 Addenda

Example:

```text
Addendum #3

Replace Marley NC8408
with Marley NC8414
```

AI Use:

* Requirement Delta Detection

---

# Category 3: Manufacturer Knowledge Artifacts

Purpose:

> What can we sell?

This becomes the Manufacturer Knowledge Base.

---

## Artifact 3.1 Product Catalog

Example:

```text
Marley NC Series Catalog
```

Contains:

```text
Models
Dimensions
Performance
Accessories
```

AI Use:

* RAG

---

## Artifact 3.2 Cut Sheets

Example:

```text
Marley NC8414 Cut Sheet
```

Contains:

```text
Dimensions
Weights
Connections
Power
```

AI Use:

* Proposal Generation

---

## Artifact 3.3 Engineering Manuals

Example:

```text
Cooling Tower Engineering Guide
```

Contains:

```text
Sizing
Installation
Maintenance
```

AI Use:

* Deep Technical Guidance

---

## Artifact 3.4 Manufacturer Selection Output

Very important.

Example:

```text
Project:
Houston Medical Center

Required Duty:
2500 Tons

Selected Model:
Marley NC8414

Confidence:
Approved
```

AI Use:

* Ground Truth

---

# Category 4: Commercial Artifacts

Purpose:

> Can we make money?

These become structured database records.

---

## Artifact 4.1 Manufacturer Price Book

Example:

```text
Model         Cost

NC8408       $120,000
NC8414       $145,000
NC8418       $170,000
```

AI Use:

* Margin Analysis

---

## Artifact 4.2 Discount Schedule

Example:

```text
Customer Type

Hospital      20%
Education     15%
Industrial    10%
```

AI Use:

* Pricing Recommendation

---

## Artifact 4.3 Accessory Pricing

Example:

```text
VFD Package      $12,500
Ladder Package    $3,200
Handrail Kit      $2,100
```

AI Use:

* Proposal Assembly

---

## Artifact 4.4 Historical Win/Loss Data

Example:

```text
Hospital Projects

Submitted: 120

Won: 42

Average Margin: 24%
```

AI Use:

* Pursue/No-Pursue Recommendations

---

# Category 5: Proposal Artifacts

Purpose:

> Create customer-facing proposal.

---

## Artifact 5.1 Proposal Template

Example:

```text
SNS Proposal Template.docx
```

AI Use:

* Document Generation

---

## Artifact 5.2 Cover Letter Template

Example:

```text
Dear ABC Mechanical...
```

AI Use:

* Proposal Generation

---

## Artifact 5.3 Equipment Schedule Table

Example:

```text
Qty  Description

2    Marley NC8414
1    Basin Sweeper
```

AI Use:

* Proposal Generation

---

# Category 6: Strategic Knowledge Artifacts

Purpose:

> Make better decisions than competitors.

This is where the moat lives.

---

## Artifact 6.1 Engineer Preference Database

Example:

```text
Engineer:
XYZ Consulting

Prefers:
Marley

Avoids:
Counterflow Towers
```

AI Use:

* Win Probability

---

## Artifact 6.2 Competitor Intelligence

Example:

```text
Competitor:
BAC Representative

Typical Discount:
18%

Strong Markets:
Healthcare
```

AI Use:

* Competitive Analysis

---

## Artifact 6.3 Basis of Design History

Example:

```text
Houston Medical Center

Basis of Design:
Marley
```

AI Use:

* Opportunity Qualification

---

# What Should Be Created First?

For the MVP centered on Cooling Towers, I would create these mock artifacts first:

### Tier 1 (Highest Priority)

1. Bid Invitation Email
2. Mechanical Schedule
3. Division 23 Cooling Tower Specification
4. Addendum
5. Marley Product Catalog
6. Manufacturer Selection Output
7. Price Book
8. Proposal Template

These eight artifacts alone are enough to build:

```text
Qualification Assistant
↓
Specification Extraction Assistant
↓
Cooling Tower Selection Assistant
↓
Proposal Generation Assistant
```

which is almost exactly the architecture Daniel and Scott described during the meeting.

My recommendation is that next we create a realistic **Mechanical Schedule (Artifact 2.1)** because that is the single most important document that drives almost every downstream decision in the cooling tower proposal workflow.

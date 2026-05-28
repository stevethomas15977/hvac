# HVAC Portal Sales Representative User Guide

## Purpose

This guide explains how a sales representative should use the Proposal workflow in the HVAC Portal from bid intake through qualification and selection decisions.

## Workflow overview

The current flow is organized into these steps:

1. Intake bid package
2. Qualification Assistant (Go/No-Go)
3. Selection Assistant (tool-path vs manufacturer-path)
4. Proposal draft generation (next phase)

## Step 1: Intake bid package

1. Open Proposals from the top navigation.
2. Select an opportunity from the Intake Queue.
3. In the center panel, upload or load the bid package.
4. Confirm intake reaches Intake complete status.
5. Review warnings in the Evidence and Activity panel before continuing.

Expected result:

- Documents are listed and ready for qualification.
- Missing-file or parse warnings are visible in the right panel.

## Step 2: Qualification Assistant

1. Click Run qualification.
2. Review:
- Recommendation (GO or NO GO)
- Confidence score
- Scope candidates and citations
- Reasoning list
3. Enter required human rationale in the decision box.
4. Click Mark GO or Mark NO GO.

Expected result:

- Decision is recorded with who/when/rationale.
- If GO is approved, Proceed to Selection Assistant is enabled.

## Step 3: Selection Assistant

1. Click Proceed to Selection Assistant.
2. Review tool-path model recommendation and comparison checks.
3. Enter manufacturer-path model from manufacturer software.
4. Enter required rationale.
5. Click Approve Selection or Reject.

Expected result:

- Selection decision is recorded with who/when/rationale.
- Comparison checks update with manufacturer-path values.

## Operating rules

1. Human rationale is mandatory for Qualification and Selection decisions.
2. Do not proceed when critical warnings remain unresolved.
3. Use citations to confirm that extracted requirements map to source documents.
4. If a recommendation appears incorrect, reject and capture clear rationale.

## Common statuses

Intake:

- Not started
- Uploading
- Processing
- Intake complete
- Needs attention

Qualification:

- Not started
- Running
- Ready for decision
- Approved (GO)
- Rejected (NO GO)
- Needs review

Selection:

- Not started
- Running
- Ready for decision
- Approved
- Rejected
- Needs review

## Troubleshooting

1. If intake fails, use Retry with mock package or re-upload documents.
2. If Run qualification is disabled, ensure intake status is Intake complete.
3. If decision submission fails, verify both model/rationale fields are populated.
4. If local sign-in appears blocked, confirm runtime app config uses local auth mode.

## Current limitations (mock phase)

1. Some values are simulated for workflow validation.
2. Manufacturer-path inputs are manually entered.
3. Proposal draft generation is a future step after Selection Assistant.

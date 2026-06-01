# Agentic AI Best Practices

## Core Principles

- Agents must solve a clearly defined business problem.
- Prefer deterministic workflows before introducing agent autonomy.
- Use agents for reasoning, planning, tool selection, and workflow assistance.
- Do not use agents where simple code, rules, SQL, or workflow orchestration is sufficient.
- Keep agent responsibilities narrow and cohesive.
- Avoid “god agents” that handle unrelated tasks.

---

## Agent Design

Each agent must have:

- A clear purpose.
- A bounded responsibility.
- Defined input and output contracts.
- Explicit tools it is allowed to use.
- Clear failure behavior.
- Logging and traceability.

Good:

```text
ProposalQualificationAgent
SpecificationExtractionAgent
EquipmentSelectionAgent
SubmittalReviewAgent
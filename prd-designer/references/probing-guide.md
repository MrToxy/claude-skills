# Probing Guide

Eight dimensions to explore during Phase 2 of the PRD design process. Probe in this priority order. Ask at most 3 questions per message. Stop when Problem + Users + Goals + at least one Acceptance Criterion are covered, or when the user says they're done.

Keep every question about the **what, who, and why** — never the how. If the user volunteers implementation detail (architecture, tech stack, data models, APIs), acknowledge it, park it for the planning phase, and steer back to the product question. The PRD draws the perimeter; planning fills it in.

Label each message with the dimension(s) being explored, e.g.: `[Probing: Problem → Users]`

---

## 1. Problem ("why")

Understand the pain before any solution. The strongest PRDs start with a crisp, single problem statement backed by evidence.

Example questions:
- What breaks or becomes harder without this feature?
- How does the affected person work around this today?
- How often does this pain occur, and for how many people?
- What evidence tells us this is real — a complaint, a ticket trend, usage data, a competitor move?
- Solution-bias check: is there more than one way to solve this? (If only one, the problem may be a disguised solution — reframe it.)

---

## 2. Users ("who")

Identify who has the problem. There is one primary user; resist "everyone".

Example questions:
- Who is the single primary person experiencing this problem?
- When do they hit it — what situation or job are they trying to get done?
- Are there secondary or affected users whose needs change the requirements?
- Is this a power-user need or something every user shares?

---

## 3. Goals

Define the outcome. Goals are measurable changes in behavior, not features.

Example questions:
- What can the user do after this that they can't today?
- Is there a quantitative target (reduce time, increase conversion, cut errors)?
- If you had to pick one outcome that matters most, which is it?
- Is each goal an outcome, or is it secretly a feature in disguise?

---

## 4. Non-Goals

Draw what's deliberately excluded. Each exclusion needs a reason.

Example questions:
- What might people assume is included that you want to explicitly rule out?
- For each exclusion: is it "not now" (a future release) or "never" (out of mission)?
- What adjacent feature should be excluded to keep this focused?

---

## 5. Acceptance Criteria

Define how "done" is proven. Criteria must be testable, binary, and outcome-oriented.

Example questions:
- For the main story, what observable result proves it works?
- What are the edge cases or boundaries, and what should happen at each?
- Is each criterion something a tester could mark pass/fail without judgement?
- Would Given/When/Then or a simple rules checklist fit this flow better?

---

## 6. Scope

Draw the boundary for this release at the level of "what", not "how".

Example questions:
- Is there a simpler version that delivers most of the value?
- What's in for this release vs. explicitly out?
- Is there existing functionality this replaces or extends?

---

## 7. Constraints & Dependencies

Surface real-world limits and reliances — without designing the solution.

Example questions:
- Are there legal, compliance, or accessibility requirements?
- Is there a hard deadline or a dependency on another team's work?
- Are there platform or policy limits that constrain what's acceptable?
- (Park any architecture/tech-stack detail for planning — note it as an Open Question.)

---

## 8. Risks & Prior Art

Surface what could make this fail to deliver its outcome, and learn from what exists.

Example questions:
- What's the most likely way this fails to get adopted or used after launch?
- Could this negatively affect existing users or flows?
- Has this been tried before here, or by a competitor — what worked and what didn't?
- Is there a past PRD, ticket, or doc to build on?

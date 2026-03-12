---
name: storytelling-tests
description: Enforce storytelling test patterns with Arrange-Act-Assert structure and domain-specific testing language. This skill should be used when writing, reviewing, or refactoring any test file (.test.ts, .spec.ts, .test.js, .spec.js, .test.py, _test.go, etc). Triggers on test creation, test review, test refactoring, and test improvement tasks.
metadata:
  version: "2.0.0"
---

# Storytelling Tests

Tests should read like stories. A developer unfamiliar with the codebase should understand what's being tested from the test code alone — without reading the implementation.

This is achieved through two core principles:

1. **Build-Operate-Check (Arrange-Act-Assert)** — every test has 3 visually separated sections
2. **Domain-Specific Testing Language (DSTL)** — helper functions that describe *what* is happening, not *how*

## Rules

### 1. Arrange-Act-Assert Structure

Every test MUST have three clearly separated blocks with comments and blank lines between them.

**Bad:**

```typescript
test('creates a link for matching contact', async () => {
  const org = createTestOrg({ vatNumber: 'PT123' });
  await seedOrganization(org);
  const contact = createTestContact({ emails: ['a@b.com'], organizationId: org.id });
  await seedContact(contact, org);
  await handleLinkEvent({ email: 'a@b.com', vatNumber: 'PT123' });
  const links = await getLinks();
  expect(links).toHaveLength(1);
  expect(links[0].contactId).toBe(contact.id);
});
```

**Good:**

```typescript
test('creates a link for matching contact', async () => {
  // Arrange
  const { contactId } = await createOrganizationWithContact();

  // Act
  await handleLinkEvent({ email: 'a@b.com', vatNumber: 'PT123' });

  // Assert
  await expectLinkToBeCreatedForContact(contactId);
});
```

### 2. Domain-Specific Testing Language

Extract setup and assertion logic into helper functions with descriptive names that convey business intent. The test body should read as a high-level specification.

**Bad:**

```typescript
const org = createTestOrg({ vatNumber: 'PT333333333' });
const contactOld = createTestContact({ emails: ['multi@example.com'], organizationId: org.id });
const contactRecent = createTestContact({ emails: ['multi@example.com'], organizationId: org.id });
const oldOpp = createTestOpportunity({ contactId: contactOld.id, createdAt: '2024-01-01' });
const recentOpp = createTestOpportunity({ contactId: contactRecent.id, createdAt: '2025-01-01' });
await seedOrganization(org);
await seedContact(contactOld, org);
await seedContact(contactRecent, org);
await seedOpportunity(oldOpp);
await seedOpportunity(recentOpp);
```

**Good:**

```typescript
const { orgId, contacts } = await createOrganizationAndContacts();
const opportunities = await createOpportunitiesWithDifferentDates(orgId, contacts);
```

### 3. Test Name = Business Specification

The test name describes the business rule or behavior being verified, not the technical mechanism.

**Bad:**

```
'returns 403 when role is not admin'
'calls saveDb with correct params'
```

**Good:**

```
'only admins can delete vehicles'
'if more than 1 contact matches, link is created with the contact that has the most recent opportunity activity'
```

### 4. Single Act Per Test

Each test exercises exactly one action. If you need to test multiple outcomes of the same action, use separate tests with shared setup.

**Bad:**

```typescript
test('handles vehicle creation', async () => {
  await createVehicle(data);
  const vehicle = await getVehicle(id);
  expect(vehicle).toBeDefined();
  await updateVehicle(id, newData);
  const updated = await getVehicle(id);
  expect(updated.status).toBe('active');
});
```

**Good:**

```typescript
test('vehicle is persisted after creation', async () => {
  // Arrange
  const data = buildVehicleData();

  // Act
  await createVehicle(data);

  // Assert
  await expectVehicleToExist(data.id);
});
```

### 5. Helper Names Convey Intent

Helper function names should describe *what* is being set up in domain terms, not *how* it's constructed. The reader should never need to look inside the helper to understand the test.

**Bad:** `setupData()`, `prepareTest()`, `init()`

**Good:** `createOrganizationWithContact()`, `createOpportunitiesWithDifferentDates()`, `seedVehicleReadyForSale()`

### 6. Assertions as Expectations

Wrap complex assertions in descriptive functions. Raw `expect().toMatchObject()` with inline objects forces the reader to mentally parse structure.

**Bad:**

```typescript
const links = await getLinks();
expect(links).toHaveLength(1);
expect(links[0]).toMatchObject({
  websiteUserId: 'website-user-5',
  organizationId: org.id,
  contactId: contactRecent.id,
});
```

**Good:**

```typescript
await expectLinkToBeCreatedWithMostRecentOpportunity(opportunities);
```

Simple, single-value assertions (e.g. `expect(result).toBe(true)`) don't need wrapping.

## Test Case Design

Rules 1–6 govern *how* to write tests. This section governs *what* to test. A `describe` block that only covers the happy path is a violation — flag it the same way you'd flag missing AAA structure.

### ZOMBIE Mnemonic

For every function or unit, systematically consider:

- **Z**ero — null, undefined, empty string, empty array, 0
- **O**ne — single element, minimal valid input
- **M**any — multiple elements, collections
- **B**oundary — edge of valid ranges (min, max, min−1, max+1)
- **I**nterface — does the API contract hold? Types, shapes, required fields
- **E**xceptional — errors, failures, timeouts, invalid state

Use this as a mental checklist before declaring a `describe` block complete.

### Boundary Value Analysis

**When to use:** whenever a function accepts a numeric range, string length, or date range.

Test at the edges of valid ranges: just below the minimum, the minimum itself, just above the minimum, just below the maximum, the maximum, and just above the maximum.

**Bad:**

```typescript
describe('calculateDiscount', () => {
  test('applies 10% discount for order of 50', () => {
    expect(calculateDiscount(50)).toBe(5);
  });
});
```

**Good:**

```typescript
describe('calculateDiscount', () => {
  test('no discount below minimum order of 10', () => {
    expect(calculateDiscount(9)).toBe(0);
  });

  test('discount applies at minimum order of 10', () => {
    expect(calculateDiscount(10)).toBe(1);
  });

  test('discount applies within valid range', () => {
    expect(calculateDiscount(50)).toBe(5);
  });

  test('discount applies at maximum order of 100', () => {
    expect(calculateDiscount(100)).toBe(10);
  });

  test('no discount above maximum order of 100', () => {
    expect(calculateDiscount(101)).toBe(0);
  });
});
```

### Equivalence Partitioning

**When to use:** whenever inputs can be grouped into classes that should behave identically — test one representative per class rather than every possible value.

**Bad:**

```typescript
describe('getStatusLabel', () => {
  test('returns label for active', () => {
    expect(getStatusLabel('active')).toBe('Active');
  });

  test('returns label for inactive', () => {
    expect(getStatusLabel('inactive')).toBe('Inactive');
  });
});
```

**Good:**

```typescript
describe('getStatusLabel', () => {
  // Valid class — known statuses
  test('returns human label for active status', () => {
    expect(getStatusLabel('active')).toBe('Active');
  });

  test('returns human label for inactive status', () => {
    expect(getStatusLabel('inactive')).toBe('Inactive');
  });

  // Edge class — unknown/unsupported value
  test('returns fallback for unrecognised status', () => {
    expect(getStatusLabel('archived')).toBe('Unknown');
  });
});
```

### Decision Table Testing

**When to use:** whenever business logic has two or more interacting conditions — enumerate all combinations, one test per row.

**Bad:**

```typescript
describe('canPublish', () => {
  test('allows admin to publish', () => {
    expect(canPublish({ role: 'admin', verified: true })).toBe(true);
  });
});
```

**Good:**

```typescript
describe('canPublish', () => {
  // role=admin, verified=true  → allowed
  test('admin with verified account can publish', () => {
    expect(canPublish({ role: 'admin', verified: true })).toBe(true);
  });

  // role=admin, verified=false → denied
  test('admin without verified account cannot publish', () => {
    expect(canPublish({ role: 'admin', verified: false })).toBe(false);
  });

  // role=editor, verified=true  → denied
  test('editor with verified account cannot publish', () => {
    expect(canPublish({ role: 'editor', verified: true })).toBe(false);
  });

  // role=editor, verified=false → denied
  test('editor without verified account cannot publish', () => {
    expect(canPublish({ role: 'editor', verified: false })).toBe(false);
  });
});
```

### State Transition Testing

**When to use:** whenever the unit under test models a workflow or lifecycle with distinct states.

Cover all valid transitions **and** at least one invalid transition per state.

**Bad:**

```typescript
describe('order lifecycle', () => {
  test('approved order has correct status', async () => {
    const order = await createApprovedOrder();
    expect(order.status).toBe('approved');
  });
});
```

**Good:**

```typescript
describe('order lifecycle', () => {
  test('draft order can be submitted', async () => {
    // Arrange
    const { orderId } = await createDraftOrder();

    // Act
    await submitOrder(orderId);

    // Assert
    await expectOrderStatus(orderId, 'submitted');
  });

  test('submitted order can be approved', async () => {
    // Arrange
    const { orderId } = await createSubmittedOrder();

    // Act
    await approveOrder(orderId);

    // Assert
    await expectOrderStatus(orderId, 'approved');
  });

  test('draft order cannot be directly approved', async () => {
    // Arrange
    const { orderId } = await createDraftOrder();

    // Act & Assert
    await expectOrderTransitionToThrow(orderId, 'approved');
  });
});
```

## Anti-Patterns

- **Wall of object construction** — 10+ lines of inline `createTest*()` calls in the test body
- **No section separators** — Arrange/Act/Assert blended together without comments or blank lines
- **Generic variable names** — `data`, `result`, `res`, `item` when domain terms exist
- **Assertions that require reading setup** — if you need to scroll up to understand what's being asserted, extract it
- **Setup leaking into Act** — creation + seeding mixed with the action under test
- **Multiple acts** — testing two behaviors in one test case
- **Happy path only** — `describe` block with only success-case tests; no error, boundary, or invalid-input tests
- **Missing boundaries** — testing mid-range values but never the edges (min, max, min−1, max+1)
- **Untested state transitions** — asserting the final state but not the path taken to get there, and no invalid-transition test
- **No error path tests** — no tests for what happens when a dependency fails, throws, or returns an unexpected value

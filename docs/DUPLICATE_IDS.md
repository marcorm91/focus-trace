# Duplicate HTML IDs

FocusTrace reports duplicate non-empty HTML `id` values as the authoring warning **`FT-WARN-004`**.

## Why this is a warning

The HTML Living Standard requires an element's non-empty `id` value to be unique within the element's tree. Duplicate identifiers can make mechanisms that resolve an ID ambiguous or unpredictable, including native `<label for>`, ARIA ID references, fragment links and scripted DOM lookups.

FocusTrace does **not** report the duplicate by itself as a WCAG 2.2 failure. WCAG 2.2 removed Success Criterion 4.1.1 Parsing, so a generic duplicate-ID authoring error is not presented as if it were still a direct 4.1.1 conformance failure.

A separate deterministic accessibility rule may still fail when FocusTrace can prove an actual consequence under an applicable WCAG criterion. For example, a broken accessible name or relationship should be reported under the rule that evaluates that relationship, not by relabelling every duplicate ID as a WCAG failure.

## Scope behavior

Full-page analysis evaluates all non-empty IDs in the document.

For component-scoped analysis, FocusTrace still evaluates uniqueness against the whole document but only emits `FT-WARN-004` occurrences for duplicated elements inside the selected component. This prevents a component scan from incorrectly treating an ID as unique merely because its duplicate is outside the selected subtree.

## Evidence

Each warning records:

- the duplicated `id` value;
- the number of elements in the document using that value;
- the affected element location;
- the HTML Living Standard `id` attribute reference.

## Remediation

Give every element a unique non-empty `id` and update ID-based references that point to any renamed identifier. Common references to re-check include:

- `for`;
- `aria-labelledby`;
- `aria-describedby`;
- `aria-controls`;
- `aria-owns`;
- `aria-activedescendant`;
- `headers`;
- fragment links such as `href="#target"`.

After the change, run FocusTrace again and verify both that the warning disappears and that each ID-based relationship still resolves to its intended target.

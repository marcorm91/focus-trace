# Focus Graph audit workflow

FocusTrace turns the recorded Focus Graph into an evidence workflow for accessibility auditors, UX/UI designers, QA specialists and developers.

## Inspect a focus point

Every observed focus point can be selected from the Graph view. FocusTrace then shows:

- the accessible label and role/type captured during the session;
- visit count and observed incoming/outgoing paths;
- deterministic runtime signals attached to that point;
- the recorded interaction chains that reached the point.

`How focus got here` is reconstructed from the original runtime event ids. FocusTrace does not infer or manufacture missing steps.

The explanation level still controls presentation:

- **Simple** shows human-readable actions and impact;
- **Accessibility** adds rule ids and standards evidence;
- **Developer** adds timestamps, selectors and route details.

Changing level never changes the underlying result.

## Filter signals

The Graph can show either all observed focus points or only points that have deterministic runtime signals attached to them.

The filtered view is only a presentation filter. It does not delete evidence and it does not imply that hidden points are inaccessible.

## Export evidence

Session exports are centralized in the **Report** view rather than being spread across Graph and Report.

The primary Report action exports the printable/PDF report. **More formats** contains:

- text (`.txt`) for the session report;
- Markdown (`.md`) for recorded Trace evidence used in audit notes, tickets and reports;
- JSON (`.json`) for the same recorded Trace evidence in a structured format.

Markdown and JSON preserve the Focus Graph evidence model: labels, roles, selectors, interactions, runtime signals and standards references. They do not contain screenshots or full DOM snapshots. Moving these actions to Report changes only where the export is initiated, not the evidence they contain.

Exports are generated locally and require no upload or FocusTrace server.

The Trace evidence schema starts at `schemaVersion: 1` so future integrations can evolve without silently changing the meaning of existing evidence.

## Evidence boundary

Focus Graph remains an observed journey, not an exhaustive accessibility model.

FocusTrace does not claim that:

- an unvisited control is unreachable;
- a repeated path is automatically an accessibility failure;
- a runtime REVIEW is a deterministic WCAG failure;
- the exported evidence proves full WCAG conformance.

The workflow is designed to make observed accessibility behavior reproducible and explainable while preserving the distinction between evidence and conformance judgement.

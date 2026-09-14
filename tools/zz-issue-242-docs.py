from pathlib import Path

readme = Path('README.md')
text = readme.read_text()
anchor = "| **Replay** | Recorded Trace session | Reconstructs evidence read-only without replaying actions against the page. | Runtime sequence. |"
addition = anchor + "\n| **Saved Replay regression** | Recorded Trace session | Saves a bounded local user-flow baseline. Only uniquely resolved non-text navigation keys are eligible for automatic replay; clicks, text/value changes, Tab and activation keys stop for explicit manual continuation. | `new`, `resolved`, `persistent`, `changed`, `missing-element` and `broken-flow` results with redacted routes and minimal target metadata. |"
if anchor not in text:
    raise SystemExit('README Replay anchor missing')
text = text.replace(anchor, addition, 1)
anchor = "| **PDF / TXT / Markdown / JSON** | Current report or Memory baseline | Exports the applicable evidence and auditor notes without silently rerunning a full DOM collection. | Shareable artifacts. |"
note = anchor + "\n\nSaved Replay regressions remain in extension-local storage with no time-based expiry. Storage is bounded to **20 flows**, **160 steps per flow** and **80 baseline findings per flow**; users can delete one flow or clear all saved flows. The saved schema excludes passwords, field values, auditor notes, event detail, accessible names and page text. Route query strings and fragments are replaced by redaction markers. A replay that stops on an ambiguous/changed target, missing element, route mismatch or manual cancellation does not infer later findings as resolved."
if anchor not in text:
    raise SystemExit('README export anchor missing')
readme.write_text(text.replace(anchor, note, 1))

readme_es = Path('README.es.md')
text = readme_es.read_text()
anchor = "| **Replay** | Sesión Trace grabada | Reproduce la evidencia como lectura sin reejecutar acciones sobre la página. | Secuencia runtime reconstruida. |"
addition = anchor + "\n| **Regresión de Replay guardada** | Sesión Trace grabada | Guarda una línea base local y acotada del flujo. Solo las teclas de navegación no textual sobre destinos resueltos de forma única pueden reproducirse automáticamente; clics, cambios de texto/valor, Tab y teclas de activación se detienen para continuación manual explícita. | Resultados `new`, `resolved`, `persistent`, `changed`, `missing-element` y `broken-flow`, con rutas redactadas y metadatos mínimos del destino. |"
if anchor not in text:
    raise SystemExit('README.es Replay anchor missing')
text = text.replace(anchor, addition, 1)
anchor = "| **PDF / TXT / Markdown / JSON** | Informe actual o línea base de Memory | Exporta la evidencia y las notas del auditor aplicables reutilizando los datos disponibles sin volver a recorrer silenciosamente todo el DOM. | Artefactos compartibles. |"
note = anchor + "\n\nLas regresiones de Replay guardadas permanecen en el almacenamiento local de la extensión sin caducidad temporal. El almacenamiento se limita a **20 flujos**, **160 pasos por flujo** y **80 hallazgos de referencia por flujo**; el usuario puede borrar un flujo o todos. El esquema guardado excluye contraseñas, valores de campos, notas del auditor, detalle de eventos, nombres accesibles y texto de la página. Las query strings y fragmentos de las rutas se sustituyen por marcadores de redacción. Si el replay se detiene por un destino ambiguo/cambiado, un elemento ausente, una ruta distinta o una cancelación manual, los hallazgos posteriores no se infieren como resueltos."
if anchor not in text:
    raise SystemExit('README.es export anchor missing')
readme_es.write_text(text.replace(anchor, note, 1))

rules = Path('docs/RULES.md')
text = rules.read_text()
anchor = "## Accessible name computation"
section = """## Saved user-flow regression methodology

Saved Replay regression is runtime evidence comparison, not an automated WCAG conformance result. A saved flow is derived from an observed Trace and persists only bounded action/checkpoint metadata plus the runtime finding baseline needed for later comparison.

The persistent schema is local-first and deliberately redacted. FocusTrace stores at most **20 flows**, **160 steps per flow** and **80 baseline findings per flow**, with no time-based expiry. Users can delete one flow or clear the complete saved-flow library. Passwords, field values, auditor notes, event detail, accessible names, class names and page text are not copied into saved-flow storage. Routes preserve only the origin/path plus redaction markers for query-string or fragment data.

Automatic replay is intentionally narrow. Only non-text navigation keys (`Arrow*`, `Home`, `End`, `PageUp`, `PageDown`, `Escape`) may be dispatched automatically, and only after stable node resolution identifies one unambiguous current target. Clicks, input changes, `Tab`, `Enter`, `Space` and other activation-like actions create an explicit manual stop. FocusTrace never restores or synthesizes stored field values because those values are not retained.

Actions and checkpoints reuse the stable boundary-aware resolution model across the DOM, open Shadow DOM and same-origin frame boundaries. A missing target yields `missing-element`; an ambiguous or materially changed target yields `broken-flow`. Focus, route and dialog transitions are checkpoints. A mismatch stops the run and later steps are not assumed or executed.

Runtime finding comparison uses six states:

- `new`: a current runtime finding was not present in the saved baseline.
- `persistent`: the same rule/target retains the same runtime outcome and event kind.
- `changed`: the same rule/target is observed with changed outcome/evidence identity.
- `resolved`: a baseline finding is absent **after a complete replay only**.
- `missing-element`: a required saved target cannot be resolved.
- `broken-flow`: the journey cannot be continued safely, including ambiguous/changed targets or checkpoint mismatch.

An incomplete replay never infers `resolved` from absence. When the flow breaks, FocusTrace may retain evidence actually observed before the stop, but it does not treat unvisited later checkpoints as successful. This preserves the evidence-first rule that absence is meaningful only when the required journey completed.

""" + anchor
if anchor not in text:
    raise SystemExit('RULES methodology anchor missing')
rules.write_text(text.replace(anchor, section, 1))

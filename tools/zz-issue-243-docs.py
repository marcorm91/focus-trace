from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'anchor not found in {path}: {old[:80]}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


en_row = '| **Inspect finding** | Current finding | Locates and highlights the target when it still exists on the page. | Selector, target element and visual highlight. |'
en_rows = en_row + '''
| **Finding lifecycle** | Repeated compatible scans | Deduplicates identical rule/target/evidence findings and compares the current result with the previous compatible observation. | Explicit `new`, `persistent`, `changed` and `resolved` states; resolved evidence stays in history instead of being reinserted into the current scan. |
| **Audit profiles** | Page, component or Site Audit reporting | Applies a reusable local WCAG target, severity and rule-family filter before findings are persisted for that scope. Custom profiles can be duplicated, edited, applied, deleted or reset locally. | Applied profile snapshot plus filtered, deduplicated findings; the inspected page and rule engine are not modified. |'''
replace_once('README.md', en_row, en_rows)

en_anchor = 'Saved Replay regressions remain in extension-local storage with no time-based expiry.'
en_note = '''Repeated static findings are deduplicated only when **rule, target and evidence are all the same**. Evidence changes on the same rule/target remain visible and become `changed`; an absent prior identity becomes `resolved` only in the comparison history, and a later reappearance becomes `new` again. Lifecycle comparison is limited to compatible document/scope/profile contexts. Recheck keeps its additional `missing`/`inconclusive` safety states, while Replay and Site Audit use the same `new`/`persistent`/`changed`/`resolved` vocabulary where a complete comparison is available.

Audit profiles are stored only in the browser profile and are bounded to the built-in WCAG 2.2 AA profile plus **20 custom profiles**. A profile selects page/component/Site Audit scope, WCAG A/AA/AAA target, severities and FocusTrace rule families. Profiles filter stored/reporting findings; they do not disable the underlying local rule engine, alter PASS meaning, transmit page data or change the inspected page.

''' + en_anchor
replace_once('README.md', en_anchor, en_note)

es_row = '| **Inspeccionar hallazgo** | Resultado actual | Localiza y resalta el elemento objetivo cuando sigue presente en la página. | Selector, elemento y resaltado visual. |'
es_rows = es_row + '''
| **Ciclo de vida de hallazgos** | Análisis compatibles repetidos | Deduplica hallazgos idénticos por regla/destino/evidencia y compara el resultado actual con la observación compatible anterior. | Estados explícitos `new`, `persistent`, `changed` y `resolved`; la evidencia resuelta permanece en el historial y no se reinserta en el análisis actual. |
| **Perfiles de auditoría** | Informes de página, componente o Site Audit | Aplica un filtro local reutilizable por objetivo WCAG, severidad y familia de reglas antes de persistir los hallazgos de ese alcance. Los perfiles personalizados se pueden duplicar, editar, aplicar, borrar o restablecer localmente. | Snapshot del perfil aplicado y hallazgos filtrados/deduplicados; no modifica la página inspeccionada ni el motor de reglas. |'''
replace_once('README.es.md', es_row, es_rows)

es_anchor = 'Las regresiones de Replay guardadas permanecen en el almacenamiento local de la extensión sin caducidad temporal.'
es_note = '''Los hallazgos estáticos repetidos solo se deduplican cuando **regla, destino y evidencia coinciden**. Si cambia la evidencia para la misma regla/destino, el hallazgo sigue visible y pasa a `changed`; una identidad previa ausente queda como `resolved` únicamente en el historial comparativo y, si reaparece más adelante, vuelve a ser `new`. La comparación del ciclo de vida se limita a contextos compatibles de documento/alcance/perfil. Recheck mantiene además sus estados de seguridad `missing`/`inconclusive`, mientras Replay y Site Audit comparten `new`/`persistent`/`changed`/`resolved` cuando existe una comparación completa.

Los perfiles de auditoría permanecen solo en el perfil del navegador y están limitados al perfil WCAG 2.2 AA integrado más **20 perfiles personalizados**. Un perfil selecciona alcance de página/componente/Site Audit, objetivo WCAG A/AA/AAA, severidades y familias de reglas de FocusTrace. Los perfiles filtran los hallazgos guardados/mostrados; no desactivan el motor local de reglas, no cambian el significado de PASS, no transmiten datos de la página ni modifican la página inspeccionada.

''' + es_anchor
replace_once('README.es.md', es_anchor, es_note)

rules_anchor = '## Saved user-flow regression methodology'
rules_section = '''## Finding deduplication, lifecycle and audit profiles

FocusTrace treats a static finding identity as the combination of its FocusTrace rule ID and normalized primary target. Deduplication is stricter: two findings collapse only when **rule, target and evidence are equivalent**. Evidence includes the outcome/severity and the bounded structured evidence already produced by the rule. Distinct evidence on the same target is never discarded as duplicate noise.

For two compatible static observations, FocusTrace assigns four lifecycle states:

- `new`: the current rule/target identity had no matching finding in the previous compatible observation.
- `persistent`: the same rule/target retains equivalent outcome, severity and evidence.
- `changed`: the same rule/target remains but its bounded evidence identity changed.
- `resolved`: a previous rule/target is absent from the current compatible observation. The old finding remains historical evidence and is not injected into the current result list.

Lifecycle is derived from adjacent observations, so it is reversible: a resolved finding that appears again in the next compatible scan is `new` again. Static Session/Memory comparison uses the same persisted normalized scan. Site Audit recomputes lifecycle against the previous stored scan of the same normalized page before replacement. Recheck does not rewrite the original finding and retains its conservative `missing` and `inconclusive` states. Saved Replay already uses the shared four-state vocabulary for completed runtime comparisons, with `missing-element` and `broken-flow` reserved for journeys that cannot be completed safely. Absence is never promoted to `resolved` when the required comparison is incomplete.

Audit profiles are local reporting/persistence filters, not alternate conformance engines. The built-in profile targets WCAG 2.2 AA and all scopes, severities and FocusTrace rule families. Users can keep up to 20 custom profiles and select page, component and/or Site Audit scope, WCAG A/AA/AAA target, severity set and rule-family set. Rule families are derived independently from FocusTrace rule metadata/naming rather than any axe/Deque runtime dependency. Rules without an explicit WCAG level remain eligible instead of being silently hidden by a level filter.

A profile snapshot is persisted with a normalized scan so later comparisons know which configuration produced that evidence. Lifecycle comparison is performed only for compatible document, scope and profile contexts. Changing a profile therefore starts a new comparison baseline instead of claiming that filtered-out findings were resolved. Profile storage stays in `browser.storage.local`; applying, editing, deleting and resetting profiles does not modify the inspected page or transmit page data.

''' + rules_anchor
replace_once('docs/RULES.md', rules_anchor, rules_section)

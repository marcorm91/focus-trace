from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'marker missing in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, count))


replace(
    'README.md',
    '| `FT-WARN-008` | Element outside the required native parent/ancestor context. | WARNING | HTML Living Standard |\n| `FT-WARN-009` | Native content-model/group/order violation. | WARNING | HTML Living Standard |',
    '| `FT-WARN-008` | Element outside the required native parent/ancestor context, including native list and description-list items. | WARNING | HTML Living Standard |\n| `FT-WARN-009` | Native content-model/group/order violation, including invalid list direct content and description-list grouping. | WARNING | HTML Living Standard |',
)
replace(
    'README.es.md',
    '| `FT-WARN-008` | Elemento fuera del padre o ancestro nativo requerido. | WARNING | HTML Living Standard |\n| `FT-WARN-009` | Violación del modelo de contenido, grupo u orden permitido por HTML. | WARNING | HTML Living Standard |',
    '| `FT-WARN-008` | Elemento fuera del padre o ancestro nativo requerido, incluidos los elementos de listas y listas de descripción. | WARNING | HTML Living Standard |\n| `FT-WARN-009` | Violación del modelo de contenido, grupo u orden permitido por HTML, incluido contenido directo inválido en listas y agrupación incorrecta en listas de descripción. | WARNING | HTML Living Standard |',
)

rules = Path('docs/RULES.md')
text = rules.read_text()
section = '''\n## Native and ARIA list structure\n\nIssue #230 strengthens the existing structural contracts rather than adding parallel list-specific rule IDs. Native HTML violations continue to use `FT-WARN-008` for invalid parent/ancestor context and `FT-WARN-009` for invalid child/group/order content models. Explicit ARIA list relationships continue to use the synchronized `FT-WARN-017` required-parent and `FT-WARN-018` allowed-child checks.\n\nFor native `ul`, `ol` and `menu`, FocusTrace accepts list-item children plus script-supporting elements and formatting whitespace. Non-whitespace direct text is reported once on the list container, while unexpected direct element children keep their existing element-targeted content-model warning. Native `li` continues to require a direct `ul`, `ol` or `menu` parent.\n\nFor `dl`, FocusTrace accepts either direct groups of one or more `dt` followed by one or more `dd`, or `div`-wrapped groups with that same sequence. The two grouping forms cannot be mixed at one level, and non-whitespace direct text is not treated as valid structural content. When direct text and an invalid sequence affect the same `dl` or grouping `div`, FocusTrace emits one content-model signal for that target instead of duplicate findings.\n\nExplicit `role="list"` / `role="listitem"` relationships reuse the synchronized WAI-ARIA registry and the existing accessibility-ownership model. Valid `aria-owns` can therefore establish listitem parentage. Conversely, repurposing a native list as another ARIA container does not erase the implicit semantics of descendant native `li` elements: for example, `ul[role="menu"] > li` exposes an incompatible `listitem` child unless the author supplies semantics appropriate to the menu pattern.\n\nThese checks are authoring **WARNINGs**, not automatic WCAG failures. Hidden malformed HTML or explicit ARIA remains observable to the authoring validators because conformance errors still exist in source structure; FocusTrace does not infer a user-facing WCAG failure solely from that condition. Native orphan items are handled by the HTML parent-context rule and are not duplicated as ARIA required-parent findings unless the author explicitly supplies the ARIA role.\n'''
if '## Native and ARIA list structure' not in text:
    rules.write_text(text.rstrip() + '\n' + section)

severity = Path('docs/SEVERITY-AUDIT.md')
text = severity.read_text()
section = '''\n## List-structure package (#230)\n\n`FT-WARN-008` and `FT-WARN-009` remain **moderate authoring warnings** for native list and description-list context/content-model contradictions. The scanner can prove the HTML structure is non-conforming, but that evidence alone does not prove a WCAG failure for the rendered experience.\n\nARIA list ownership continues to use `FT-WARN-017` and `FT-WARN-018`, whose existing critical authoring impact reflects invalid required-parent/allowed-child accessibility relationships. #230 does not change those severities or promote the warnings to deterministic WCAG failures; it adds focused list fixtures, `aria-owns` coverage and deduplication evidence.\n'''
if '## List-structure package (#230)' not in text:
    severity.write_text(text.rstrip() + '\n' + section)

# Strengthen the existing axe relationships without changing the 79/105 planning total.
replace(
    'config/axe-parity/core-02.json',
    '{"axeRuleId":"definition-list","relationship":"superset","focusTraceRuleIds":["FT-WARN-009"],"rationale":"FocusTrace\'s native content-model validator covers description-list child ordering/grouping together with other HTML structural constraints.","standards":["HTML Living Standard description lists","WCAG 2.2 1.3.1"],"evidenceKey":"e07"}',
    '{"axeRuleId":"definition-list","relationship":"superset","focusTraceRuleIds":["FT-WARN-009"],"rationale":"FocusTrace validates description-list sequence/grouping, rejects mixed direct and div-wrapped branches, and detects non-whitespace direct text while deduplicating same-target structural contradictions.","standards":["HTML Living Standard description lists","WCAG 2.2 1.3.1"],"evidenceKey":"e26"}',
)
replace(
    'config/axe-parity/core-02.json',
    '{"axeRuleId":"dlitem","relationship":"superset","focusTraceRuleIds":["FT-WARN-008"],"rationale":"FocusTrace validates required native parent/ancestor contexts, including description-list items, as part of a broader HTML parent-context rule.","standards":["HTML Living Standard dt/dd permitted parents","WCAG 2.2 1.3.1"],"evidenceKey":"e07"}',
    '{"axeRuleId":"dlitem","relationship":"superset","focusTraceRuleIds":["FT-WARN-008"],"rationale":"FocusTrace validates native dt/dd direct or grouping-div parentage as part of its broader HTML parent-context rule, with dedicated valid/invalid description-list fixtures.","standards":["HTML Living Standard dt/dd permitted parents","WCAG 2.2 1.3.1"],"evidenceKey":"e26"}',
)
replace(
    'config/axe-parity/core-03.json',
    '{"axeRuleId":"list","relationship":"superset","focusTraceRuleIds":["FT-WARN-009"],"rationale":"FocusTrace validates native list child/content-model constraints as part of its broader structural HTML rule.","standards":["HTML Living Standard list content models","WCAG 2.2 1.3.1"],"evidenceKey":"e07"}',
    '{"axeRuleId":"list","relationship":"superset","focusTraceRuleIds":["FT-WARN-009"],"rationale":"FocusTrace validates native list element children plus significant direct text, nested-list validity and script-supporting/whitespace allowances as part of its broader structural HTML rule.","standards":["HTML Living Standard list content models","WCAG 2.2 1.3.1"],"evidenceKey":"e26"}',
)
replace(
    'config/axe-parity/core-03.json',
    '{"axeRuleId":"listitem","relationship":"superset","focusTraceRuleIds":["FT-WARN-008"],"rationale":"FocusTrace validates required native parent context, including list items, as part of a broader parent-context rule.","standards":["HTML Living Standard li permitted parents","WCAG 2.2 1.3.1"],"evidenceKey":"e07"}',
    '{"axeRuleId":"listitem","relationship":"superset","focusTraceRuleIds":["FT-WARN-008"],"rationale":"FocusTrace validates native li parent context and separately verifies explicit ARIA list/listitem ownership without duplicating a native orphan as an ARIA required-parent finding.","standards":["HTML Living Standard li permitted parents","WAI-ARIA list/listitem roles","WCAG 2.2 1.3.1"],"evidenceKey":"e26"}',
)

path = Path('config/axe-equivalents.json')
text = path.read_text()
old = '    "e25": {"sources": ["shared/document-structure-rules.ts", "lib/audit/landmarks.ts", "lib/audit/document-structure.ts", "lib/audit/content-model.ts", "lib/audit/scan.ts"], "tests": ["tests/document-structure-landmarks.test.ts"]}\n'
new = old.rstrip('\n') + ',\n    "e26": {"sources": ["lib/audit/content-model.ts", "lib/audit/aria-validator.ts", "generated/aria-registry.json"], "tests": ["tests/list-structure.test.ts", "tests/content-model.test.ts", "tests/aria-validator.test.ts"]}\n'
if '"e26"' not in text:
    if old not in text:
        raise SystemExit('e25 marker missing in config/axe-equivalents.json')
    path.write_text(text.replace(old, new, 1))

path = Path('docs/AXE_CORE_PARITY_AUDIT.md')
text = path.read_text()
repls = [
    ('The 0.2.9 public capability catalog contains 105 identifiers:', 'The current public capability catalog contains 118 source-defined identifiers:'),
    ('| Deterministic WCAG rules | 13 |', '| Deterministic WCAG rules | 16 |'),
    ('| Contextual page/site reviews | 28 |', '| Contextual page/site reviews | 35 |'),
    ('| HTML/ARIA authoring warnings | 21 |', '| HTML/ARIA authoring warnings | 24 |'),
    ('| **Total** | **105** |', '| **Total** | **118** |'),
    ('| Partial | 33 |', '| Partial | 35 |'),
    ('| Overlap | 22 |', '| Overlap | 28 |'),
    ('| Missing | 33 |', '| Missing | 25 |'),
    ('`covered` is reported as 71 rules: equivalent + partial + superset + overlap.', '`covered` is reported as 79 rules: equivalent + partial + superset + overlap.'),
    ('Thirty-three axe-core rules currently have no implemented FocusTrace expectation matching their tested condition.', 'Twenty-five axe-core rules currently have no implemented FocusTrace expectation matching their tested condition.'),
    ('## Priority after ARIA role/state relationships\n\n#228 establishes the synchronized ARIA relationship foundation and raises the benchmark planning metric to 79/105. The next roadmap block is **document structure and landmarks** (#229). That work remains separate because page-level landmark placement, uniqueness and structure have different applicability from ARIA role/property authoring.',
     '## Priority after list-structure validation\n\n#229 established the document-structure and landmark layer, and #230 strengthens native/ARIA list evidence without changing the already-covered axe list relationships. The benchmark planning metric therefore remains **79/105**. The next roadmap block is **table names, headers and relationships** (#231).'),
]
for old, new in repls:
    if old not in text:
        raise SystemExit(f'parity doc marker missing: {old[:100]!r}')
    text = text.replace(old, new, 1)
section = '''\n## List-structure applicability update\n\nIssue #230 strengthens the four already-covered list benchmark relationships (`list`, `listitem`, `definition-list`, `dlitem`) rather than converting a missing axe-core rule. The reviewed planning metric therefore remains **79/105 covered**, with 25 missing and one benchmark-specific rule not applicable.\n\nNative list evidence now includes significant direct-text violations, description-list branch/group validation and same-target deduplication. ARIA fixtures verify direct and `aria-owns` listitem parentage, orphan explicit listitems, incompatible accessibility children and the HTML/ARIA crossing where a native list is repurposed to another composite role while descendant `li` semantics remain exposed. These remain authoring WARNINGs rather than automatic WCAG failures.\n'''
if '## List-structure applicability update' not in text:
    text = text.rstrip() + '\n' + section
path.write_text(text)

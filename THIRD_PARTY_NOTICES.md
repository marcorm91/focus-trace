# Third-party notices

FocusTrace source code is distributed under `GPL-3.0-only` as described in [`LICENSE`](LICENSE). Some development-only benchmark and standards metadata comes from third-party public sources and remains subject to the applicable upstream terms described below.

## AXE-CORE® benchmark metadata

FocusTrace uses the public `dequelabs/axe-core` repository as an external implementation benchmark. It does **not** include AXE-CORE® as a runtime engine, does not call a Deque API or service, and does not require an AXE DevTools account or license.

The development snapshot in [`generated/axe-rule-severities.json`](generated/axe-rule-severities.json) is mechanically derived from public AXE-CORE® rule JSON files. FocusTrace retains only benchmark metadata needed for comparison and severity alignment: rule identifier, impact, enabled state and tags. The snapshot is development-only and is excluded from browser builds.

Current pinned benchmark source:

- upstream repository: `dequelabs/axe-core`
- release/tag: `4.13.0` / `v4.13.0`
- upstream license: Mozilla Public License 2.0 (`MPL-2.0`)
- upstream license text: <https://github.com/dequelabs/axe-core/blob/v4.13.0/LICENSE>
- MPL 2.0: <https://www.mozilla.org/MPL/2.0/>

A snapshot-specific notice is kept next to the generated data in [`generated/axe-rule-severities.NOTICE.md`](generated/axe-rule-severities.NOTICE.md). `npm run axe:sync` regenerates that notice together with the benchmark snapshot, and `npm run axe:validate` checks that the notice remains present and aligned with the pinned tag.

The FocusTrace parity classifications, detector implementations, tests, rationales and remediation guidance are independently authored. WCAG, ACT Rules, WAI-ARIA, Accessible Name and Description Computation, HTML and APG remain the normative sources for FocusTrace behavior; the AXE-CORE® snapshot is a development benchmark only.

### Trademark notice

AXE® is a trademark of Deque Systems, Inc. in the US and other countries. AXE-CORE® is a trademark of Deque Systems, Inc. in the US and other countries.

FocusTrace is an independent project and is not affiliated with, sponsored by, endorsed by or certified by Deque Systems, Inc. References to AXE® or AXE-CORE® are descriptive references to Deque software and its public repository only.

Deque's current trademark policy is available at <https://www.deque.com/legal/trademarks/>.

## No change to the FocusTrace license

These notices do not change the `GPL-3.0-only` license applied to FocusTrace-authored source code. They identify third-party material and rights separately so recipients can distinguish FocusTrace code from externally sourced benchmark metadata.

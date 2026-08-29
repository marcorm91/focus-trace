import { tr, type AppLanguage } from '../../../shared/i18n';
import { closeFocusedInstructionsView } from '../settings-focus';

function InstructionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="instructions-card">
      <summary>{title}</summary>
      <div className="instructions-card-body">
        {children}
      </div>
    </details>
  );
}

export function InstructionsView({ language }: { language: AppLanguage }) {
  return (
    <section className="panel instructions-panel" aria-labelledby="instructions-title">
      <button
        type="button"
        className="settings-back-trigger"
        onClick={closeFocusedInstructionsView}
      >
        <span aria-hidden="true">←</span>
        {tr(language, 'Back', 'Volver')}
      </button>

      <div className="section-heading instructions-heading">
        <div>
          <h2 id="instructions-title">{tr(language, 'How to use FocusTrace', 'Cómo usar FocusTrace')}</h2>
          <p>
            {tr(
              language,
              'A practical guide to the analysis, runtime debugging and reporting tools included in the extension.',
              'Una guía práctica de las herramientas de análisis, depuración runtime e informes incluidas en la extensión.',
            )}
          </p>
        </div>
      </div>

      <section className="instructions-start" aria-labelledby="instructions-start-title">
        <h3 id="instructions-start-title">{tr(language, 'Start here', 'Empieza aquí')}</h3>
        <ol>
          <li>
            <strong>{tr(language, 'Open the page you want to inspect.', 'Abre la página que quieras revisar.')}</strong>
            <span>{tr(language, 'FocusTrace works against the active tab and asks for page access only when a feature needs it.', 'FocusTrace trabaja sobre la pestaña activa y solicita acceso a la página solo cuando una función lo necesita.')}</span>
          </li>
          <li>
            <strong>{tr(language, 'Run a page or component analysis.', 'Ejecuta un análisis de página o componente.')}</strong>
            <span>{tr(language, 'Use Analyze this page for the whole document, or Select component to limit the scan to a DOM region.', 'Usa Analizar esta página para todo el documento o Seleccionar componente para limitar el análisis a una región del DOM.')}</span>
          </li>
          <li>
            <strong>{tr(language, 'Use Trace for behavior that only appears during interaction.', 'Usa Trace para comportamientos que solo aparecen al interactuar.')}</strong>
            <span>{tr(language, 'Record a real keyboard or pointer journey, then inspect focus movement, interactions and causal evidence.', 'Graba un recorrido real con teclado o puntero y después revisa el movimiento de foco, las interacciones y la evidencia causal.')}</span>
          </li>
          <li>
            <strong>{tr(language, 'Use Report to collect the evidence.', 'Usa Informe para reunir la evidencia.')}</strong>
            <span>{tr(language, 'The report combines the current static scan with recorded runtime evidence and can be prepared for printing or PDF export.', 'El informe combina el análisis estático actual con la evidencia runtime grabada y puede prepararse para impresión o exportación a PDF.')}</span>
          </li>
        </ol>
      </section>

      <div className="instructions-grid">
        <InstructionCard title={tr(language, 'Review', 'Revisión')}>
          <p>{tr(language, 'Inspect deterministic failures, contextual reviews and authoring warnings from the current scan.', 'Revisa fallos deterministas, señales que requieren revisión contextual y avisos de autoría del análisis actual.')}</p>
          <ul>
            <li>{tr(language, 'Failures are findings FocusTrace can determine from the evidence it measured.', 'Los fallos son hallazgos que FocusTrace puede determinar a partir de la evidencia medida.')}</li>
            <li>{tr(language, 'Reviews need human context before they should be treated as an accessibility failure.', 'Las revisiones necesitan contexto humano antes de tratarse como un fallo de accesibilidad.')}</li>
            <li>{tr(language, 'Warnings highlight risky HTML/ARIA authoring without automatically claiming a WCAG failure.', 'Los avisos señalan riesgos de autoría HTML/ARIA sin afirmar automáticamente un fallo WCAG.')}</li>
            <li>{tr(language, 'Use Inspect on a finding to locate its current target in the page when it is still present.', 'Usa Inspeccionar en un hallazgo para localizar su objetivo actual en la página cuando siga presente.')}</li>
          </ul>
        </InstructionCard>

        <InstructionCard title={tr(language, 'Rule legend and identifiers', 'Leyenda de reglas e identificadores')}>
          <p>
            {tr(
              language,
              'FocusTrace uses stable internal identifiers so the same rule can be recognized in Review, Trace, reports, exports and Memory. Every internal rule identifier starts with FT, meaning FocusTrace.',
              'FocusTrace usa identificadores internos estables para reconocer la misma regla en Revisión, Trace, informes, exportaciones y Memory. Todo identificador interno de regla empieza por FT, que significa FocusTrace.',
            )}
          </p>
          <dl className="instructions-legend">
            <div>
              <dt><code>FT-WCAG-###</code></dt>
              <dd>{tr(language, 'FocusTrace rule directly mapped to a WCAG success criterion. The rule still evaluates only the evidence described by that rule; it does not prove the whole criterion.', 'Regla de FocusTrace vinculada directamente a un criterio de conformidad WCAG. La regla solo evalúa la evidencia definida por esa comprobación; no demuestra por sí sola todo el criterio.')}</dd>
            </div>
            <div>
              <dt><code>FT-WARN-###</code></dt>
              <dd>{tr(language, 'Deterministic HTML, ARIA or authoring warning that should be corrected or reviewed, without automatically claiming a WCAG failure.', 'Aviso determinista de HTML, ARIA o autoría que debe corregirse o revisarse, sin afirmar automáticamente un incumplimiento WCAG.')}</dd>
            </div>
            <div>
              <dt><code>FT-REVIEW-###</code></dt>
              <dd>{tr(language, 'Contextual signal that needs human judgement before it can be treated as an accessibility failure.', 'Señal contextual que necesita criterio humano antes de poder tratarse como un fallo de accesibilidad.')}</dd>
            </div>
            <div>
              <dt><code>FT-RUNTIME-###</code></dt>
              <dd>{tr(language, 'Deterministic or diagnostic rule based on behavior observed while Trace is recording, such as focus or dynamic page changes.', 'Regla determinista o diagnóstica basada en comportamiento observado mientras Trace está grabando, como cambios de foco o de contenido dinámico.')}</dd>
            </div>
            <div>
              <dt><code>FT-RUNTIME-ARIA-###</code></dt>
              <dd>{tr(language, 'Runtime contradiction in ARIA state or relationships observed after real interaction, for example an invalid active descendant or a popup state that does not match the rendered widget.', 'Contradicción runtime en estados o relaciones ARIA observada tras una interacción real, por ejemplo un descendiente activo inválido o un estado de popup que no coincide con el widget renderizado.')}</dd>
            </div>
            <div>
              <dt><code>FT-APG-###</code></dt>
              <dd>{tr(language, 'Behavior reviewed against a WAI-ARIA Authoring Practices pattern. APG is informative guidance, so these findings remain contextual reviews unless independent normative evidence proves more.', 'Comportamiento revisado frente a un patrón de WAI-ARIA Authoring Practices. APG es una guía informativa, por lo que estos hallazgos permanecen como revisiones contextuales salvo que exista evidencia normativa independiente.')}</dd>
            </div>
          </dl>
          <p>
            <strong>{tr(language, 'The number is internal.', 'El número es interno.')}</strong>{' '}
            {tr(
              language,
              'For example, 010 in FT-APG-010 is the FocusTrace sequence number for that family; it is not a WCAG, WAI-ARIA or APG rule number.',
              'Por ejemplo, 010 en FT-APG-010 es el número de secuencia interno de FocusTrace para esa familia; no es un número oficial de WCAG, WAI-ARIA ni APG.',
            )}
          </p>
          <p>
            <strong>{tr(language, 'Prefix, result and severity are different things.', 'Prefijo, resultado y severidad son cosas distintas.')}</strong>{' '}
            {tr(
              language,
              'The prefix identifies the rule family and evidence model. FAIL, WARNING, REVIEW and PASS describe the conclusion for the measured evidence. Critical, Serious, Moderate and Minor describe impact or priority; they are not WCAG conformance levels and do not change the confidence of the evidence.',
              'El prefijo identifica la familia de regla y el modelo de evidencia. FAIL, WARNING, REVIEW y PASS describen la conclusión sobre la evidencia medida. Critical, Serious, Moderate y Minor describen impacto o prioridad; no son niveles de conformidad WCAG ni cambian la confianza de la evidencia.',
            )}
          </p>
          <p>
            <strong>{tr(language, 'External references stay separate.', 'Las referencias externas se mantienen separadas.')}</strong>{' '}
            {tr(
              language,
              'Identifiers such as WCAG 2.4.3, ACT 2ee8b8 or WAI-ARIA aria-expanded come from the relevant standards. An FT identifier is always a FocusTrace identifier that points to those sources when applicable.',
              'Identificadores como WCAG 2.4.3, ACT 2ee8b8 o WAI-ARIA aria-expanded pertenecen a sus respectivos estándares. Un identificador FT siempre es un identificador de FocusTrace que enlaza esas fuentes cuando corresponde.',
            )}
          </p>
          <p>
            <strong>{tr(language, 'Finding vs occurrence.', 'Hallazgo vs ocurrencia.')}</strong>{' '}
            {tr(
              language,
              'A finding is one consolidated problem for a rule and affected context. An occurrence is each time Trace observed that same problem. Five occurrences can therefore appear as one finding with a count of five instead of five repeated report cards.',
              'Un hallazgo es un problema consolidado para una regla y un contexto afectado. Una ocurrencia es cada vez que Trace observó ese mismo problema. Por eso cinco ocurrencias pueden aparecer como un único hallazgo con contador cinco, en lugar de cinco tarjetas repetidas en el informe.',
            )}
          </p>
        </InstructionCard>

        <InstructionCard title={tr(language, 'Analyze a component', 'Analizar un componente')}>
          <p>{tr(language, 'Choose a DOM region directly on the inspected page and run the rule engine only for that component scope.', 'Selecciona una región del DOM directamente en la página inspeccionada y ejecuta el motor de reglas solo para ese ámbito de componente.')}</p>
          <p>{tr(language, 'Document-wide context is still used where the rule requires it, for example when checking whether an HTML id is actually unique.', 'El contexto global del documento se sigue usando cuando una regla lo necesita, por ejemplo para comprobar si un id HTML es realmente único.')}</p>
        </InstructionCard>

        <InstructionCard title={tr(language, 'Site Audit', 'Análisis de sitio')}>
          <p>{tr(language, 'Discover same-origin pages from sitemaps, robots.txt, internal links and optional URLs, group repeated route families and scan representative samples.', 'Descubre páginas del mismo origen desde sitemaps, robots.txt, enlaces internos y URLs opcionales, agrupa familias de rutas repetidas y analiza muestras representativas.')}</p>
          <p>{tr(language, 'Use it to find repeated template problems without blindly scanning every duplicate URL. Sampling is evidence, not proof that every route is identical.', 'Úsalo para localizar problemas repetidos de plantilla sin analizar a ciegas cada URL duplicada. El muestreo aporta evidencia, no demuestra que todas las rutas sean idénticas.')}</p>
        </InstructionCard>

        <InstructionCard title="Trace">
          <p>{tr(language, 'Record real interaction evidence: keyboard and pointer input, focus movement, DOM changes, dialogs and SPA route changes.', 'Graba evidencia de interacción real: teclado y puntero, movimiento de foco, cambios del DOM, diálogos y cambios de ruta SPA.')}</p>
          <ul>
            <li>{tr(language, 'Replay shows the recorded sequence without re-running the page interaction.', 'Replay muestra la secuencia grabada sin volver a ejecutar la interacción en la página.')}</li>
            <li>{tr(language, 'Journey and Graph help explain where focus moved and how controls were connected during the session.', 'Recorrido y Grafo ayudan a explicar dónde se movió el foco y cómo se relacionaron los controles durante la sesión.')}</li>
            <li>{tr(language, 'Accessibility breakpoints can pause FocusTrace recording after selected deterministic runtime conditions are captured.', 'Los breakpoints de accesibilidad pueden pausar la grabación de FocusTrace después de capturar determinadas condiciones runtime deterministas.')}</li>
          </ul>
        </InstructionCard>

        <InstructionCard title={tr(language, 'Automate focus', 'Automatizar foco')}>
          <p>{tr(language, 'Run an automated keyboard-focus walk to inspect reachable focus targets and build focus evidence without manually pressing Tab through the entire page.', 'Ejecuta un recorrido automático de foco por teclado para revisar los destinos alcanzables y crear evidencia de foco sin recorrer manualmente toda la página con Tab.')}</p>
          <p>{tr(language, 'Use the resulting journey as debugging evidence; it does not replace manual keyboard testing for context-sensitive behavior.', 'Usa el recorrido resultante como evidencia de depuración; no sustituye las pruebas manuales con teclado cuando el comportamiento depende del contexto.')}</p>
        </InstructionCard>

        <InstructionCard title={tr(language, 'Headings', 'Encabezados')}>
          <p>{tr(language, 'View the page heading outline, inspect hierarchy and locate headings on the page. Skipped levels are surfaced as structural review signals rather than automatic failures.', 'Consulta el esquema de encabezados de la página, revisa la jerarquía y localiza encabezados. Los saltos de nivel se muestran como señales estructurales para revisar, no como fallos automáticos.')}</p>
        </InstructionCard>

        <InstructionCard title={tr(language, 'Report', 'Informe')}>
          <p>{tr(language, 'Combine static findings and runtime stories in a shareable review. Reports include the evidence FocusTrace recorded, not only a score or summary count.', 'Combina hallazgos estáticos e historias runtime en una revisión compartible. Los informes incluyen la evidencia registrada por FocusTrace, no solo una puntuación o un contador.')}</p>
          <p>{tr(language, 'Optional visual evidence for printable reports is created only when you explicitly request it and should be reviewed before sharing.', 'La evidencia visual opcional para informes imprimibles solo se crea cuando la solicitas expresamente y debe revisarse antes de compartirla.')}</p>
        </InstructionCard>

        <InstructionCard title="FocusTrace Memory">
          <p>{tr(language, 'Memory is optional and disabled by default. When enabled in Settings, it keeps bounded local scan history so page or component findings can be compared over time.', 'Memory es opcional y está desactivado por defecto. Al activarlo en Ajustes, conserva un historial local limitado para comparar con el tiempo los hallazgos de una página o componente.')}</p>
          <p>{tr(language, 'Use it to identify persistent findings, changes, issues that are no longer reproduced and regressions. Memory history is diagnostic and does not prove WCAG conformance.', 'Úsalo para identificar hallazgos persistentes, cambios, problemas que ya no se reproducen y regresiones. El historial de Memory es diagnóstico y no demuestra conformidad WCAG.')}</p>
        </InstructionCard>

        <InstructionCard title={tr(language, 'Settings and privacy', 'Ajustes y privacidad')}>
          <p>{tr(language, 'Settings lets you change language, interface size, runtime breakpoints and Memory preferences.', 'Ajustes permite cambiar el idioma, el tamaño de interfaz, los breakpoints runtime y las preferencias de Memory.')}</p>
          <p>{tr(language, 'FocusTrace is local-first: analysis evidence is processed in the browser and the project does not intentionally send inspected-page content, DOM evidence, screenshots or recorded interactions to a FocusTrace server or third-party AI service.', 'FocusTrace es local-first: la evidencia de análisis se procesa en el navegador y el proyecto no envía intencionadamente contenido de la página inspeccionada, evidencia del DOM, capturas o interacciones grabadas a un servidor de FocusTrace ni a un servicio de IA de terceros.')}</p>
        </InstructionCard>
      </div>

      <aside className="notice instructions-note">
        <strong>{tr(language, 'Important', 'Importante')}</strong>
        <p>{tr(language, 'Automated accessibility testing can find many deterministic problems, but it cannot prove complete accessibility on its own. Use FocusTrace evidence together with manual keyboard, screen-reader and contextual review where appropriate.', 'Las pruebas automáticas de accesibilidad pueden detectar muchos problemas deterministas, pero no pueden demostrar por sí solas una accesibilidad completa. Usa la evidencia de FocusTrace junto con pruebas manuales de teclado, lector de pantalla y revisión contextual cuando corresponda.')}</p>
      </aside>
    </section>
  );
}

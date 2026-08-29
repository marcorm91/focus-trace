import { useEffect, useState } from 'react';
import { browser } from '#imports';
import { guidanceForIssue, type FindingGuidance as FindingGuidanceModel } from '../../../lib/report/finding-guidance';
import {
  DUPLICATE_ID_RULE,
  GENERIC_INTERACTIVE_SEMANTICS_RULE,
  MAIN_LANDMARK_RULE,
  MULTIPLE_MAIN_LANDMARKS_RULE,
  NATIVE_BUTTON_SEMANTICS_RULE,
  NATIVE_LINK_SEMANTICS_RULE,
} from '../../../shared/html-authoring-rules';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import { localizedRuleSeverityRationale, type RuleDefinition } from '../../../shared/rule-catalog';
import type { ScanIssue } from '../../../shared/types';

const HEADING_JUMP_RULE_ID = 'FT-REVIEW-002';
const AUTHORING_RULES: RuleDefinition[] = [
  DUPLICATE_ID_RULE,
  MAIN_LANDMARK_RULE,
  MULTIPLE_MAIN_LANDMARKS_RULE,
  NATIVE_BUTTON_SEMANTICS_RULE,
  NATIVE_LINK_SEMANTICS_RULE,
  GENERIC_INTERACTIVE_SEMANTICS_RULE,
];

type HeadingReviewSnapshot = {
  level: string;
  text: string;
};

function duplicateIdGuidance(language: AppLanguage): FindingGuidanceModel {
  return {
    impact: tr(
      language,
      'Duplicate IDs can make labels, ARIA ID references, fragment links and scripted lookups resolve to the wrong element or behave inconsistently.',
      'Los IDs duplicados pueden hacer que etiquetas, referencias ARIA por ID, enlaces de fragmento y búsquedas mediante scripts se resuelvan hacia el elemento equivocado o se comporten de forma inconsistente.',
    ),
    remediation: tr(
      language,
      'Give every element a unique non-empty id and update every for, aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-activedescendant, headers or href reference that points to the renamed identifier.',
      'Asigna a cada elemento un id no vacío y único, y actualiza todas las referencias for, aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-activedescendant, headers o href que apunten al identificador renombrado.',
    ),
    validation: tr(
      language,
      'Run the scan again and confirm the duplicate-ID warning is gone, then verify that every ID-based relationship still resolves to its intended target.',
      'Vuelve a ejecutar el análisis y confirma que desaparece el aviso de ID duplicado; después verifica que cada relación basada en ID sigue resolviendo hacia su destino previsto.',
    ),
  };
}

function semanticGuidance(issue: ScanIssue, language: AppLanguage): FindingGuidanceModel | undefined {
  if (issue.ruleId === MAIN_LANDMARK_RULE.id) {
    return {
      impact: tr(
        language,
        'Without a main landmark, screen-reader and other assistive-technology users can lose a useful shortcut for reaching and identifying the primary content.',
        'Sin un landmark principal, los usuarios de lector de pantalla y otras tecnologías de asistencia pueden perder un atajo útil para llegar e identificar el contenido principal.',
      ),
      remediation: tr(
        language,
        'Wrap the primary page content in one native <main> element when the document structure allows it. Use role="main" only when a native main element cannot be used.',
        'Envuelve el contenido principal de la página en un único elemento <main> nativo cuando la estructura lo permita. Usa role="main" solo cuando no pueda utilizarse main.',
      ),
      validation: tr(
        language,
        'Inspect the accessibility tree or landmark navigation and confirm that one primary main region is exposed and contains the page-specific content.',
        'Revisa el árbol de accesibilidad o la navegación por landmarks y confirma que se expone una región principal que contiene el contenido específico de la página.',
      ),
    };
  }

  if (issue.ruleId === MULTIPLE_MAIN_LANDMARKS_RULE.id) {
    return {
      impact: tr(
        language,
        'Several main landmarks can make it unclear which region represents the page primary content and can make landmark navigation less predictable.',
        'Varios landmarks principales pueden hacer poco claro qué región representa el contenido principal y volver menos predecible la navegación por landmarks.',
      ),
      remediation: tr(
        language,
        'Prefer one exposed primary <main>. If multiple ARIA main regions are genuinely required, verify that the structure is intentional and that users can distinguish their purpose.',
        'Prioriza un único <main> principal expuesto. Si realmente se necesitan varias regiones ARIA main, verifica que la estructura sea intencionada y que los usuarios puedan diferenciar su propósito.',
      ),
      validation: tr(
        language,
        'Navigate by landmarks with assistive technology and confirm that the primary content is unambiguous and every exposed main region has a necessary, understandable purpose.',
        'Navega por landmarks con tecnología de asistencia y confirma que el contenido principal no es ambiguo y que cada región main expuesta tiene un propósito necesario y comprensible.',
      ),
    };
  }

  if (issue.ruleId === NATIVE_BUTTON_SEMANTICS_RULE.id) {
    return {
      impact: tr(
        language,
        'A custom button can miss native keyboard activation, focus behavior or platform semantics even when role="button" is present.',
        'Un botón personalizado puede perder la activación nativa por teclado, el comportamiento de foco o la semántica de plataforma incluso aunque tenga role="button".',
      ),
      remediation: tr(
        language,
        'Prefer <button type="button"> for actions. If the host element cannot change, role="button" is only the semantic fallback: make it focusable and reproduce the expected Enter/Space behavior and states.',
        'Prioriza <button type="button"> para acciones. Si no puede cambiarse el elemento, role="button" es solo la alternativa semántica: hazlo enfocable y reproduce el comportamiento esperado con Enter/Espacio y sus estados.',
      ),
      validation: tr(
        language,
        'Reach the control with the keyboard, activate it with Enter and Space where appropriate, and confirm that the accessibility tree exposes the intended button role, name and state.',
        'Llega al control con el teclado, actívalo con Enter y Espacio cuando corresponda y confirma que el árbol de accesibilidad expone el rol, nombre y estado de botón previstos.',
      ),
    };
  }

  if (issue.ruleId === NATIVE_LINK_SEMANTICS_RULE.id) {
    return {
      impact: tr(
        language,
        'A custom navigation control can lose expected link behavior such as browser navigation semantics, link context menus and assistive-technology role exposure.',
        'Un control de navegación personalizado puede perder comportamientos esperados de un enlace, como la semántica de navegación del navegador, los menús contextuales y la exposición correcta del rol a tecnologías de asistencia.',
      ),
      remediation: tr(
        language,
        'Prefer a native <a href="…"> when activating the element changes location, route or resource. Use role="link" only when an anchor cannot be used and recreate the expected keyboard/navigation behavior.',
        'Prioriza un <a href="…"> nativo cuando activar el elemento cambia de ubicación, ruta o recurso. Usa role="link" solo cuando no pueda utilizarse un enlace y reproduce el comportamiento esperado de teclado y navegación.',
      ),
      validation: tr(
        language,
        'Confirm that the destination is represented by href, the control is announced as a link, keyboard activation works, and expected browser link behaviors remain available.',
        'Confirma que el destino está representado mediante href, que el control se anuncia como enlace, que funciona con teclado y que siguen disponibles los comportamientos habituales del navegador para enlaces.',
      ),
    };
  }

  if (issue.ruleId === GENERIC_INTERACTIVE_SEMANTICS_RULE.id) {
    return {
      impact: tr(
        language,
        'A generic clickable element may expose no meaningful role or may be given the wrong role if its intended behavior is guessed from appearance alone.',
        'Un elemento genérico clicable puede no exponer un rol significativo o recibir un rol incorrecto si su comportamiento se deduce únicamente por su apariencia.',
      ),
      remediation: tr(
        language,
        'Determine the interaction intent first: use a button for an action, an anchor for navigation, or the correct native/widget pattern for another interaction. Do not add role="button" or role="link" until the intended behavior is known.',
        'Determina primero la intención de la interacción: usa un botón para una acción, un enlace para navegación o el patrón nativo/widget correcto para otra interacción. No añadas role="button" o role="link" hasta conocer el comportamiento previsto.',
      ),
      validation: tr(
        language,
        'Test the final control with keyboard and the accessibility tree and confirm that its role, name, state and activation behavior all match the intended interaction.',
        'Prueba el control final con teclado y en el árbol de accesibilidad, y confirma que rol, nombre, estado y comportamiento de activación coinciden con la interacción prevista.',
      ),
    };
  }

  return undefined;
}

function HeadingReviewContext({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  const target = issue.targets[0];
  const [heading, setHeading] = useState<HeadingReviewSnapshot>();

  useEffect(() => {
    let cancelled = false;
    setHeading(undefined);

    if (issue.ruleId !== HEADING_JUMP_RULE_ID || !target) return () => { cancelled = true; };

    void (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id == null) return;
        const results = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (selector: string) => {
            const element = document.querySelector(selector);
            if (!element || !/^H[1-6]$/.test(element.tagName)) return undefined;
            return {
              level: element.tagName,
              text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            };
          },
          args: [target],
        });
        const result = results[0]?.result as HeadingReviewSnapshot | undefined;
        if (!cancelled && result) setHeading(result);
      } catch {
        // The scan can outlive the inspected DOM. Keep the finding usable even
        // when the original heading can no longer be resolved on the page.
      }
    })();

    return () => { cancelled = true; };
  }, [issue.ruleId, target]);

  if (issue.ruleId !== HEADING_JUMP_RULE_ID || !heading) return null;

  return (
    <section className="finding-heading-context" aria-label={tr(language, 'Affected heading', 'Encabezado afectado')}>
      <small>{tr(language, 'Affected heading', 'Encabezado afectado')}</small>
      <div>
        <span aria-hidden="true">{heading.level}</span>
        <strong>{heading.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
      </div>
    </section>
  );
}

export function FindingGuidance({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  const semantic = semanticGuidance(issue, language);
  const guidance = issue.ruleId === DUPLICATE_ID_RULE.id
    ? duplicateIdGuidance(language)
    : semantic ?? guidanceForIssue(issue, language);
  const authoringRule = AUTHORING_RULES.find((rule) => rule.id === issue.ruleId);
  const severityRationale = authoringRule
    ? authoringRule.severityRationale[language]
    : localizedRuleSeverityRationale(issue.ruleId, language);

  return (
    <div className="finding-guidance">
      <HeadingReviewContext issue={issue} language={language} />

      {severityRationale && (
        <details className={`finding-guidance-severity severity-${issue.severity}`}>
          <summary>
            <span>{tr(language, 'Why this impact?', '¿Por qué este impacto?')}</span>
            <strong>{localizedSeverity(issue.severity, language)}</strong>
          </summary>
          <p>{severityRationale}</p>
          <small>{tr(
            language,
            'FocusTrace assigns this base impact independently. Standards references describe authoring/accessibility requirements, not severity scores.',
            'FocusTrace asigna este impacto base de forma independiente. Las referencias normativas describen requisitos de autoría/accesibilidad, no niveles de severidad.',
          )}</small>
        </details>
      )}

      <section>
        <small>{tr(language, 'User impact', 'Impacto')}</small>
        <p>{guidance.impact}</p>
      </section>
      <section className="finding-guidance-fix">
        <small>{tr(language, 'Suggested fix', 'Propuesta de solución')}</small>
        <p>{guidance.remediation}</p>
      </section>
      <section>
        <small>{tr(language, 'How to verify', 'Cómo validarlo')}</small>
        <p>{guidance.validation}</p>
      </section>
    </div>
  );
}

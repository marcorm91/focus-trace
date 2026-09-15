import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanResult } from '../../../shared/types';

export function TextResizeCheck({ scan, language }: { scan?: ScanResult; language: AppLanguage }) {
  if (!scan || scan.scope?.type === 'component' || !scan.textResize) return null;
  return (
    <section className="report-text-resize" aria-label={tr(language, '200% text resize check', 'Comprobación de texto al 200 %')}>
      {scan.textResize && (
        <div className="notice" role="status">
          <strong>{tr(language, '200% text resize check', 'Comprobación de texto al 200 %')}</strong>
          <p>
            {scan.textResize.phase === 'baseline-captured'
              ? tr(
                  language,
                  `The 100% reference is ready (${scan.textResize.subjectsCaptured ?? 0} text and control subjects). Set browser zoom to 200% and analyze this page again.`,
                  `La referencia al 100 % está lista (${scan.textResize.subjectsCaptured ?? 0} textos y controles). Ajusta el zoom del navegador al 200 % y vuelve a analizar esta página.`,
                )
              : scan.textResize.phase === 'comparison-complete'
                ? tr(
                    language,
                    `The 200% comparison is complete (${scan.textResize.subjectsCompared ?? 0} subjects matched). Review the detected candidates and check intermediate zoom steps manually.`,
                    `La comparación al 200 % ha terminado (${scan.textResize.subjectsCompared ?? 0} elementos relacionados). Revisa los candidatos detectados y comprueba manualmente los niveles de zoom intermedios.`,
                  )
                : scan.textResize.phase === 'target-zoom-required'
                  ? tr(
                      language,
                      `The 100% reference is ready. Current browser zoom is ${Math.round((scan.textResize.currentZoomFactor ?? 0) * 100)}%; set it to 200% and analyze again.`,
                      `La referencia al 100 % está lista. El zoom actual del navegador es ${Math.round((scan.textResize.currentZoomFactor ?? 0) * 100)} %; ajústalo al 200 % y vuelve a analizar.`,
                    )
                  : scan.textResize.phase === 'baseline-required'
                    ? tr(
                        language,
                        'A reference is required. Set browser zoom to 100%, analyze this page, then set it to 200% and analyze again.',
                        'Se necesita una referencia. Ajusta el zoom del navegador al 100 %, analiza esta página y después repite el análisis al 200 %.',
                      )
                    : tr(
                        language,
                        'FocusTrace could not read browser zoom. Check text resizing manually at 200%.',
                        'FocusTrace no ha podido leer el zoom del navegador. Comprueba manualmente la ampliación del texto al 200 %.',
                      )}
          </p>
        </div>
      )}
    </section>
  );
}

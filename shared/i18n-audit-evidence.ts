import type { AppLanguage } from './i18n-base';

const EXACT_ES: Record<string, string> = {
  "headers is present but contains no IDREF token.": "El atributo headers está presente, pero no contiene ningún identificador de referencia.",
  "scope is only conforming on native <th> cells.": "El atributo scope solo es válido en celdas <th> nativas.",
  "scope=\"rowgroup\" is not anchored in a row group for this table.": "scope=\"rowgroup\" no está asociado a un grupo de filas de esta tabla.",
  "scope=\"colgroup\" is present but this table exposes no colgroup to establish that column group.": "scope=\"colgroup\" está presente, pero la tabla no expone ningún colgroup que defina ese grupo de columnas.",
  "The headers relationship did not resolve to a usable header cell.": "La relación headers no resuelve a una celda de encabezado utilizable.",

  "The saved finding was not observed after the complete replay finished.": "El hallazgo guardado no se ha observado tras finalizar la reproducción completa.",
  "The same rule and target still produce the same runtime outcome.": "La misma regla y el mismo destino siguen produciendo el mismo resultado de interacción.",
  "The same rule and target were observed, but the runtime outcome or event kind changed.": "Se han observado la misma regla y el mismo destino, pero ha cambiado el resultado o el tipo de evento.",
  "A saved finding identity reappeared with different evidence.": "Un hallazgo guardado ha reaparecido con una evidencia distinta.",
  "This finding was not present in the saved baseline.": "Este hallazgo no estaba presente en la referencia guardada.",
  "This action requires an explicit manual stop and was not executed automatically.": "Esta acción requiere una parada manual explícita y no se ha ejecutado automáticamente.",
  "Only the bounded non-text keyboard action set is eligible for automatic replay.": "Solo el conjunto acotado de acciones de teclado que no introducen texto puede reproducirse automáticamente.",
  "The saved target matches more than one current element, so replay stopped without choosing one.": "El destino guardado coincide con varios elementos actuales; la reproducción se ha detenido sin elegir uno.",
  "The saved target is no longer uniquely available on the current page.": "El destino guardado ya no está disponible de forma única en la página actual.",
  "The uniquely resolved non-text keyboard action was replayed on the current target.": "La acción de teclado sin entrada de texto se ha reproducido en el destino identificado de forma única.",
  "The action target is missing.": "No se encuentra el destino de la acción.",
  "The safe action could not be replayed.": "No se ha podido reproducir la acción de forma segura.",

  'No visible native H1 or role="heading" with aria-level="1" was detected.': 'No se ha detectado ningún H1 nativo visible ni role="heading" con aria-level="1".',
  'role="region" resolved with an empty accessible name.': 'El elemento con role="region" tiene un nombre accesible vacío.',
  'Nested frame document was unavailable to the local composed traversal; its descendants were not verified clean.': 'El documento del marco anidado no estaba disponible para el recorrido local; no se ha podido verificar que sus descendientes estén libres de problemas.',
  'A closed shadow root was observed on this host by the MAIN-world bridge. Its descendants are intentionally inaccessible and were not verified clean.': 'El puente MAIN ha observado un Shadow DOM cerrado en este elemento anfitrión. Sus descendientes son inaccesibles por diseño y no se ha podido verificar que estén libres de problemas.',
  'sandboxed frame without allow-same-origin; embedded descendants were not inspected.': 'Marco aislado mediante sandbox sin allow-same-origin; no se han inspeccionado sus descendientes.',
  'cross-origin or opaque frame; embedded descendants were not inspected.': 'Marco de otro origen u origen opaco; no se han inspeccionado sus descendientes.',
  'same-origin frame document is not currently available; embedded descendants were not inspected.': 'El documento del marco del mismo origen no está disponible; no se han inspeccionado sus descendientes.',
  'frame accessible-name computation returned an empty string.': 'El cálculo del nombre accesible del marco ha devuelto una cadena vacía.',
  'object[data] has no non-empty aria-label, aria-labelledby or title-based accessible name and is not explicitly presentational.': 'El elemento object[data] no tiene un nombre accesible no vacío mediante aria-label, aria-labelledby o title y no está marcado explícitamente como presentación.',
  'The control is named only by its title attribute. Review whether a persistent visible label or equivalent robust labeling mechanism is available.': 'El control obtiene su nombre únicamente del atributo title. Comprueba si dispone de una etiqueta visible persistente o de un mecanismo de etiquetado equivalente y robusto.',
  'Associated labeling indicates that the field is required, but neither native required nor aria-required="true" is exposed. Review whether the required state is programmatically determinable.': 'El etiquetado asociado indica que el campo es obligatorio, pero no expone required ni aria-required="true". Comprueba si la obligatoriedad puede determinarse programáticamente.',
  'The same rule still reports the same uniquely resolved target.': 'La misma regla sigue detectando el problema en el destino identificado de forma única.',
  'The target still produces this rule, but its outcome or evidence changed since the original observation.': 'La regla sigue detectando el destino, pero su resultado o evidencia han cambiado desde la observación original.',
  'The target was resolved, but this rule does not provide complete pass coverage when no finding is emitted.': 'Se ha identificado el destino, pero esta regla no permite confirmar un resultado correcto solo porque no emita hallazgos.',
  'The original target was resolved uniquely and the rerun no longer reports this rule for it.': 'Se ha identificado de forma única el destino original y el nuevo análisis ya no informa esta regla para él.',
  'More than one current finding matches the original rule and target evidence, so FocusTrace did not attach the recheck to any of them.': 'Varios hallazgos actuales coinciden con la regla y la evidencia originales; FocusTrace no ha asociado la recomprobación a ninguno automáticamente.',
  'The original locator now matches more than one element. FocusTrace did not choose one automatically.': 'El localizador original coincide ahora con varios elementos. FocusTrace no ha elegido uno automáticamente.',
  'The original locator resolves, but the element identity no longer matches the original tag or stable id.': 'El localizador original resuelve, pero el elemento ya no coincide con la etiqueta o el identificador estable originales.',
  'The original boundary-aware locator still resolves uniquely.': 'El localizador original, que tiene en cuenta los contextos anidados, sigue resolviendo de forma única.',
  'The original locator no longer resolves and no unique element with the stored identity signature was found.': 'El localizador original ya no resuelve y no se ha encontrado un elemento único con la identidad guardada.',
  'Several elements match the stored identity signature equally well. FocusTrace did not choose one automatically.': 'Varios elementos coinciden por igual con la identidad guardada. FocusTrace no ha elegido uno automáticamente.',
  'The original locator changed, but one element uniquely matches the stored identity signature.': 'El localizador original ha cambiado, pero un único elemento coincide con la identidad guardada.',
  'The original runtime target is no longer present. The recorded event is kept as historical evidence.': 'El destino original de la interacción ya no está presente. El evento registrado se conserva como evidencia histórica.',
  'Several elements could correspond to the recorded runtime target, so FocusTrace did not choose one automatically.': 'Varios elementos podrían corresponder al destino registrado; FocusTrace no ha elegido uno automáticamente.',
  'The recorded target locator now resolves to a materially different element identity.': 'El localizador del destino registrado resuelve ahora a un elemento con una identidad sustancialmente distinta.',
  'The recorded target is still identifiable. Replay the original interaction to verify whether the runtime behavior itself still occurs.': 'El destino registrado sigue siendo identificable. Repite la interacción original para comprobar si el comportamiento sigue ocurriendo.',
};

const PATTERNS: Array<[RegExp, (...values: string[]) => string]> = [
  [/^Viewport metadata restricts the ACT-observable 200% zoom expectation: (.+)\.$/, (reasons) => `Los metadatos del viewport limitan la ampliación al 200 % evaluada por ACT: ${reasons.replace(/ resolves below 2/g, ' se interpreta como un valor inferior a 2')}.`],
  [/^frame tabindex=(.+); a sequentially focusable embedded descendant was detected \((.+)\)\. Embedded text and attributes were not copied into evidence\.$/, (index, tag) => `El marco tiene tabindex=${index} y contiene un descendiente enfocable secuencialmente (${tag}). No se han copiado el texto ni los atributos incrustados a la evidencia.`],
  [/^(.+) exposed frames share accessible name (.+)\. Review whether those frames have an equivalent purpose\.$/, (count, name) => `${count} marcos expuestos comparten el nombre accesible ${name}. Revisa si tienen un propósito equivalente.`],
  [/^caption and summary both normalize to (.+)\.$/, (text) => `caption y summary contienen el mismo texto normalizado: ${text}.`],
  [/^caption-like first cell text=(.+); observed later width=(.+)\.$/, (text, width) => `La primera celda contiene un texto que podría ser un título de tabla: ${text}; anchura posterior observada: ${width} columnas.`],
  [/^duplicate normalized table name=(.+); matching tables=(.+)\.$/, (name, count) => `Nombre de tabla normalizado repetido: ${name}; tablas coincidentes: ${count}.`],
  [/^header role=(.+); row=(.+); columns=(.+?)(?:; table complex=(.+))?\.$/, (role, row, columns, complex) => `Rol del encabezado: ${role}; fila: ${row}; columnas: ${columns}.${complex ? ` Tabla compleja: ${complex === 'true' ? 'sí' : 'no'}.` : ''}`],
  [/^table kind=(.+); row=(.+); columns=(.+); complex=(.+); headers=(.+); explicit headers=(.+)\.$/, (kind, row, columns, complex, count, explicit) => `Tipo de tabla: ${kind === 'native' ? 'nativa' : kind}; fila: ${row}; columnas: ${columns}; compleja: ${complex === 'true' ? 'sí' : 'no'}; encabezados: ${count}; relación headers explícita: ${({ valid: 'válida', unresolved: 'sin resolver', absent: 'ausente' } as Record<string, string>)[explicit] ?? explicit}.`],
  [/^scope=(.+) is not row, col, rowgroup or colgroup\.$/, (value) => `scope=${value} no es row, col, rowgroup ni colgroup.`],
  [/^(.+) does not resolve$/, (id) => `${id} no resuelve`],
  [/^(.+) resolves to <(.+)> instead of <th>$/, (id, tag) => `${id} resuelve a <${tag}> en lugar de <th>`],
  [/^(.+) resolves to a header in another table$/, (id) => `${id} resuelve a un encabezado de otra tabla`],
  [/^(.+) resolves to a programmatically hidden header$/, (id) => `${id} resuelve a un encabezado oculto programáticamente`],
  [/^(.+) does not resolve to an exposed header cell in this table model$/, (id) => `${id} no resuelve a una celda de encabezado expuesta en este modelo de tabla`],
  [/^maximum-scale=(.+) permits 200% zoom but limits larger enlargement below the 5× compatibility review threshold\.$/, (scale) => `maximum-scale=${scale} permite ampliar al 200 %, pero limita ampliaciones mayores por debajo del umbral de revisión de compatibilidad de 5×.`],
  [/^maximum-scale=(.+) could not be resolved conservatively; review the user agent's effective zoom behavior\.$/, (scale) => `No se ha podido interpretar maximum-scale=${scale} con suficiente certeza; revisa el comportamiento efectivo de ampliación del navegador.`],
  [/^(.+)=(.+) applies under \(orientation: (.+)\) and resolves to an approximately quarter-turn Z-axis rotation\. Review essential-orientation exceptions, page controls and script-driven alternatives\.$/, (property, value, orientation) => `${property}=${value} se aplica con orientation: ${orientation} y produce aproximadamente un cuarto de vuelta sobre el eje Z. Revisa las excepciones de orientación esencial, los controles de página y las alternativas mediante scripts.`],

  [/^No banner, complementary, contentinfo, form, main, navigation, region or search landmark contains this (.+) element\.$/, (tag) => `Este elemento ${tag} no está contenido en ninguna región banner, complementary, contentinfo, form, main, navigation, region o search.`],
  [/^Resolved heading level=(.+); no usable text or alternative contribution was detected\.$/, (level) => `Nivel de encabezado calculado: ${level}; no se ha detectado texto ni una alternativa utilizable.`],
  [/^(.+) landmark is contained by (.+) landmark\.$/, (role, parent) => `La región ${role} está contenida en una región ${parent}.`],
  [/^(.+) exposed (.+) landmarks share the same document\/application scope\.$/, (count, role) => `${count} regiones ${role} expuestas comparten el mismo ámbito document/application.`],
  [/^Composed traversal stopped at the shared (.+)-element \/ (.+)-shadow-root \/ (.+)-frame \/ depth-(.+) budget\. Content beyond that boundary was not verified clean\.$/, (elements, roots, frames, depth) => `El recorrido se ha detenido al alcanzar el límite compartido de ${elements} elementos, ${roots} raíces Shadow DOM, ${frames} marcos y profundidad ${depth}. No se ha verificado el contenido situado más allá de ese límite.`],
  [/^The native control has (.+) associated label elements\. Review whether one clear label would better expose the field purpose and avoid repeated or conflicting announcements\.$/, (count) => `El control nativo tiene ${count} elementos label asociados. Revisa si una etiqueta clara comunicaría mejor su propósito y evitaría anuncios repetidos o contradictorios.`],
  [/^The exposed form group contains (.+) eligible controls but no non-empty legend, aria-label or resolved aria-labelledby name\. Review whether the controls need a shared group label\.$/, (count) => `El grupo de formulario contiene ${count} controles aplicables, pero no tiene un nombre no vacío mediante legend, aria-label o aria-labelledby. Revisa si necesitan una etiqueta de grupo compartida.`],
  [/^The control exposes constraint metadata \((.+)\) but no non-empty aria-describedby or aria-details relationship was resolved\. Review whether any instructions users need before input are programmatically associated\.$/, (attributes) => `El control expone restricciones (${attributes}), pero no se ha resuelto una relación aria-describedby o aria-details no vacía. Revisa si las instrucciones necesarias antes de introducir datos están asociadas programáticamente.`],
  [/^accesskey token (.+) is assigned to (.+) elements in this document\. Browser\/platform shortcut resolution can therefore be ambiguous\.$/, (token, count) => `El valor accesskey ${token} está asignado a ${count} elementos de este documento. El navegador o la plataforma pueden resolver el atajo de forma ambigua.`],
  [/^The first parseable meta refresh uses a (.+)-second delay, which is greater than zero and no more than the 20-hour ACT threshold\.$/, (seconds) => `La primera directiva meta refresh interpretable utiliza un retraso de ${seconds} segundos, superior a cero y no mayor que el umbral ACT de 20 horas.`],
  [/^The region scrolls (.+)px horizontally and (.+)px vertically but no sequentially focusable element was observed inside it\. Review keyboard scrolling, browser behavior, decorative applicability and any external scroll controls\.$/, (x, y) => `La región permite desplazar ${x} px horizontalmente y ${y} px verticalmente, pero no se ha observado ningún elemento enfocable secuencialmente en su interior. Revisa el desplazamiento con teclado, el comportamiento del navegador, su posible carácter decorativo y los controles externos.`],
];

/** Translate generated prose without changing captured page text, selectors or identifiers. */
export function localizedAuditEvidence(value: string, language: AppLanguage): string {
  if (language === 'en') return value;
  if (EXACT_ES[value]) return EXACT_ES[value];
  for (const [pattern, format] of PATTERNS) {
    const match = value.match(pattern);
    if (match) return format(...match.slice(1));
  }
  return value;
}

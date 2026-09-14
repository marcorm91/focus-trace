import type { GuidedTestDefinition, GuidedLocalizedText } from './framework';

export interface GuidedApgVariation {
  id: string;
  label: GuidedLocalizedText;
}

export interface GuidedApgPatternMetadata {
  apgId: string;
  variations: GuidedApgVariation[];
}

const APG = 'https://www.w3.org/WAI/ARIA/apg/patterns/';

export const APG_GUIDED_TESTS: GuidedTestDefinition[] = [
  {
    id: 'FT-GUIDED-009',
    title: { en: 'Tabs pattern review', es: 'Revisión del patrón de pestañas' },
    description: {
      en: 'Repeat the Tabs Pattern keyboard flow and review focus, selection and panel state without treating APG guidance as WCAG conformance.',
      es: 'Repite el flujo de teclado del patrón de pestañas y revisa foco, selección y estado del panel sin tratar la guía APG como conformidad WCAG.',
    },
    references: [{ type: 'WAI-ARIA APG', id: 'tabs', label: 'Tabs Pattern', url: `${APG}tabs/` }],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'tabs-applicability',
        title: { en: 'Confirm the tabs pattern', es: 'Confirma el patrón de pestañas' },
        prompt: {
          en: 'Confirm that one tab in a tablist controls one associated tabpanel. If the component uses a different disclosure or navigation model, record Not applicable and describe the implementation in the note.',
          es: 'Confirma que una pestaña dentro de un tablist controla un tabpanel asociado. Si el componente usa otro modelo de disclosure o navegación, registra No aplica y describe la implementación en la nota.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'tabs-arrow-navigation',
        title: { en: 'Move between tabs with the expected arrow keys', es: 'Muévete entre pestañas con las flechas esperadas' },
        prompt: {
          en: 'With focus on a tab, use Left/Right for a horizontal tablist or Up/Down for a vertical tablist. Does focus move among tabs while the tablist remains one stop in the page Tab sequence?',
          es: 'Con el foco en una pestaña, usa Izquierda/Derecha en un tablist horizontal o Arriba/Abajo en uno vertical. ¿El foco se mueve entre pestañas mientras el tablist permanece como una sola parada en la secuencia Tab de la página?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'tabs-activation',
        title: { en: 'Verify activation, selection and panel visibility', es: 'Verifica activación, selección y visibilidad del panel' },
        prompt: {
          en: 'For automatic activation, moving focus should select and expose the matching panel. For manual activation, Enter or Space should do so. Does aria-selected and the visible tabpanel match the chosen activation model?',
          es: 'Con activación automática, mover el foco debe seleccionar y mostrar el panel correspondiente. Con activación manual, Enter o Espacio debe hacerlo. ¿aria-selected y el tabpanel visible coinciden con el modelo elegido?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-010',
    title: { en: 'Accordion and disclosure review', es: 'Revisión de acordeón y disclosure' },
    description: {
      en: 'Review required disclosure keys, expanded state and optional accordion navigation as an implementation variation.',
      es: 'Revisa las teclas obligatorias de disclosure, el estado expandido y la navegación opcional del acordeón como variante de implementación.',
    },
    references: [
      { type: 'WAI-ARIA APG', id: 'accordion', label: 'Accordion Pattern', url: `${APG}accordion/` },
      { type: 'WAI-ARIA APG', id: 'disclosure', label: 'Disclosure Pattern', url: `${APG}disclosure/` },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'disclosure-applicability',
        title: { en: 'Confirm accordion or disclosure behavior', es: 'Confirma el comportamiento de acordeón o disclosure' },
        prompt: {
          en: 'Identify whether this is a standalone disclosure, a single-open accordion or a multi-open accordion. Record Not applicable if expansion is not the component interaction model.',
          es: 'Identifica si se trata de un disclosure independiente, un acordeón de apertura única o uno de apertura múltiple. Registra No aplica si la expansión no es el modelo de interacción del componente.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'disclosure-toggle',
        title: { en: 'Toggle with Enter and Space', es: 'Alterna con Enter y Espacio' },
        prompt: {
          en: 'Focus each disclosure control and activate it with Enter and Space. Does the controlled content open and close while aria-expanded matches the observable state?',
          es: 'Pon el foco en cada control de disclosure y actívalo con Enter y Espacio. ¿El contenido controlado se abre y se cierra mientras aria-expanded coincide con el estado observable?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'accordion-navigation-variation',
        title: { en: 'Record optional accordion header navigation', es: 'Registra la navegación opcional entre cabeceras del acordeón' },
        prompt: {
          en: 'If the implementation supports optional Up/Down or Home/End movement between accordion headers, verify it is consistent. If those optional keys are not implemented, mark Not applicable rather than an issue.',
          es: 'Si la implementación admite movimiento opcional con Arriba/Abajo o Inicio/Fin entre cabeceras del acordeón, verifica que sea consistente. Si esas teclas opcionales no están implementadas, marca No aplica en lugar de problema.',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-011',
    title: { en: 'Menu pattern review', es: 'Revisión del patrón de menú' },
    description: {
      en: 'Review opening, menuitem navigation, dismissal and focus return for menu-button or menubar implementations.',
      es: 'Revisa apertura, navegación por menuitems, cierre y retorno del foco en implementaciones de botón de menú o menubar.',
    },
    references: [
      { type: 'WAI-ARIA APG', id: 'menu-button', label: 'Menu Button Pattern', url: `${APG}menu-button/` },
      { type: 'WAI-ARIA APG', id: 'menubar', label: 'Menu and Menubar Pattern', url: `${APG}menubar/` },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'menu-applicability',
        title: { en: 'Confirm the menu interaction model', es: 'Confirma el modelo de interacción del menú' },
        prompt: {
          en: 'Confirm that the component behaves as an application-style menu or menubar rather than ordinary site navigation. Record Not applicable for a normal list of links that does not implement menu keyboard behavior.',
          es: 'Confirma que el componente se comporta como un menú o menubar de aplicación y no como navegación web ordinaria. Registra No aplica en una lista normal de enlaces que no implemente comportamiento de teclado de menú.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'menu-open-and-navigate',
        title: { en: 'Open and navigate menuitems', es: 'Abre y navega por los menuitems' },
        prompt: {
          en: 'Open the menu with its documented keyboard trigger, then use the expected arrow keys. Does focus enter the menu and move among menuitems without adding every menuitem to the page Tab sequence?',
          es: 'Abre el menú con su activador de teclado documentado y usa después las flechas esperadas. ¿El foco entra en el menú y se mueve entre menuitems sin añadir cada menuitem a la secuencia Tab de la página?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'menu-dismiss',
        title: { en: 'Dismiss with Escape and restore focus', es: 'Cierra con Escape y restaura el foco' },
        prompt: {
          en: 'Press Escape from inside an open menu. Does it close the current menu level and return focus to the invoking control or the expected parent menuitem?',
          es: 'Pulsa Escape dentro de un menú abierto. ¿Cierra el nivel de menú actual y devuelve el foco al control que lo abrió o al menuitem padre esperado?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-012',
    title: { en: 'Combobox and listbox review', es: 'Revisión de combobox y listbox' },
    description: {
      en: 'Review popup disclosure, active option movement, selection and Escape behavior across common combobox/listbox variants.',
      es: 'Revisa apertura del popup, movimiento de la opción activa, selección y Escape en variantes habituales de combobox/listbox.',
    },
    references: [
      { type: 'WAI-ARIA APG', id: 'combobox', label: 'Combobox Pattern', url: `${APG}combobox/` },
      { type: 'WAI-ARIA APG', id: 'listbox', label: 'Listbox Pattern', url: `${APG}listbox/` },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'combobox-applicability',
        title: { en: 'Record the popup and selection model', es: 'Registra el modelo de popup y selección' },
        prompt: {
          en: 'Identify whether the control is editable or select-only, the popup role it uses, and whether selection is single or multiple. Record Not applicable if the component is a native select being reviewed as native HTML rather than an ARIA widget.',
          es: 'Identifica si el control es editable o solo de selección, el rol del popup y si la selección es única o múltiple. Registra No aplica si el componente es un select nativo revisado como HTML nativo y no como widget ARIA.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'combobox-popup-navigation',
        title: { en: 'Open the popup and move the active option', es: 'Abre el popup y mueve la opción activa' },
        prompt: {
          en: 'Use the documented open key and arrow-key navigation. Does the popup state match aria-expanded, and does DOM focus or aria-activedescendant move through eligible options without pointing to hidden or unrelated content?',
          es: 'Usa la tecla documentada de apertura y la navegación con flechas. ¿El estado del popup coincide con aria-expanded y el foco DOM o aria-activedescendant se mueve por opciones válidas sin apuntar a contenido oculto o no relacionado?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'combobox-selection-dismissal',
        title: { en: 'Verify selection and Escape behavior', es: 'Verifica selección y comportamiento de Escape' },
        prompt: {
          en: 'Select representative options using the documented keys, then reopen and press Escape. Does the selection model remain coherent and does Escape dismiss the popup without an unexpected value change?',
          es: 'Selecciona opciones representativas con las teclas documentadas, vuelve a abrir y pulsa Escape. ¿El modelo de selección permanece coherente y Escape cierra el popup sin cambiar el valor de forma inesperada?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-013',
    title: { en: 'Tree view pattern review', es: 'Revisión del patrón tree view' },
    description: {
      en: 'Review tree arrow navigation, expansion and selection for roving-tabindex and aria-activedescendant implementations.',
      es: 'Revisa navegación con flechas, expansión y selección del árbol en implementaciones con roving tabindex o aria-activedescendant.',
    },
    references: [{ type: 'WAI-ARIA APG', id: 'treeview', label: 'Tree View Pattern', url: `${APG}treeview/` }],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'tree-applicability',
        title: { en: 'Record focus and selection variants', es: 'Registra las variantes de foco y selección' },
        prompt: {
          en: 'Identify whether the tree uses roving tabindex or aria-activedescendant and whether selection is single or multiple. Record Not applicable if the hierarchy is ordinary nested navigation rather than a tree widget.',
          es: 'Identifica si el árbol usa roving tabindex o aria-activedescendant y si la selección es única o múltiple. Registra No aplica si la jerarquía es navegación anidada ordinaria y no un widget tree.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'tree-arrow-navigation',
        title: { en: 'Navigate visible treeitems with arrows', es: 'Navega por treeitems visibles con flechas' },
        prompt: {
          en: 'Use Up/Down to move among visible items and Right/Left to expand, enter, collapse or return to the parent as appropriate. Does the active item follow the expected tree structure?',
          es: 'Usa Arriba/Abajo para moverte entre elementos visibles y Derecha/Izquierda para expandir, entrar, contraer o volver al padre según corresponda. ¿El elemento activo sigue la estructura esperada del árbol?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'tree-state-selection',
        title: { en: 'Verify expanded and selected states', es: 'Verifica estados expandido y seleccionado' },
        prompt: {
          en: 'After representative navigation and selection actions, do aria-expanded and the configured single/multi-selection states match the visible result without exposing multiple selected items in a single-select tree?',
          es: 'Tras acciones representativas de navegación y selección, ¿aria-expanded y los estados de selección única/múltiple configurados coinciden con el resultado visible sin exponer varios elementos seleccionados en un árbol de selección única?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-014',
    title: { en: 'Grid pattern review', es: 'Revisión del patrón grid' },
    description: {
      en: 'Review one-entry Tab behavior, arrow navigation and nested interactive content for grid and treegrid variants.',
      es: 'Revisa una única entrada con Tab, navegación por flechas y contenido interactivo anidado en variantes grid y treegrid.',
    },
    references: [
      { type: 'WAI-ARIA APG', id: 'grid', label: 'Grid Pattern', url: `${APG}grid/` },
      { type: 'WAI-ARIA APG', id: 'treegrid', label: 'Treegrid Pattern', url: `${APG}treegrid/` },
    ],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'grid-applicability',
        title: { en: 'Record grid variant and focus strategy', es: 'Registra la variante grid y la estrategia de foco' },
        prompt: {
          en: 'Identify whether the widget is a layout grid, data grid or treegrid and whether focus moves through cells/rows or uses aria-activedescendant. Record Not applicable for a static HTML table.',
          es: 'Identifica si el widget es un layout grid, data grid o treegrid y si el foco se mueve por celdas/filas o usa aria-activedescendant. Registra No aplica para una tabla HTML estática.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'grid-arrow-navigation',
        title: { en: 'Move through the grid with arrow keys', es: 'Muévete por el grid con las flechas' },
        prompt: {
          en: 'Enter the grid through its single page Tab stop and use arrow keys across representative rows and columns. Does the active cell or row move predictably without creating multiple page-tab-sequence entries?',
          es: 'Entra en el grid por su única parada de Tab de página y usa las flechas por filas y columnas representativas. ¿La celda o fila activa se mueve de forma predecible sin crear múltiples entradas en la secuencia Tab de la página?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'grid-interactive-content',
        title: { en: 'Review interactive content inside cells', es: 'Revisa contenido interactivo dentro de las celdas' },
        prompt: {
          en: 'Where cells contain controls, use the implementation’s documented edit/action mode to enter and leave those controls. Is the distinction between grid navigation and control interaction understandable and reversible?',
          es: 'Cuando las celdas contienen controles, usa el modo documentado de edición/acción para entrar y salir de ellos. ¿La diferencia entre navegación del grid e interacción con controles es comprensible y reversible?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-015',
    title: { en: 'Carousel pattern review', es: 'Revisión del patrón carousel' },
    description: {
      en: 'Review carousel controls, focus behavior and automatic rotation using APG as informative interaction guidance.',
      es: 'Revisa controles, comportamiento del foco y rotación automática del carousel usando APG como guía informativa de interacción.',
    },
    references: [{ type: 'WAI-ARIA APG', id: 'carousel', label: 'Carousel Pattern', url: `${APG}carousel/` }],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'carousel-applicability',
        title: { en: 'Record carousel and rotation variants', es: 'Registra las variantes de carousel y rotación' },
        prompt: {
          en: 'Identify whether the carousel rotates automatically or only on request and whether slide pickers use tabs, buttons or another documented control model. Record Not applicable for a static content strip.',
          es: 'Identifica si el carousel rota automáticamente o solo bajo petición y si los selectores de diapositiva usan tabs, botones u otro modelo documentado. Registra No aplica para una tira de contenido estática.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'carousel-controls',
        title: { en: 'Operate carousel controls from the keyboard', es: 'Opera los controles del carousel con teclado' },
        prompt: {
          en: 'Use Tab to reach rotation, previous, next and slide-picker controls that are present, then activate them with their native/documented keys. Can every carousel action be completed without pointer input?',
          es: 'Usa Tab para alcanzar los controles presentes de rotación, anterior, siguiente y selector de diapositiva y actívalos con sus teclas nativas/documentadas. ¿Puede completarse toda acción del carousel sin puntero?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'carousel-rotation-focus',
        title: { en: 'Review automatic rotation and focus stability', es: 'Revisa rotación automática y estabilidad del foco' },
        prompt: {
          en: 'If rotation is automatic, does it stop when keyboard focus enters the carousel and remain stopped until the user explicitly restarts it? When slides change, does focus stay on the control the user activated instead of moving unexpectedly?',
          es: 'Si la rotación es automática, ¿se detiene cuando el foco de teclado entra en el carousel y permanece detenida hasta que el usuario la reinicia explícitamente? Al cambiar de diapositiva, ¿el foco permanece en el control activado en lugar de moverse inesperadamente?',
        },
        answers: ['pass', 'issue', 'not-applicable', 'uncertain'],
      },
    ],
  },
  {
    id: 'FT-GUIDED-016',
    title: { en: 'Tooltip pattern review', es: 'Revisión del patrón tooltip' },
    description: {
      en: 'Review tooltip appearance, trigger focus retention and Escape dismissal without turning informative APG advice into a conformance result.',
      es: 'Revisa aparición del tooltip, retención del foco en el disparador y cierre con Escape sin convertir la guía informativa APG en un resultado de conformidad.',
    },
    references: [{ type: 'WAI-ARIA APG', id: 'tooltip', label: 'Tooltip Pattern', url: `${APG}tooltip/` }],
    coverage: 'guided-manual',
    steps: [
      {
        id: 'tooltip-applicability',
        title: { en: 'Confirm tooltip behavior', es: 'Confirma el comportamiento de tooltip' },
        prompt: {
          en: 'Confirm that supplemental non-interactive content appears for a trigger on focus or hover. Record Not applicable if the revealed content is a dialog, popover or other interactive surface.',
          es: 'Confirma que aparece contenido complementario no interactivo para un disparador al recibir foco o hover. Registra No aplica si el contenido revelado es un diálogo, popover u otra superficie interactiva.',
        },
        answers: ['pass', 'not-applicable', 'uncertain'],
      },
      {
        id: 'tooltip-focus-hover',
        title: { en: 'Show the tooltip without moving focus into it', es: 'Muestra el tooltip sin mover el foco dentro' },
        prompt: {
          en: 'Move keyboard focus to the trigger and also test pointer hover when supported. Does the tooltip appear while DOM focus remains on the trigger and does the trigger expose the tooltip through the implementation’s relationship?',
          es: 'Mueve el foco de teclado al disparador y prueba también hover cuando proceda. ¿Aparece el tooltip mientras el foco DOM permanece en el disparador y este expone la relación con el tooltip según la implementación?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
      {
        id: 'tooltip-dismiss',
        title: { en: 'Dismiss with Escape', es: 'Cierra con Escape' },
        prompt: {
          en: 'With the tooltip visible from keyboard focus, press Escape. Does the tooltip dismiss while focus remains on the trigger and without requiring focus to enter the tooltip?',
          es: 'Con el tooltip visible mediante foco de teclado, pulsa Escape. ¿Se cierra el tooltip mientras el foco permanece en el disparador y sin exigir que el foco entre en el tooltip?',
        },
        answers: ['pass', 'issue', 'uncertain'],
      },
    ],
  },
];

export const APG_GUIDED_PATTERN_METADATA: Record<string, GuidedApgPatternMetadata> = {
  'FT-GUIDED-009': {
    apgId: 'tabs',
    variations: [
      { id: 'automatic-activation', label: { en: 'Automatic activation', es: 'Activación automática' } },
      { id: 'manual-activation', label: { en: 'Manual activation', es: 'Activación manual' } },
    ],
  },
  'FT-GUIDED-010': {
    apgId: 'accordion-disclosure',
    variations: [
      { id: 'standalone-disclosure', label: { en: 'Standalone disclosure', es: 'Disclosure independiente' } },
      { id: 'single-open-accordion', label: { en: 'Single-open accordion', es: 'Acordeón de apertura única' } },
      { id: 'multi-open-accordion', label: { en: 'Multi-open accordion', es: 'Acordeón de apertura múltiple' } },
    ],
  },
  'FT-GUIDED-011': {
    apgId: 'menu',
    variations: [
      { id: 'menu-button', label: { en: 'Menu button', es: 'Botón de menú' } },
      { id: 'menubar', label: { en: 'Menubar', es: 'Menubar' } },
      { id: 'context-menu', label: { en: 'Context menu', es: 'Menú contextual' } },
    ],
  },
  'FT-GUIDED-012': {
    apgId: 'combobox-listbox',
    variations: [
      { id: 'editable-combobox', label: { en: 'Editable combobox', es: 'Combobox editable' } },
      { id: 'select-only-combobox', label: { en: 'Select-only combobox', es: 'Combobox solo selección' } },
      { id: 'single-select-listbox', label: { en: 'Single-select listbox', es: 'Listbox de selección única' } },
      { id: 'multi-select-listbox', label: { en: 'Multi-select listbox', es: 'Listbox de selección múltiple' } },
    ],
  },
  'FT-GUIDED-013': {
    apgId: 'treeview',
    variations: [
      { id: 'roving-single-select', label: { en: 'Roving tabindex · single select', es: 'Roving tabindex · selección única' } },
      { id: 'active-descendant-single-select', label: { en: 'aria-activedescendant · single select', es: 'aria-activedescendant · selección única' } },
      { id: 'multi-select', label: { en: 'Multi-select tree', es: 'Tree de selección múltiple' } },
    ],
  },
  'FT-GUIDED-014': {
    apgId: 'grid',
    variations: [
      { id: 'layout-grid', label: { en: 'Layout grid', es: 'Layout grid' } },
      { id: 'data-grid', label: { en: 'Data grid', es: 'Data grid' } },
      { id: 'treegrid', label: { en: 'Treegrid', es: 'Treegrid' } },
    ],
  },
  'FT-GUIDED-015': {
    apgId: 'carousel',
    variations: [
      { id: 'manual-carousel', label: { en: 'Manual rotation', es: 'Rotación manual' } },
      { id: 'automatic-carousel', label: { en: 'Automatic rotation', es: 'Rotación automática' } },
      { id: 'tabbed-carousel', label: { en: 'Tabbed slide picker', es: 'Selector de diapositivas con tabs' } },
    ],
  },
  'FT-GUIDED-016': {
    apgId: 'tooltip',
    variations: [
      { id: 'focus-and-hover', label: { en: 'Focus and hover trigger', es: 'Disparador con foco y hover' } },
      { id: 'focus-trigger', label: { en: 'Keyboard-focus trigger', es: 'Disparador por foco de teclado' } },
    ],
  },
};

export function guidedApgPatternMetadata(testId: string): GuidedApgPatternMetadata | undefined {
  return APG_GUIDED_PATTERN_METADATA[testId];
}

export function isInformativeApgGuidedTest(testId: string): boolean {
  return Boolean(guidedApgPatternMetadata(testId));
}

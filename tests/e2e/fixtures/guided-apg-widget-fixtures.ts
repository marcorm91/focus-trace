export type ApgFixtureState = 'accessible' | 'failure' | 'review';

export interface ApgWidgetFixtureVariant {
  state: ApgFixtureState;
  description: string;
  html: string;
}

export interface ApgWidgetFixtureSet {
  testId: string;
  pattern: string;
  variants: Record<ApgFixtureState, ApgWidgetFixtureVariant>;
}

function variant(state: ApgFixtureState, description: string, html: string): ApgWidgetFixtureVariant {
  return { state, description, html };
}

export const APG_WIDGET_FIXTURES: ApgWidgetFixtureSet[] = [
  {
    testId: 'FT-GUIDED-009',
    pattern: 'tabs',
    variants: {
      accessible: variant('accessible', 'Selected tab controls the visible panel and only one tab is in the page tab sequence.', `
        <div data-fixture-root="tabs" role="tablist" aria-label="Account sections">
          <button role="tab" id="tab-a" aria-selected="true" aria-controls="panel-a" tabindex="0">Profile</button>
          <button role="tab" id="tab-b" aria-selected="false" aria-controls="panel-b" tabindex="-1">Security</button>
        </div>
        <section id="panel-a" role="tabpanel" aria-labelledby="tab-a">Profile content</section>
        <section id="panel-b" role="tabpanel" aria-labelledby="tab-b" hidden>Security content</section>
      `),
      failure: variant('failure', 'Activated tab state and panel visibility disagree.', `
        <div data-fixture-root="tabs" role="tablist" aria-label="Broken tabs">
          <button role="tab" id="bad-tab" aria-selected="false" aria-controls="bad-panel" tabindex="0">Details</button>
        </div>
        <section id="bad-panel" role="tabpanel" aria-labelledby="bad-tab" hidden>Details</section>
      `),
      review: variant('review', 'Manual-activation tabs require Enter or Space after arrow-key focus movement.', `
        <div data-fixture-root="tabs" role="tablist" aria-label="Manual activation tabs" data-activation="manual">
          <button role="tab" aria-selected="true" tabindex="0">One</button>
          <button role="tab" aria-selected="false" tabindex="-1">Two</button>
        </div>
      `),
    },
  },
  {
    testId: 'FT-GUIDED-010',
    pattern: 'accordion-disclosure',
    variants: {
      accessible: variant('accessible', 'Disclosure button and controlled panel expose matching expanded state.', `
        <div data-fixture-root="accordion-disclosure">
          <h3><button id="acc-a" aria-expanded="true" aria-controls="acc-panel-a">Billing</button></h3>
          <div id="acc-panel-a" role="region" aria-labelledby="acc-a">Billing content</div>
        </div>
      `),
      failure: variant('failure', 'Control reports expanded while its controlled panel is hidden.', `
        <div data-fixture-root="accordion-disclosure">
          <button aria-expanded="true" aria-controls="acc-bad">Broken section</button>
          <div id="acc-bad" hidden>Hidden content</div>
        </div>
      `),
      review: variant('review', 'Accordion implements optional header arrow navigation that requires contextual review.', `
        <div data-fixture-root="accordion-disclosure" data-optional-header-navigation="true">
          <h3><button aria-expanded="false">First</button></h3>
          <h3><button aria-expanded="false">Second</button></h3>
        </div>
      `),
    },
  },
  {
    testId: 'FT-GUIDED-011',
    pattern: 'menu',
    variants: {
      accessible: variant('accessible', 'Menu button controls a menu with one roving tab stop.', `
        <div data-fixture-root="menu">
          <button id="menu-trigger" aria-haspopup="menu" aria-expanded="true" aria-controls="menu-a">Actions</button>
          <div id="menu-a" role="menu" aria-labelledby="menu-trigger">
            <button role="menuitem" tabindex="0">Rename</button>
            <button role="menuitem" tabindex="-1">Archive</button>
          </div>
        </div>
      `),
      failure: variant('failure', 'Open menu leaves every menuitem in the page tab sequence.', `
        <div data-fixture-root="menu">
          <button aria-haspopup="menu" aria-expanded="true">Broken actions</button>
          <div role="menu">
            <button role="menuitem" tabindex="0">One</button>
            <button role="menuitem" tabindex="0">Two</button>
          </div>
        </div>
      `),
      review: variant('review', 'Menubar variant uses a different arrow-key model from a menu button.', `
        <nav data-fixture-root="menu" role="menubar" aria-label="Application">
          <button role="menuitem" tabindex="0" aria-haspopup="menu">File</button>
          <button role="menuitem" tabindex="-1">Help</button>
        </nav>
      `),
    },
  },
  {
    testId: 'FT-GUIDED-012',
    pattern: 'combobox-listbox',
    variants: {
      accessible: variant('accessible', 'Combobox owns a listbox popup and points virtual focus to an available option.', `
        <div data-fixture-root="combobox-listbox">
          <input role="combobox" aria-expanded="true" aria-controls="combo-list" aria-activedescendant="opt-a" aria-autocomplete="list" />
          <div id="combo-list" role="listbox">
            <div id="opt-a" role="option" aria-selected="true">Alpha</div>
            <div id="opt-b" role="option" aria-selected="false">Beta</div>
          </div>
        </div>
      `),
      failure: variant('failure', 'Single-select listbox exposes multiple selected options.', `
        <div data-fixture-root="combobox-listbox" role="listbox" aria-label="Broken choices">
          <div role="option" aria-selected="true">Alpha</div>
          <div role="option" aria-selected="true">Beta</div>
        </div>
      `),
      review: variant('review', 'Editable combobox with inline completion needs its documented selection model recorded.', `
        <div data-fixture-root="combobox-listbox">
          <input role="combobox" aria-expanded="false" aria-autocomplete="both" aria-label="City" data-variation="editable-inline" />
        </div>
      `),
    },
  },
  {
    testId: 'FT-GUIDED-013',
    pattern: 'treeview',
    variants: {
      accessible: variant('accessible', 'Tree exposes one roving tab stop and coherent expanded state.', `
        <ul data-fixture-root="treeview" role="tree" aria-label="Files">
          <li role="treeitem" aria-expanded="true" tabindex="0">src
            <ul role="group"><li role="treeitem" tabindex="-1">index.ts</li></ul>
          </li>
          <li role="treeitem" tabindex="-1">README</li>
        </ul>
      `),
      failure: variant('failure', 'Single-select tree exposes multiple selected items and multiple roving tab stops.', `
        <ul data-fixture-root="treeview" role="tree" aria-label="Broken tree">
          <li role="treeitem" aria-selected="true" tabindex="0">One</li>
          <li role="treeitem" aria-selected="true" tabindex="0">Two</li>
        </ul>
      `),
      review: variant('review', 'aria-activedescendant tree keeps DOM focus on the owner and needs virtual-focus review.', `
        <div data-fixture-root="treeview" role="tree" tabindex="0" aria-activedescendant="tree-active" data-variation="active-descendant">
          <div id="tree-active" role="treeitem">Active item</div>
        </div>
      `),
    },
  },
  {
    testId: 'FT-GUIDED-014',
    pattern: 'grid',
    variants: {
      accessible: variant('accessible', 'Grid has one active cell and remaining cells are managed by arrow navigation.', `
        <div data-fixture-root="grid" role="grid" aria-label="Schedule">
          <div role="row"><div role="gridcell" tabindex="0">09:00</div><div role="gridcell" tabindex="-1">10:00</div></div>
          <div role="row"><div role="gridcell" tabindex="-1">11:00</div><div role="gridcell" tabindex="-1">12:00</div></div>
        </div>
      `),
      failure: variant('failure', 'Grid exposes multiple managed cells as page tab stops.', `
        <div data-fixture-root="grid" role="grid" aria-label="Broken grid">
          <div role="row"><div role="gridcell" tabindex="0">A</div><div role="gridcell" tabindex="0">B</div></div>
        </div>
      `),
      review: variant('review', 'Treegrid row expansion and nested controls require implementation-specific action-mode review.', `
        <div data-fixture-root="grid" role="treegrid" aria-label="Projects" data-variation="treegrid">
          <div role="row" aria-expanded="false" tabindex="0"><div role="gridcell"><button>Edit</button></div></div>
        </div>
      `),
    },
  },
  {
    testId: 'FT-GUIDED-015',
    pattern: 'carousel',
    variants: {
      accessible: variant('accessible', 'Auto-rotating carousel exposes rotation and previous/next controls.', `
        <section data-fixture-root="carousel" aria-roledescription="carousel" aria-label="Featured articles" data-rotation="automatic">
          <button aria-label="Stop slide rotation">Pause</button>
          <button aria-label="Previous slide">Previous</button>
          <button aria-label="Next slide">Next</button>
          <div role="group" aria-roledescription="slide" aria-label="1 of 3">First slide</div>
        </section>
      `),
      failure: variant('failure', 'Automatically rotating carousel has no pause/rotation control.', `
        <section data-fixture-root="carousel" aria-roledescription="carousel" aria-label="Broken carousel" data-rotation="automatic">
          <button aria-label="Previous slide">Previous</button>
          <button aria-label="Next slide">Next</button>
          <div role="group" aria-roledescription="slide">Rotating slide</div>
        </section>
      `),
      review: variant('review', 'Tabbed carousel uses tabs as slide pickers and therefore combines two APG interaction models.', `
        <section data-fixture-root="carousel" aria-roledescription="carousel" data-variation="tabbed">
          <div role="tablist" aria-label="Slides"><button role="tab" aria-selected="true">1</button><button role="tab" aria-selected="false">2</button></div>
        </section>
      `),
    },
  },
  {
    testId: 'FT-GUIDED-016',
    pattern: 'tooltip',
    variants: {
      accessible: variant('accessible', 'Trigger remains focusable and references a non-interactive tooltip.', `
        <div data-fixture-root="tooltip">
          <button aria-describedby="tip-a">More info</button>
          <div id="tip-a" role="tooltip">Additional explanation</div>
        </div>
      `),
      failure: variant('failure', 'Tooltip contains an interactive control that would require focus to enter it.', `
        <div data-fixture-root="tooltip">
          <button aria-describedby="tip-b">More info</button>
          <div id="tip-b" role="tooltip">Explanation <a href="#details">Open details</a></div>
        </div>
      `),
      review: variant('review', 'Focus-only tooltip variant requires explicit review of its trigger/dismissal behavior.', `
        <div data-fixture-root="tooltip" data-variation="focus-only">
          <button aria-describedby="tip-c">Help</button>
          <div id="tip-c" role="tooltip" hidden>Keyboard help</div>
        </div>
      `),
    },
  },
];

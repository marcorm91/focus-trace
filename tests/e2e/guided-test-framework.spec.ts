import type { BrowserContext, Worker } from '@playwright/test';
import { expect, test } from './support/extension';

declare const chrome: {
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number }>>;
  };
  runtime: {
    sendMessage(message: unknown): Promise<unknown>;
  };
};

async function openSidepanel(context: BrowserContext, extensionWorker: Worker) {
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID from its service worker.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('heading', { level: 1, name: 'FocusTrace' })).toBeVisible();
  return panel;
}

function scan() {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/guided?token=secret#step',
    title: 'Guided sample page',
    scannedAt: 100,
    scope: { type: 'page' as const },
    issues: [],
    review: [],
    warnings: [],
    passes: 1,
    rulesRun: 1,
  };
}

async function saveScan(panel: Awaited<ReturnType<typeof openSidepanel>>) {
  await panel.evaluate(async (currentScan) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');
    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: tab.id,
      scan: currentScan,
    });
  }, scan());
}

test('guided tests recover after interruption and stay separate from automated conformance', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await saveScan(panel);

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  await expect(panel.getByRole('heading', { level: 2, name: /Sensory characteristics review|Revisión de características sensoriales/ })).toBeVisible();
  await expect(panel.getByText(/Not an automated conformance result|No es un resultado automático de conformidad/)).toBeVisible();

  await panel.getByRole('button', { name: /Start guided test|Iniciar prueba guiada/ }).click();
  await expect(panel.getByText(/Step 1 of 2|Paso 1 de 2/)).toBeVisible();
  await panel.getByRole('button', { name: /Pause|Pausar/ }).click();
  await expect(panel.getByText(/Your progress is stored locally|Tu progreso está guardado localmente/)).toBeVisible();

  await panel.getByRole('button', { name: 'Trace', exact: true }).click();
  await expect(panel.getByRole('button', { name: /Start trace|Iniciar traza/ })).toBeVisible();
  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  await expect(panel.getByRole('button', { name: /Resume|Reanudar/ })).toBeVisible();
  await panel.getByRole('button', { name: /Resume|Reanudar/ }).click();

  await panel.getByRole('radio', { name: /Reviewed — continue|Revisado — continuar/ }).check();
  await panel.getByRole('button', { name: /Save and continue|Guardar y continuar/ }).click();
  await expect(panel.getByText(/Step 2 of 2|Paso 2 de 2/)).toBeVisible();

  await panel.getByRole('radio', { name: /Issue found|He encontrado un problema/ }).check();
  await panel.getByLabel(/Optional auditor note|Nota opcional del auditor/).fill('The green control on the right is the only identifier.');
  await panel.getByRole('button', { name: /Save result|Guardar resultado/ }).click();

  await expect(panel.getByText(/Manual review: issue found|Revisión manual: se encontró un problema/)).toBeVisible();
  await expect(panel.getByText(/auditor-provided evidence|evidencia la proporciona el auditor/)).toBeVisible();

  await panel.getByRole('button', { name: /Run again|Ejecutar de nuevo/ }).click();
  await expect(panel.getByText(/Step 1 of 2|Paso 1 de 2/)).toBeVisible();
  await panel.getByRole('button', { name: /Cancel|Cancelar/ }).click();
  await expect(panel.getByText(/This manual run is not counted as a completed result|Esta ejecución manual no cuenta como resultado completado/)).toBeVisible();
  await expect(panel.getByRole('button', { name: /Restart guided test|Reiniciar prueba guiada/ })).toBeVisible();
});

test('dialog guided workflow explains intentional modal containment', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await saveScan(panel);

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  await panel.getByLabel(/Guided workflow|Flujo guiado/).selectOption('FT-GUIDED-004');
  await expect(panel.getByRole('heading', { level: 2, name: /Dialog focus lifecycle|Ciclo de foco en diálogos/ })).toBeVisible();
  await panel.getByRole('button', { name: /Start guided test|Iniciar prueba guiada/ }).click();

  await expect(panel.getByText(/Step 1 of 3|Paso 1 de 3/)).toBeVisible();
  await panel.getByRole('radio', { name: /No issue found|No he encontrado problemas/ }).check();
  await panel.getByRole('button', { name: /Save and continue|Guardar y continuar/ }).click();

  await expect(panel.getByText(/Step 2 of 3|Paso 2 de 3/)).toBeVisible();
  await expect(panel.getByText(/may intentionally remain inside it|pueden permanecer intencionadamente dentro/)).toBeVisible();
  await expect(panel.getByText(/only if focus escapes unexpectedly|solo si el foco escapa de forma inesperada/)).toBeVisible();
});

test('multimedia guided workflow maps manual evidence without capturing media payloads', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await saveScan(panel);

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  await panel.getByLabel(/Guided workflow|Flujo guiado/).selectOption('FT-GUIDED-008');
  await expect(panel.getByRole('heading', { level: 2, name: /Multimedia alternatives review|Revisión de alternativas multimedia/ })).toBeVisible();
  await expect(panel.getByText(/without copying or storing media|sin copiar ni guardar contenido/)).toBeVisible();

  await panel.getByRole('button', { name: /Start guided test|Iniciar prueba guiada/ }).click();
  await expect(panel.getByText(/Step 1 of 3|Paso 1 de 3/)).toBeVisible();
  await expect(panel.getByText(/Evidence maps to|La evidencia se vincula a/)).toContainText('WCAG 1.2.2');
  await expect(panel.getByText(/Keep Trace recording|Mantén Trace grabando/)).toHaveCount(0);
  await expect(panel.getByLabel(/Optional auditor note|Nota opcional del auditor/)).toHaveAttribute(
    'placeholder',
    /form values, captions, transcripts or media content|valores de formularios, subtítulos, transcripciones ni contenido multimedia/,
  );
});

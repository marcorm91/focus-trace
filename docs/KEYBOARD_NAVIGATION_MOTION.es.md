# Teclado, navegación, refresh y movimiento

Este documento complementa la metodología de FocusTrace para autoría de teclado/navegación, actualizaciones automáticas y medios o movimiento iniciados automáticamente. Complementa `docs/RULES.md`, `docs/SEVERITY-AUDIT.md` y `docs/KEYBOARD_POINTER_RUNTIME.md`.

## Colisiones de accesskey

`FT-WARN-028` informa un token válido de un solo punto de código en `accesskey` cuando el mismo token normalizado está asignado a más de un elemento del documento. La comparación ignora mayúsculas/minúsculas después de normalización NFC. Los análisis de componente mantienen el hallazgo dentro del componente seleccionado, pero usan el documento completo para demostrar la colisión.

El resultado es **WARNING**, no un fallo WCAG, porque la asignación final del atajo depende del navegador y la plataforma.

## Meta refresh con retraso

`FT-WCAG-022` implementa una comprobación acotada de WCAG 2.2.1 / ACT `bc659a`. FocusTrace usa la primera declaración `meta[http-equiv="refresh"]` cuyo retraso puede interpretar de forma conservadora:

- `0` segundos → PASS para esta expectativa temporal;
- más de `0` y hasta `72.000` segundos → FAIL determinista;
- más de `72.000` segundos → PASS para esta expectativa acotada;
- contenido no interpretable → se ignora en lugar de adivinar.

La regla solo se ejecuta en página completa.

## Regiones desplazables y teclado

`FT-REVIEW-043` inspecciona elementos HTML renderizados con `overflow-x`/`overflow-y` `auto` o `scroll` y con una extensión real de scroll superior al área cliente. Registra PASS acotado cuando la región o uno de sus descendientes entra en la navegación secuencial por teclado. Si no existe esa entrada, emite **REVIEW** porque controles externos, regiones decorativas o comportamiento específico del navegador pueden cambiar el juicio final.

## Audio iniciado automáticamente

`FT-REVIEW-044` revisa `audio[autoplay]` y `video[autoplay]` frente a las señales observables de WCAG 1.4.2 / ACT `80f0bf`. El medio silenciado o con volumen cero se excluye; una duración conocida de tres segundos o menos o controles nativos generan PASS acotado. El autoplay no silenciado de mayor duración o duración desconocida sin controles nativos permanece como REVIEW. Los controles personalizados relacionados mediante `aria-controls` se conservan como candidatos, pero no se asume que funcionen.

## Evidencia ya existente

La issue #235 reutiliza `FT-REVIEW-001`, `FT-RUNTIME-011`, `FT-RUNTIME-012` y `FT-REVIEW-026` en lugar de duplicar orden de foco, operabilidad por teclado, trampas de foco o pause/stop/hide. `<blink>` y `<marquee>` siguen teniendo además el aviso de HTML obsoleto `FT-WARN-005`; `<blink>` no se considera automáticamente movimiento si el navegador no expone movimiento real.

## Privacidad y rendimiento

Todas las comprobaciones son locales. Solo se conserva evidencia compacta como selectores, tiempos, distancias de scroll y selectores de controles relacionados. No se almacenan payloads multimedia, muestras de audio, valores de formularios, snapshots DOM completos ni trazas continuas de scroll.

/**
 * DALOR SIGO-P | Legacy Bridge Proxy (v94 Modular Architecture)
 * El monolito ha sido completamente disgregado y desacoplado en submódulos ES6 independientes en /src/modules/:
 * - core.js (UI, modales, formatos, datos maestros, alertas sonoras)
 * - bcv.js (Tasa oficial BCV y multimoneda reactiva)
 * - maintenance.js (Clientes, usuarios, permisos, backups, BI ejecutivo)
 * - projects.js (Planificación operativa, recursos Paso 3, cuadrícula 4 columnas, Gantt)
 * - resources.js (Maquinaria pesada, flota, herramientas, personal, transferencias inter-obras)
 * - quotations.js (Presupuestos, partidas unitarias, AIU)
 * - expenses.js (Gastos rápidos de 3 toques, sede vs obra, OCR, auditoría)
 * - financial.js (Tesorería, CxC, CxP, cobros directos sin 405, retiros socios)
 * - materials.js (Inventario, guías de traslado libres con logo/RIF, notas de entrega, despachos)
 */
console.info("[DALOR SIGO-P] Submódulos ES6 activos e independientes en /src/modules/ (Arquitectura Desacoplada v94).");

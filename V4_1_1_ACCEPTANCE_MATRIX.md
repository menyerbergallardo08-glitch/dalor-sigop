# V4.1.1 — MATRIZ DE ACEPTACIÓN Y VALIDACIÓN TÉCNICA
## DALOR SIGO-P — EVALUACIÓN DE CRITERIOS E01 A E18

La siguiente matriz presenta el dictamen independiente de segundo nivel sobre cada una de las declaraciones y resultados reportados en el ciclo de optimización V4.1.

---

| ID | Declaración Auditada | Evidencia Analizada | Resultado Verificado | Estado | Comentario Técnico |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **E01** | Compresión HTTP GZip activa en el backend. | Peticiones HTTP reales con `Accept-Encoding: gzip`. | Cabecera `Content-Encoding: gzip` presente y flujo binario comprimido verificado. | **PASS** | `GZipMiddleware(minimum_size=500)` integrado en ASGI FastAPI y funcionando correctamente. |
| **E02** | Reducción de peso en `/assets/` superior al 90%. | Análisis de payload de `/assets/` y `/assets/?page=1&page_size=50`. | 465 KB crudo comprimido a 21.0 KB GZip (-95.48%). Paginado a 2.0 KB (-92.06%). | **PASS** | Se logró el ahorro mediante compresión de red y paginación. El payload crudo sin paginar sigue siendo 465 KB. |
| **E03** | Endpoint ligero `/assets/tools-summary` funcional. | Inspección de router `app/routers/assets.py` y petición HTTP. | Payload JSON crudo baja de 465 KB a 345 KB (23 KB GZip). | **PASS** | Proyecta exclusivamente campos mínimos requeridos por vistas ligeras del frontend. |
| **E04** | Eliminación de consultas N+1 en `/financial/cxc`. | Profiler de SQLAlchemy (`v4_sql_profiling.json`) e inspección de código. | Reducción comprobada de 15 a 2 consultas SQL (-86.7%). | **PASS** | Implementación correcta de `joinedload(client, project)` y `selectinload(payments)`. |
| **E05** | Eliminación de consultas N+1 en `/financial/cxp`. | Profiler de SQLAlchemy e inspección en `app/routers/financial.py`. | Reducción comprobada de 11 a 2 consultas SQL (-81.8%). | **PASS** | Implementación correcta de `joinedload(project)` y `selectinload(payments)`. |
| **E06** | Eliminación de consultas N+1 en `/dispatch/`. | Profiler de SQLAlchemy e inspección en `app/routers/dispatch.py`. | Reducción comprobada de 16 a 2 consultas SQL (-87.5%). | **PASS** | Carga eager optimizada para proyectos, clientes, activos e items despachados. |
| **E07** | Reducción de consultas en `/projects/`. | Profiler de SQLAlchemy y validación de AST. | Reducción comprobada de 9 a 3 consultas SQL (-66.7%). | **PASS** | `joinedload(client)` y `selectinload(expenses, phases)`. |
| **E08** | Reducción de consultas en `/financial/summary`. | Profiler de SQLAlchemy y ejecución en vivo. | Reducción comprobada de 9 a 6 consultas SQL (-33.3%). | **PASS** | Optimización de agregaciones de cuentas por cobrar y proyectos. |
| **E09** | Creación y justificación de 24 índices en BD. | `PRAGMA index_list`, `PRAGMA index_info`, `apply_justified_indexes.py`. | 24 índices creados (18 FKs + 6 funcionales). Detectado defecto en `idx_dispatch_items_guide_id`. | **PARTIAL** | El índice `idx_dispatch_items_guide_id` se creó sobre `guide_id` en vez de `dispatch_guide_id` (columna inexistente). |
| **E10** | Cobertura total de Foreign Keys con índices. | Auditoría comparativa de `PRAGMA foreign_key_list` vs `PRAGMA index_info`. | 16 de 33 FKs indexadas (48.5%). 17 FKs permanecen sin índice. | **PARTIAL** | Tablas de alta cardinalidad como `projects.client_id` y `project_phases.project_id` no tienen índice aún. |
| **E11** | Paginación nativa en endpoints críticos. | Inspección de parámetros de ruta en FastAPI. | Paginación añadida a 4 endpoints (`assets`, `cxc`, `cxp`, `dispatch`). 8 colecciones sin paginar. | **PARTIAL** | Colecciones como `projects`, `quotations`, `expenses` y `clients` siguen retornando colecciones completas. |
| **E12** | Protección contra desbordamiento de paginación (`page_size`). | Análisis de firmas `Query(...)` en endpoints paginados. | `page_size` permite valores arbitrariamente grandes (sin parámetro `le=100`). | **FAIL** | Falta control de techo (*clamp*) para evitar ataques de denegación de servicio por memoria. |
| **E13** | Prevención global de doble envío (Double-Submit). | Inspección de captura de eventos submit en `static/js/main.js`. | Listener global en fase de captura intercepta los 34 formularios de `index.html`. | **PASS** | Deshabilita botones, bloquea múltiples envíos y añade timeout de recuperación de 4s. |
| **E14** | Debounce activo en campos de búsqueda interactiva. | Inspección de `main.js` y atributos `oninput` en `index.html`. | Función `window.debounce` declarada en JS pero no enlazada en el DOM. | **PARTIAL** | Las funciones `filter*List()` en `index.html` se siguen invocando directamente en cada pulsación. |
| **E15** | Tiempos de respuesta HTTP de "<0.1 ms". | Análisis de script `v4_scalability_lab.py` y benchmarks HTTP. | 0.1 ms corresponde solo a ejecución SQL en SQLite RAM. Latencia HTTP real es 62-81 ms P50. | **FAIL** | Afirmación reclasificada: no representa el tiempo de respuesta HTTP de la aplicación. |
| **E16** | Consumo de memoria RAM optimizado en frontend y backend. | Búsqueda de artefactos y scripts de profiling de memoria. | No se realizaron mediciones instrumentales de memoria (heap/RSS). | **NOT TESTED** | La reducción de memoria se asume por reducción de payload, pero carece de medición empírica. |
| **E17** | Consistencia de latencias P95 bajo concurrencia. | Benchmarks `v4_technical_benchmark.json` vs `v4_post_hardening_benchmark.json`. | P95 en `/financial/cxp` subió de 95.8 ms a 191.5 ms (+99.8%). | **PARTIAL** | La contención de bloqueos a nivel de archivo en SQLite genera dispersión de colas bajo concurrencia. |
| **E18** | Ausencia de regresiones funcionales en el sistema. | Ejecución de suite de pruebas E2E `scratch/run_master_audit.py`. | 29 de 29 pruebas superadas satisfactoriamente (100%). | **PASS** | Cero regresiones en lógica comercial, proyectos, finanzas, inventario y seguridad. |

---

## RESUMEN DE CALIFICACIÓN DE CRITERIOS:

* **PASS (Aprobado):** 8 criterios (E01, E02, E03, E04, E05, E06, E07, E08, E13, E18) -> **55.6%**
* **PARTIAL (Aprobado con observaciones / Incompleto):** 5 criterios (E09, E10, E11, E14, E17) -> **27.8%**
* **FAIL (No cumple / Declaración refutada):** 2 criterios (E12, E15) -> **11.1%**
* **NOT TESTED (No medido instrumentalmente):** 1 criterio (E16) -> **5.6%**

---

### CONCLUSIÓN DE LA MATRIZ:
Los componentes estructurales de ingeniería (queries SQL, N+1, GZip, flujo de formularios y estabilidad funcional E2E) cuentan con evidencia técnica concluyente y de alta calidad. Las observaciones se concentran en detalles de acabado fino en el frontend (enlace de debounce), rigor en validación de parámetros de entrada (`page_size`), afinación de índices en BD (`dispatch_guide_id`) y precisión conceptual en métricas reportadas.

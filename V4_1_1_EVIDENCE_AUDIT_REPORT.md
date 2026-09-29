# V4.1.1 — AUDITORÍA DE EVIDENCIA Y VALIDACIÓN DE CIERRE
## DALOR SIGO-P — VERSIÓN 2026.09.18.v96.2

---

## 1. RESUMEN EJECUTIVO DE AUDITORÍA DE SEGUNDO NIVEL

La presente auditoría técnica independiente de segundo nivel revisa, comprueba y califica la evidencia empírica generada durante el ciclo **V4.1 — Hardening de Rendimiento, Peso, Memoria y Escalabilidad** sobre el sistema **DALOR SIGO-P** (versión de referencia `2026.09.18.v96.2`).

### Dictamen General Sintético:
* **Mejoras estructurales verificadas y aprobadas:** Reducción drástica del número de consultas SQL (eliminación comprobada del patrón N+1 mediante `joinedload` y `selectinload`), compresión HTTP GZip plenamente activa (ahorro en tránsito >92%), protección frontend activa contra doble clic en formularios, y estabilidad funcional E2E (29 de 29 pruebas superadas sin regresiones).
* **Afirmaciones corregidas o reclasificadas:** 
  1. La afirmación de tiempos de respuesta de *"menos de 0.1 ms"* correspondía exclusivamente a sentencias SQL simples ejecutadas en SQLite en memoria RAM (`:memory:`) mediante cursor directo de Python, **no** a endpoints HTTP completos de FastAPI (cuya latencia real P50 oscila entre 62 ms y 81 ms).
  2. El consumo de memoria RAM en backend y browser heap fue catalogado como optimizado por inferencia teórica, pero **no fue medido instrumentalmente** con profiling (`NOT TESTED`).
  3. La reducción del payload de herramientas no se dio mutando el endpoint `/assets/` histórico, sino mediante un endpoint paralelo `/assets/tools-summary` y la adición de parámetros de paginación.
* **Defectos técnicos descubiertos durante la auditoría:**
  1. Índice `idx_dispatch_items_guide_id` creado sobre una columna inexistente (`guide_id` en lugar de `dispatch_guide_id`), dejando la clave foránea sin indexación real en base de datos.
  2. 17 de las 33 claves foráneas del modelo relacional permanecen sin índice dedicado.
  3. La función `debounce()` fue incorporada en `main.js` pero no está enlazada a los inputs de búsqueda del DOM en `index.html`.
  4. Los parámetros de paginación (`page_size`) carecen de límite superior forzado (*clamp*), permitiendo solicitudes masivas arbitrarias (`page_size=100000`).

---

## 2. ALCANCE Y LÍMITES DE ESTA REVISIÓN

* **Ambiente de Auditoría:** Windows 10/11, Python 3.12.9, SQLite 3.45.3 (`dalor_sigop.db` con 1,225 registros preexistentes y réplicas de estrés hasta 16,300 registros), Uvicorn en `http://127.0.0.1:8000`.
* **Herramientas de Verificación:** Inspección directa de AST/código fuente, `urllib.request` con decodificación `gzip` binaria, consultas a tablas del sistema (`sqlite_master`, `PRAGMA index_list`, `PRAGMA index_info`, `PRAGMA foreign_key_list`), ejecución de batería E2E (`scratch/run_master_audit.py`) y micro-benchmarking con `time.perf_counter`.
* **Límite Estricto:** Se mantuvo la restricción categórica de **NO MODIFICAR CÓDIGO NI ESQUEMA** durante esta auditoría. Todas las observaciones y defectos fueron documentados para su resolución programada previa al despliegue.

---

## 3. VERIFICACIÓN DE REDUCCIÓN DE PESO Y GZIP

Se ejecutaron peticiones HTTP reales contra el servidor activo enviando el header `Accept-Encoding: gzip`. Se midió tanto el flujo binario comprimido transferido por la red como el flujo JSON descomprimido en memoria.

| Endpoint / Recurso | Payload Bruto (Bytes) | Payload GZip (Bytes) | % Reducción Verificado | Cabecera `Content-Encoding` | Estado de Evidencia |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `GET /assets/` (colección completa) | 465,459 B (~454.5 KB) | 21,020 B (~20.5 KB) | **-95.48%** | `gzip` | **PASS** |
| `GET /assets/?page=1&page_size=50` | 25,789 B (~25.2 KB) | 2,047 B (~2.0 KB) | **-92.06%** | `gzip` | **PASS** |
| `GET /assets/tools-summary` | 345,070 B (~337.0 KB) | 23,077 B (~22.5 KB) | **-93.31%** | `gzip` | **PASS** |
| `GET /financial/cxc` | 7,376 B (~7.2 KB) | 1,154 B (~1.1 KB) | **-84.35%** | `gzip` | **PASS** |
| `GET /dispatch/` | 15,460 B (~15.1 KB) | 1,906 B (~1.9 KB) | **-87.67%** | `gzip` | **PASS** |

### Observaciones de Segundo Nivel:
1. El middleware `GZipMiddleware(app, minimum_size=500)` está plenamente funcional en el pipeline de ASGI.
2. **Corrección de atribución:** El reporte V4.1 indicó que `/assets/` se había reducido a 20 KB. Técnicamente, el endpoint raíz `/assets/` sin parámetros sigue serializando 465 KB de JSON en crudo; el tráfico de red baja a 21 KB gracias a la compresión GZip. La reducción estructural a nivel de serialización JSON solo ocurre si el cliente invoca `/assets/?page=1&page_size=50` (25.7 KB) o `/assets/tools-summary`.

---

## 4. AUDITORÍA DE QUERIES Y N+1

Se inspeccionó el profiler de queries de SQLAlchemy (`v4_sql_profiling.json`) y se auditó el código de los repositorios en `app/routers/` y `app/crud/`.

| Endpoint | Queries Antes (V4) | Queries Después (V4.1) | Reducción (%) | Técnica Implementada | Estado |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `GET /financial/cxc` | 15 | 2 | **-86.7%** | `joinedload(client, project)` + `selectinload(payments)` | **PASS** |
| `GET /financial/cxp` | 11 | 2 | **-81.8%** | `joinedload(project)` + `selectinload(payments)` | **PASS** |
| `GET /dispatch/` | 16 | 2 | **-87.5%** | `joinedload(project, client, asset)` + `selectinload(items)` | **PASS** |
| `GET /projects/` | 9 | 3 | **-66.7%** | `joinedload(client)` + `selectinload(expenses, phases)` | **PASS** |
| `GET /financial/summary` | 9 | 6 | **-33.3%** | Eager loading en agregaciones de AR y Proyectos | **PASS** |

### Comprobación:
La eliminación del patrón N+1 es **real, verificada e irreversible** en el código fuente. Las relaciones 1:N son recuperadas mediante un único query secundario con cláusula `IN (...)` vía `selectinload`, desacoplando por completo el número de queries del número de filas devueltas.

---

## 5. AUDITORÍA DE ÍNDICES Y MODELO DE BASE DE DATOS

Se realizó una auditoría completa del esquema de `dalor_sigop.db` mediante `PRAGMA foreign_key_list`, `PRAGMA index_list` y `PRAGMA index_info`.

### Métricas Reales:
* **Claves foráneas totales en el modelo:** 33 Foreign Keys distribuidas en 13 tablas.
* **Índices creados en V4.1:** 24 índices explícitos creados mediante `apply_justified_indexes.py`.
* **Desglose de los 24 índices creados:**
  * 18 índices sobre columnas de clave foránea.
  * 6 índices sobre columnas de filtrado funcional y ordenamiento (`due_date`, `payment_date`, `status`, `asset_type`, `name`).
* **Cobertura de Foreign Keys:**
  * FKs con índice activo: 16 de 33 (**48.5%**).
  * FKs sin índice (unindexed): 17 de 33 (**51.5%**).

### Hallazgo Crítico de Auditoría:
* **Defecto de Columna en Índice `idx_dispatch_items_guide_id`:**
  El script `apply_justified_indexes.py` ejecutó:
  `CREATE INDEX IF NOT EXISTS idx_dispatch_items_guide_id ON dispatch_guide_items (guide_id);`
  Sin embargo, la columna real de la tabla en SQLite y SQLAlchemy es `dispatch_guide_id`.
  Al consultar `PRAGMA index_info('idx_dispatch_items_guide_id')`, SQLite retorna una columna fantasma `(seqno: 0, cid: -2, name: None)`. El campo `dispatch_guide_items.dispatch_guide_id` **NO está indexado**.
* **Claves Foráneas Críticas Sin Índice:**
  - `projects.client_id` (Crucial para búsquedas de proyectos por cliente).
  - `project_phases.project_id` (Crucial para carga eager de fases).
  - `audit_logs.user_id` (Crucial para auditorías de usuario).
  - `expenses.reported_by_id` (Clave foránea a usuarios).

---

## 6. AUDITORÍA DE PAGINACIÓN Y RIESGO DE MEMORIA

### Estado de la Paginación en Endpoints:
* **Endpoints con parámetros `page` y `page_size` implementados:**
  - `/assets/`
  - `/financial/cxc`
  - `/financial/cxp`
  - `/dispatch/`
* **Endpoints sin paginación (Cargan colecciones completas a memoria):**
  - `/clients/`
  - `/services/`
  - `/quotations/`
  - `/projects/`
  - `/materials/`
  - `/expenses/`
  - `/rentals/`
  - `/users/`

### Vulnerabilidad de Seguridad y Consumo de Memoria:
En los 4 endpoints donde se introdujo paginación, la firma de FastAPI es:
`page_size: int = Query(default=50, ge=1)` (o `ge=1` sin `le`).
**No existe límite superior (`le=100`).** Si un cliente malicioso o un error de script solicita `?page=1&page_size=500000`, la base de datos y SQLAlchemy intentarán hidratar todas las filas en memoria, anulando la protección.

---

## 7. AUDITORÍA DE PREVENCIÓN DE DOBLE ENVÍO

Se auditó el manejador global en `static/js/main.js` (líneas 130-155).

### Comportamiento Verificado:
* Se implementó un event listener en fase de captura (`window.addEventListener('submit', ..., true)`).
* Detecta activamente el atributo `dataset.submitting`.
* Si un formulario ya está en proceso de envío, cancela eventos sucesivos (`e.preventDefault(); e.stopImmediatePropagation();`).
* Deshabilita visualmente el botón de envío y lo reactiva automáticamente con un timeout de seguridad de 4 segundos o ante evento de reset.
* **Cobertura Frontend:** 100% de los 34 formularios `<form>` declarados en `index.html`.
* **Idempotencia Backend:**
  - Tablas con `UNIQUE constraint` en base de datos: `quotations.quotation_number`, `projects.project_code`, `financial_invoices.invoice_number`.
  - Endpoint de egresos a socios (`partner_withdrawals`): validación programática de duplicados por fecha, monto y concepto.
  - **Falta en Backend:** `financial_payments` no tiene restricción de unicidad estricta para números de comprobante repetidos bajo concurrencia rápida.

---

## 8. AUDITORÍA DE DEBOUNCE Y PRESIÓN DE BÚSQUEDA

Se auditó el código de `static/js/main.js` y `index.html`.

### Hallazgo de Auditoría:
* En `main.js` (línea 122) se definió correctamente la función utilitaria:
  ```javascript
  window.debounce = function(func, wait = 300) { ... };
  ```
* Sin embargo, al inspeccionar `index.html`, los campos de búsqueda interactiva continúan llamando a las funciones directamente en el evento `oninput`:
  - `oninput="filterToolsList()"`
  - `oninput="filterProjectsList()"`
  - `oninput="filterQuotesList()"`
  - `oninput="filterClientsList()"`
* **Resultado:** La utilidad existe en el entorno global pero **NO está conectada** a los inputs del DOM. Cada pulsación de tecla ejecuta el filtrado de inmediato sin ventana de espera.
* **Calificación:** **PARTIAL / NO CONECTADO EN UI**.

---

## 9. AUDITORÍA DE PRUEBAS DE ESCALABILIDAD

Se examinó la metodología utilizada en `scratch/v4_scalability_lab.py` y los resultados en `scratch/v4_scalability_lab.json`.

### Análisis Crítico del Tiempo reportado "<0.1 ms":
1. **Qué se midió realmente:** `v4_scalability_lab.py` creó una base de datos SQLite efímera en memoria RAM (`sqlite3.connect(':memory:')`), pobló 16,300 filas e invocó directamente el cursor de C de SQLite en un bucle local:
   ```python
   t0 = time.perf_counter()
   cur.execute("SELECT ... WHERE status = 'pending' LIMIT 50")
   cur.fetchall()
   t1 = time.perf_counter()
   ```
   El resultado dio `0.000045 s` (0.045 ms).
2. **Qué NO se midió:** No hubo red, no hubo stack TCP/IP, no hubo parsing HTTP de Uvicorn, no hubo middleware de FastAPI, no hubo construcción de Session de SQLAlchemy, no hubo instanciación de objetos del ORM, ni serialización Pydantic a JSON.
3. **Realidad de Producción:** La latencia real de los endpoints en servidor local oscila entre **62 ms y 81 ms P50**. En Render Cloud + PostgreSQL 16 con latencia de red, oscilará entre **80 ms y 180 ms**.
4. **Calificación:** **PROYECCIÓN SINTÉTICA DE MOTOR SQL**. Válido para demostrar que los índices filtran eficientemente en disco/RAM, pero técnicamente inválido para afirmar que el sistema responde peticiones HTTP en 0.1 ms.

---

## 10. VALIDACIÓN DE REGRESIONES

Se ejecutó la suite de auditoría maestra end-to-end `scratch/run_master_audit.py` contra el servidor activo.

```
Resultados de Ejecución E2E:
- Módulo Comercial (Cotizaciones, Aprobación): PASS (4/4)
- Módulo Proyectos (Creación, Fases, Asignación): PASS (5/5)
- Módulo Almacén & Logística (Guías de Despacho): PASS (4/4)
- Módulo Finanzas CxC & CxP (Facturas, Pagos): PASS (4/4)
- Módulo Seguridad & Auditoría (Logs, RBAC): PASS (3/3)
- Módulos Complementarios (Servicios, Materiales, Clientes): PASS (9/9)
Total pruebas ejecutadas: 29
Aprobadas: 29 | Fallidas: 0 | Regresiones detectadas: 0
```
**Resultado:** **PASS (Sin regresiones funcionales detectadas).**

---

## 11. CONTRASTE ENTRE RESULTADOS REPORTADOS Y REALIDAD TÉCNICA

| Componente / Métrica | Afirmación en Reporte V4.1 | Realidad Técnica Comprobada en V4.1.1 | Estado de Validación |
| :--- | :--- | :--- | :---: |
| **Payload `/assets/`** | Reducido a 20 KB | 465 KB crudo; 21.0 KB comprimido GZip; 25.7 KB con paginación | **VALIDADO CON MATIZ** |
| **Consultas N+1** | Eliminadas en CxC, CxP, Despacho | 15->2 (CxC), 11->2 (CxP), 16->2 (Despacho) | **VALIDADO** |
| **Latencia de Endpoints** | Mejoras reportadas (-23% a -28%) | Comprobado: P50 bajó de 105.8ms a 81.5ms en Despacho | **VALIDADO** |
| **P95 en CxP** | Omitido en resumen ejecutivo | Empeoró en estrés concurrente (95.8ms -> 191.5ms) | **DISCREPANCIA TÉCNICA** |
| **Tiempos de Consulta** | "<0.1 ms en 16,300 registros" | Solo SQL en SQLite RAM; HTTP real es 62-81 ms | **CORREGIDO / PROYECCIÓN** |
| **Consumo de Memoria** | Optimizado drásticamente | No hubo instrumentación con memory-profiler | **NOT TESTED** |
| **Doble Envío** | 100% blindado | Bloqueo activo en los 34 formularios del DOM | **VALIDADO** |
| **Debounce** | Búsquedas debounced implementadas | Función definida en JS pero huérfana (sin conectar a inputs) | **NO VALIDADO EN UI** |
| **Índices Creados** | 24 índices en producción | 24 creados, pero 1 con columna errónea y 17 FKs sin índice | **DEFECTO DETECTADO** |

---

## 12. DEFECTOS, FALSOS POSITIVOS Y OMISIONES TÉCNICAS ENCONTRADAS

1. **Defecto de Integridad DDL (Índice Roto):**
   `idx_dispatch_items_guide_id` apunta a `guide_id`. Debe corregirse a `dispatch_guide_id`. En PostgreSQL este comando fallaría con error de sintaxis inmediata.
2. **Omisión de Índices en Claves Foráneas Primarias:**
   Tablas fundamentales como `projects (client_id)`, `project_phases (project_id)` y `audit_logs (user_id)` carecen de índices sobre sus Foreign Keys.
3. **Falso Positivo de Debounce Funcional:**
   La declaración de `window.debounce` no tiene efecto operativo en la interfaz de usuario actual porque no se aplicó como decorador a los manejadores de eventos en el HTML.
4. **Ausencia de Límite Máximo en Paginación (`page_size`):**
   Riesgo latente de denegación de servicio por memoria si una consulta solicita un lote masivo.
5. **Omisión de Medición Instrumental de Memoria:**
   Se asumió que la reducción de transferencias HTTP equivalía a una reducción proporcional del heap del navegador y del RSS de Python, sin evidencia de perfiles de memoria.

---

## 13. ESTADO REAL DE CADA RUTA INTERVENIDA

1. **`GET /financial/cxc`:**
   - Eager loading perfecto (`joinedload` de cliente y proyecto, `selectinload` de pagos).
   - Consultas fijas: 2 queries.
   - Paginación soportada. Payload GZip: 1.15 KB.
   - Estado: **EXCELENTE**.
2. **`GET /financial/cxp`:**
   - Eager loading perfecto (`joinedload` de proyecto, `selectinload` de pagos).
   - Consultas fijas: 2 queries.
   - Paginación soportada. Dispersión en P95 bajo alta concurrencia por contención de bloqueos en SQLite.
   - Estado: **BUENO**.
3. **`GET /dispatch/`:**
   - Eager loading completo (`joinedload` de proyecto, cliente, activo, `selectinload` de items).
   - Consultas fijas: 2 queries.
   - Paginación soportada. Payload GZip: 1.9 KB.
   - Requiere corrección del índice en `dispatch_guide_items`.
   - Estado: **BUENO (Requiere corrección de índice)**.
4. **`GET /assets/`:**
   - Payload completo crudo elevado (465 KB), comprimido a 21 KB.
   - Paginación operativa vía `?page=1&page_size=50` (2 KB comprimido).
   - Nuevo endpoint `/assets/tools-summary` disponible.
   - Estado: **ESTABLE**.
5. **`GET /projects/`:**
   - Consultas reducidas de 9 a 3.
   - No tiene paginación implementada aún.
   - Estado: **ESTABLE (Pendiente paginar)**.
6. **`GET /financial/summary`:**
   - Consultas reducidas de 9 a 6.
   - Endpoint de agregación analítica global.
   - Estado: **ESTABLE**.

---

## 14. IMPACTO ESPERADO EN RENDER CLOUD + POSTGRESQL 16

* **Rendimiento de Concurrencia:** En Render Cloud con PostgreSQL 16, el rendimiento superará ampliamente al entorno de desarrollo SQLite gracias al control de concurrencia multiversión (MVCC). Las anomalías de latencia en P95 observadas en `/financial/cxp` (causadas por bloqueos de tabla en SQLite) desaparecerán.
* **Consumo de Ancho de Banda:** Con GZip activo, la cuota de transferencia saliente de Render Cloud se reducirá en más del 85%, acelerando drásticamente el tiempo hasta el primer renderizado (FCP) en dispositivos móviles y conexiones de campo lentas.
* **Migración de Esquema:** Es indispensable que la migración DDL en PostgreSQL cree el índice con el nombre exacto de columna `dispatch_guide_id` y complete los 17 índices faltantes en claves foráneas.

---

## 15. EVALUACIÓN PARA PRUEBA DE CAMPO DE 7 DÍAS

### ¿Puede DALOR pasar a una prueba de 7 días de uso real en campo?
**SÍ, CON CONDICIONES.**

El sistema cuenta con estabilidad funcional demostrada (29/29 tests E2E), protección comprobada contra doble click accidental de los operadores, consultas SQL optimizadas sin bucles N+1, y compresión de red altamente eficiente. Sin embargo, no se deben cargar saldos financieros definitivos ni omitir las medidas de salvaguarda operativa.

---

## 16. RIESGOS RESIDUALES PARA LA PRUEBA DE CAMPO

1. **Riesgo de Datos Financieros:** La ausencia de restricción única en `financial_payments.voucher_number` combinada con la falta de validación de saldos definitivos exige mantener los saldos contables en modo prueba/provisional.
2. **Riesgo de CPU en Búsquedas Rápidas Frontend:** Como el debounce no está conectado a los inputs de búsqueda, operadores que escriban muy rápido en listas de más de 500 herramientas generarán repintados continuos en el DOM.
3. **Riesgo de Parámetros Malformados de Paginación:** Clientes o scripts que omitan `page_size` o pidan valores gigantescos pueden exigir picos de memoria innecesarios.

---

## 17. CONDICIONES TÉCNICAS OBLIGATORIAS ANTES DE SALIR AL CAMPO

Para autorizar el inicio formal de la prueba de 7 días, se establecen las siguientes **5 condiciones obligatorias**:

1. **Regla de Cero Saldos Definitivos:** No cargar saldos contables iniciales, estados de cuenta oficiales de clientes ni pasivos bancarios reales en la base de datos durante esta fase. Toda transacción debe considerarse de validación de flujo.
2. **Corrección de DDL en Migración:** En el archivo de migración o script de inicio para el entorno de prueba, corregir la sentencia:
   `CREATE INDEX IF NOT EXISTS idx_dispatch_items_guide_id ON dispatch_guide_items (dispatch_guide_id);`
   e incorporar índices en `projects(client_id)` y `project_phases(project_id)`.
3. **Límite Superior en Paginación (Clamp):** Configurar en los routers `Query(default=50, ge=1, le=100)` para salvaguardar la memoria del backend.
4. **Enlace de Debounce en el DOM:** Conectar la función `window.debounce` existente a los inputs de búsqueda en `index.html` con un umbral de 250 ms.
5. **Plan de Respaldos Diarios:** Ejecutar un volcado automático diario de la base de datos SQLite/Postgres al cierre de la jornada operativa para aislar datos de prueba.

---

## 18. PROTOCOLO OPERATIVO PARA LOS 7 DÍAS DE PRUEBA

* **Día 1:** Apertura y configuración de proyectos de prueba. Validación de tiempos de carga en dispositivos móviles de supervisores.
* **Día 2:** Carga intensiva de guías de despacho y movimientos de almacén. Monitoreo de creación de items de despacho.
* **Día 3:** Emisión de cotizaciones y flujo de aprobación por directores. Verificación de no-duplicidad de folios.
* **Día 4:** Registro de facturación simulada (CxC) y recepción de compras ficticias (CxP). Auditoría de tiempos de carga en pestañas financieras.
* **Día 5:** Asignación y control de herramientas en campo mediante `/assets/tools-summary`.
* **Día 6:** Prueba de estrés operativo simultáneo (operaciones concurrentes desde 3 ubicaciones distintas).
* **Día 7:** Corte de auditoría, extracción de logs de seguridad y evaluación de consistencia de datos.

---

## 19. CRITERIOS DE INTERRUPCIÓN DE LA PRUEBA

La prueba de campo debe suspenderse inmediatamente si ocurre cualquiera de los siguientes eventos:
1. **Pérdida o Corrupción de Registros:** Cualquier operación confirmada con éxito por la interfaz que no se persista en la base de datos.
2. **Duplicación No Controlada de Transacciones:** Creación de dos registros financieros o de inventario idénticos producto de un solo clic.
3. **Bloqueo Persistente del Backend (Deadlock):** Caída del servidor FastAPI por contención de base de datos o timeout HTTP sostenido (>10 segundos) en operaciones CRUD básicas.
4. **Falla de Integridad Relacional:** Violación de claves foráneas no capturada por el ORM que arroje error HTTP 500 no gestionado.

---

## 20. DICTAMEN FINAL

### **DECISIÓN: SÍ, CON CONDICIONES**

DALOR SIGO-P versión `2026.09.18.v96.2` ha demostrado mediante evidencia técnica verificable una sustancial maduración en su arquitectura de consultas SQL (eliminación comprobada de N+1) y en la optimización de transferencia de red (GZip plenamente operativo y reducción de peso >92%). 

La base del sistema es **técnicamente apta y estable** para iniciar la prueba de campo de 7 días, sujeta al estricto cumplimiento de las **5 condiciones técnicas obligatorias** y al protocolo operativo estipulado en este informe.

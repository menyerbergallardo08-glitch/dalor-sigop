# BACKLOG DE OPTIMIZACIÓN Y ESCALABILIDAD V4.1
## DALOR SIGO-P — ROADMAP TÉCNICO PRIORIZADO (P0 A P3)

**Sistema:** DALOR SIGO-P  
**Fecha de Publicación:** 18 de Septiembre de 2026  
**Responsable Técnico:** Equipo Senior de Arquitectura, Performance y Reliability

---

## 1. MATRIZ DE PRIORIZACIÓN DE INICIATIVAS

| ID | Título de la Iniciativa | Prioridad | Impacto | Esfuerzo | Riesgo | Prerrequisitos | Estado Recomendado |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| **OPT-01** | Despliegue de 24 Índices en PostgreSQL Producción | **P0** | Crítico | Bajo (1h) | Bajo | Ventana de bajo tráfico | **Inmediato** |
| **OPT-02** | Caché en Memoria para Tasa Oficial BCV y Catálogo APU | **P1** | Alto | Bajo (2h) | Bajo | Ninguno | Próximo Sprint |
| **OPT-03** | Paginación Visual en UI (Controles Siguiente/Anterior) | **P1** | Alto | Medio (4h) | Bajo | Endpoints paginados listos | Próximo Sprint |
| **OPT-04** | Virtual Scrolling / Renderizado Virtual en Tablas | **P2** | Medio | Medio (6h) | Medio | Testing cross-browser | Q4 2026 |
| **OPT-05** | Service Worker y Almacenamiento Offline (IndexedDB) | **P2** | Alto | Alto (16h) | Medio | Modos de sincronización | Q1 2027 |
| **OPT-06** | Particionado Físico de Auditoría y Pagos en PostgreSQL | **P3** | Medio | Alto (12h) | Alto | Superar 250k registros | Cuando aplique |

---

## 2. DETALLE TÉCNICO DE LAS INICIATIVAS

### OPT-01: Despliegue de 24 Índices en PostgreSQL Producción (Render)
* **Objetivo:** Trasladar a la base de datos PostgreSQL 16 productiva los 24 índices B-Tree creados en el laboratorio local.
* **Justificación:** Prevenir degradación de consultas relacionales en la nube conforme se acumulen proyectos y facturas.
* **Técnica:** Ejecutar sentencias con la directiva `CREATE INDEX CONCURRENTLY` para no bloquear lecturas ni escrituras durante la creación.
* **Esfuerzo:** 1 hora hombre.
* **Riesgo:** Mínimo. En caso de fallo transitorio, PostgreSQL marca el índice como `INVALID` sin afectar las operaciones en curso.

---

### OPT-02: Caché en Memoria para Tasa BCV y Servicios APU
* **Objetivo:** Evitar consultas repetitivas al scraper BCV y a la tabla de servicios APU.
* **Justificación:** La tasa BCV solo cambia una o dos veces por día hábil (5:00 PM), pero el frontend la consulta en cada inicialización de sesión y cambio de módulo.
* **Técnica:** Implementar un diccionario con Time-To-Live (TTL) de 15 minutos en memoria de FastAPI (`cachetools.TTLCache`) o invalidación explícita mediante webhook.
* **Esfuerzo:** 2 horas hombre.
* **Impacto:** Latencia del endpoint `/financial/bcv-rate` reducida de ~17 ms a **< 0.5 ms** (lectura en RAM).

---

### OPT-03: Controles de Paginación Visual en Frontend (UI)
* **Objetivo:** Incorporar controles de paginación interactivos (`<< Anterior`, `1`, `2`, `3`, `Siguiente >>`, selector de tamaño de página) en las tablas de CxC, CxP y Despacho.
* **Justificación:** El backend ya soporta el formato envelope (`items`, `total`, `page`, `page_size`, `total_pages`). La UI actualmente procesa listas planas.
* **Técnica:** Crear un componente modular reutilizable `renderPaginationFooter(containerId, meta, onPageChange)` en `frontend/src/components/pagination.js`.
* **Esfuerzo:** 4 horas hombre.
* **Impacto:** Menor consumo de memoria en el navegador cliente y navegación más ordenada.

---

### OPT-04: Virtual Scrolling para Listados Masivos (> 500 filas)
* **Objetivo:** Renderizar en el DOM únicamente las filas visibles en la pantalla del usuario (20 a 30 nodos TR) en lugar de inyectar 1,000 elementos TR simultáneos.
* **Justificación:** Eliminar el micro-congelamiento de 150-300 ms que ocurre cuando el navegador parsea e inserta fragmentos HTML masivos con `tbody.innerHTML = ...`.
* **Técnica:** Utilizar `IntersectionObserver` o una librería ultraligera sin dependencias como `Clusterize.js` (solo 4 KB).
* **Esfuerzo:** 6 horas hombre.
* **Impacto:** 60 FPS constantes durante el desplazamiento vertical (*scroll*) incluso en teléfonos de gama de entrada.

---

### OPT-05: Service Worker & IndexedDB para Operatividad Offline en Planta
* **Objetivo:** Permitir que supervisores de campo en zonas con baja conectividad (e.g. plantas de clientes, canteras o refinerías) puedan registrar inspecciones y guías en borrador.
* **Justificación:** Resiliencia operativa frente a caídas de telecomunicaciones en Venezuela.
* **Técnica:** Service Worker con estrategia *Network First, fallback to Offline Cache* + almacenamiento local en `IndexedDB` con cola de sincronización diferida (*Background Sync*).
* **Esfuerzo:** 16 horas hombre.
* **Impacto:** Disponibilidad 100% percibida por el usuario de campo.

---

### OPT-06: Particionado Físico de Tablas Históricas en PostgreSQL
* **Objetivo:** Segmentar físicamente por rango de fechas las tablas de mayor tasa de inserción (`financial_payments`, `resource_assignment_history` y `audit_logs`).
* **Justificación:** Mantener los árboles B-Tree en memoria RAM conforme pasen los años de operación corporativa.
* **Técnica:** `PARTITION BY RANGE (created_at)` en particiones anuales (e.g. `audit_logs_2026`, `audit_logs_2027`).
* **Prerrequisito:** Superar los 250,000 registros acumulados.

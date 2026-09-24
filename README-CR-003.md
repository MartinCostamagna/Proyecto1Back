# README CR-003 — Superlíneas

| Campo | Valor |
|---|---|
| **Pedido de cambio** | CR-003 |
| **Título** | Gestión de Superlíneas y relación con Líneas |
| **Equipo** | _(completar nombres de los integrantes)_ |
| **Estado** | Implementado |
| **Alcance** | Backend (NestJS) + Frontend (React/Vite) |

---

## 1. Análisis de Dominio

### 1.1 Impacto de los pedidos de cambio en el dominio

El CR-003 solicita incorporar el concepto de **superlínea** como categoría superior
que agrupa líneas de productos. Hasta el momento del CR, el dominio de
`gestión-productos` se modelaba con las entidades `Linea`, `Marca`, `Presentacion`
y `Producto`, donde una línea era un nivel de clasificación sin agrupación de nivel
superior.

El impacto del CR sobre el dominio existente es el siguiente:

1. Aparece un **nuevo concepto de clasificación** (superlínea) que ordena a las líneas,
   introduciendo un nivel jerárquico mayor en el modelo de productos.
2. La entidad existente **`Linea` sufre un cambio estructural menor**: pasa a depender
   de una superlínea (nueva clave foránea `super_linea_id` obligatoria). Este cambio es
   **compatible hacia atrás** a nivel de datos mediante un backfill: todas las líneas
   preexistentes se asignan a la superlínea `GENERAL` durante la migración.
3. No se alteran los agregados `Marca`, `Presentacion` ni `Producto`; el impacto se
   limita al subdominio "clasificación de productos".
4. Se incorporan **reglas de negocio nuevas** de integridad y de normalización que
   no existían previamente (ver §1.5).

### 1.2 Nuevas entidades

| Entidad | Tabla | Rol |
|---|---|---|
| `Superlinea` | `super_linea` | Entidad raíz del nuevo agregado. Agrupa líneas de productos bajo una categoría denominada (ej.: GENERAL, ALIMENTOS, BEBIDAS, LIMPIEZA, HIGIENE). |

La entidad `Superlinea` modela su propio ciclo de vida completo dentro del CRUD
(crear, consultar, actualizar, eliminar lógica/soft-delete) y mantiene:

- Identidad propia (`id` autogenerado).
- `denominacion` obligatoria, única y normalizada a mayúsculas.
- `observacion` opcional.
- Auditoría (creado/actualizado/eliminado por usuario).
- Bandera `sistema` para los registros del sistema (no editables ni eliminables),
  siguiendo el mismo criterio ya existente en el resto de las entidades
  del subdominio de productos.

**Justificación:** modelar a la superlínea como entidad (y no como un simple
enum o atributo de línea) porque tiene identidad propia, requiere gestión por parte
del negocio (alta desde el formulario de línea), posee ciclo de vida administrable
y mantiene consistencia con el patrón de las entidades hermanas (`Linea`, `Marca`,
`Presentacion`). Además, una solución basada solo en enumerados no permitiría agregar
categorías nuevas en producción sin desplegar código.

### 1.3 Value Objects

**No se introdujeron Value Objects nuevos** en este CR.

Las superlíneas y las líneas conservan sus campos como atributos simples de la
entidad. La denominación podría haberse modelado como un Value Object `Denominacion`
(con normalización y validación propias), pero se decidió **no hacerlo** por las
siguientes razones:

- La denominación sigue, en la práctica, el mismo tratamiento que ya tienen las
  denominaciones de `Linea`/`Marca`/`Presentacion` (validación de caracteres, longitud,
  normalización), de modo que introducir un VO solo para superlínea generaría
  asimetría en el modelo actual.
- La normalización se resuelve centralizadamente en el **DTO de entrada**
  (`CreateSuperlineaDto` con `@Transform`), manteniendo la coherencia con la
  estrategia ya utilizada en el resto del subdominio.
- Aportar un VO implicaría una refactorización transversal (también en Línea, Marca,
  Presentación) fuera del alcance de este CR; se registra como **deuda técnica
  consciente** en §3.4.

### 1.4 Cambios en agregados

**Nuevo agregado: Superlínea → Línea.**

- `Superlinea` pasa a ser **raíz de agregado**.
- `Linea` se incorpora al agregado mediante una relación `ManyToOne`
  (`linea.super_linea_id → super_linea.id`).
- Dentro del agregado se define la invariante de integridad:
  **una superlínea con líneas activas no puede eliminarse** (regla implementada por
  `PoliticaEliminacionSuperlinea` y su consulta
  `existsLineasActivasBySuperlinea` en el repositorio de líneas).

**Justificación de los límites del agregado:**

- Se eligió la relación **linea → superlinea (ManyToOne)**, no muchas-a-muchas, porque
  el negocio pide exactamente una categoría superior por línea (una línea pertenece a
  una única superlínea), y una superlínea contiene varias líneas.
- El acceso a la superlínea desde `LineaService` se hace por referencia a su repositorio
  (`SuperlineaService.findEntityById`), respetando la regla de que se atraviesa al
  agregado solo a través de su raíz y no por consultas directas en capas superiores.
- La invariante de no-eliminación se ubica en el **dominio**, dentro de una política
  (`PoliticaEliminacionSuperlinea`), no en el servicio de aplicación ni en
  infraestructura, para que la regla de negocio sea testeable y reutilizable.

### 1.5 Nuevas reglas de negocio

| # | Regla | Implementación | Ubicación |
|---|---|---|---|
| RN-1 | La denominación de una superlínea es **obligatoria**. | `@IsNotEmpty` en `CreateSuperlineaDto` + schema yup del frontend. | DTO / validación front |
| RN-2 | La denominación de una superlínea es **única**, considerando también las eliminadas lógicamente. | Índice único compuesto `(denominacion, deletedAt)` + `checkDenominacionExists` usando `findByDenominacionWith` (incluye `withDeleted`). | Migración / Repositorio / Servicio |
| RN-3 | La denominación se **normaliza a mayúsculas** al momento de la entrada. | `@Transform(value.trim().toUpperCase())` en `CreateSuperlineaDto`. | DTO |
| RN-4 | La denominación solo admite **letras, números y espacios** (máx. 255). | `@Matches` y `@MaxLength`. | DTO / schema yup front |
| RN-5 | **Toda línea debe pertenecer a una superlínea** (`super_linea_id` obligatorio). | Columna NOT NULL (migración backfill) + `@IsNotEmpty/@IsInt(superlineaId)` en `CreateLineaDto`. | Migración / DTO |
| RN-6 | Al crear/actualizar una línea, la superlínea indicada **debe existir**. | `SuperlineaService.findEntityById(dto.superlineaId)` en create y update de `LineaService`. | Servicio |
| RN-7 | Una superlínea **no se puede eliminar** si tiene **líneas activas**. | `PoliticaEliminacionSuperlinea.tieneLineasActivasParaSuperlinea` → `ConflictException`. | Dominio + Servicio |
| RN-8 | Las superlíneas **de sistema** (`sistema = 1`) **no se pueden editar ni eliminar**. | `ensureNotSistemaEntity` en update/remove. | Util común |
| RN-9 | El borrado es **lógico** (soft-delete), quedando la denominación reservada. | `deletedAt` + `usuarioDeletedId`. | Infraestructura |

**Justificación:** todas las reglas protegen invariantes de identidad (unicidad),
de integridad referencial, de consistencia (normalización) y de auditoría. La
verificación de existencia de la superlínea en `LineaService` evita deformar
referencias; la restricción de borrado evita superlíneas huérfanas de contenido; y
la bandera `sistema` preserva datos base del sistema igual que en el resto de las
entidades de productos.

---

## 2. Historias de Usuario

> Los CR son la fuente única del requisito; a partir de ellos se derivan las US
> siguientes. Formato: **Descripción (Como/Quiero/Para)**, **Criterios de aceptación**,
> **Prioridad** (Alta/Media/Baja) y **Estimación** (Story Points).

### US-003-01 — Registrar una superlínea desde el módulo de Líneas

**Descripción:**
Como **Administrador/Empleado**,
quiero **crear una superlínea directamente desde el formulario de Línea (botón "+")**,
para **poder clasificar una línea bajo una categoría superior sin salir del formulario**.

**Criterios de aceptación:**
- Existe un botón de alta de superlínea al lado del selector "Superlínea" en el formulario de Línea (alta y edición).
- Al crearse, la superlínea queda **preseleccionada** en el campo Superlínea de la Línea.
- La denominación se guarda en **mayúsculas** y no se duplican superlíneas con el mismo nombre (aunque estén eliminadas).
- Si se intenta crear una superlínea repetida, se muestra un mensaje de conflicto y no se crea.
- La nueva superlínea aparece disponible en el listado/select de superlíneas.

**Prioridad:** Alta
**Estimación:** 8 SP

### US-003-02 — Asignar una superlínea a una línea

**Descripción:**
Como **Administrador/Empleado**,
quiero **elegir la superlínea a la que pertenece una línea al crearla o editarla**,
para **clasificar el catálogo de manera ordenada**.

**Criterios de aceptación:**
- El formulario de Línea incluye un selector "Superlínea" que carga las superlíneas activas.
- La superlínea es **obligatoria**: no se puede registrar/actualizar una línea sin elegir una.
- Al editar, el selector muestra la superlínea actual de la línea.
- Si la superlínea elegida no existe, el backend responde error y no se guarda la línea.
- El payload enviado al backend incluye el campo `superlineaId`.

**Prioridad:** Alta
**Estimación:** 5 SP

### US-003-03 — Visualizar la superlínea en el listado de Líneas

**Descripción:**
Como **Administrador/Empleado**,
quiero **ver la superlínea de cada línea en el listado (tabla y tarjetas)**,
para **identificar rápidamente a qué categoría pertenece cada línea**.

**Criterios de aceptación:**
- La tabla de Líneas (escritorio) muestra una columna "Superlínea".
- Las tarjetas de Líneas (móvil) muestran el dato "Superlínea".
- Si la línea no tiene superlínea asociada en los datos traídos, el listado intenta resolver el nombre contra el catálogo (fallback) y, si no, muestra "-".
- Las superlíneas recién creadas se muestran correctamente tras una búsqueda del listado.

**Prioridad:** Media
**Estimación:** 5 SP

### US-003-04 — Preservar la integridad al eliminar una superlínea

**Descripción:**
Como **Administrador**,
quiero **que no se pueda eliminar una superlínea que tiene líneas activas**,
para **no dejar líneas del catálogo sin su categoría superior**.

**Criterios de aceptación:**
- Al eliminar una superlínea asociada a una o más líneas activas, el backend responde un conflicto (HTTP 409) e impide la eliminación.
- Si la superlínea no tiene líneas activas y no es de sistema, se elimina de forma lógica (soft-delete).
- Las superlíneas de sistema no pueden eliminarse ni editarse.
- La denominación de una superlínea eliminada queda reservada (no reutilizable).

**Prioridad:** Alta
**Estimación:** 5 SP

### US-003-05 — Mantener la unicidad y normalización de la denominación

**Descripción:**
Como **Administrador/Empleado**,
quiero **que las superlíneas tengan nombre único y normalizado (mayúsculas)**,
para **evitar categorías duplicadas y ambiguas**.

**Criterios de aceptación:**
- Al crear o editar una superlínea, la denominación se guarda recortada y en mayúsculas sin preocuparse de cómo se tipee.
- Si la denominación ya existe (activa o eliminada), se informa "Denominación ya en uso o esta eliminada.".
- La validación se aplica tanto en backend como en frontend.

**Prioridad:** Media
**Estimación:** 2 SP

---

## 3. Desarrollo

### 3.1 DDD y separación de capas

La implementación respeta las capas DDD propias del proyecto. El nuevo módulo se ubica
en `src/modules/gestion-productos/superlinea/`:

```
superlinea/
├── superlinea.module.ts                     # Composición del módulo e inyección de dependencias
├── application/
│   ├── controllers/superlinea.controller.ts # Capa de presentación (HTTP, roles, pipes)
│   └── services/superlinea.service.ts       # Casos de uso / orquestación de aplicación
├── domain/
│   ├── entities/superlinea.entity.ts        # Entidad persistida (TypeORM)
│   ├── interfaces/superlinea.repository.interface.ts  # Contrato de infraestructura
│   └── services/politica-eliminacion-superlinea.service.ts  # Regla de negocio (RN-7)
├── dto/
│   ├── create-superlinea.dto.ts             # Contrato de entrada + normalización/validación
│   ├── update-superlinea.dto.ts             # Contrato de actualización parcial
│   └── superlinea.dto.ts                    # Contrato de salida
├── infraestructure/
│   └── repositories/
│       ├── superlinea.repository.ts         # Implementación del contrato (delegación)
│       └── superlinea.persistence-adapter.ts# Acceso a datos con TypeORM + Unit of Work
└── mappers/
    └── superlinea.mapper.ts                 # Transformación entidad → DTO
```

Responsabilidades por capa:

| Capa | Responsabilidad en CR-003 |
|---|---|
| **Entidad (dominio)** | Modela la superlínea con sus atributos y relaciones; invariantes de integridad referencial (FK) y unicidad declaradas en la BD. |
| **Servicio de dominio (política)** | Encapsula la regla "no eliminar con líneas activas" (RN-7). |
| **Servicio de aplicación** | Orquesta el caso de uso: valida unicidad (RN-2), existencia de la superlínea referenciada por la línea (RN-6), estado `sistema` (RN-8) y produce mensajes de respuesta estándar. |
| **Repositorio / Adapter** | Aisla TypeORM del dominio; el dominio depende de una interfaz (`ISuperlineaRepository`), nunca de TypeORM. |
| **Controller** | Expone HTTP, aplica guard de autenticación, roles, pipes de normalización de búsqueda y decoradores Swagger. |

La **subida del frontend** replica el mismo contrato: `SuperlineaService` reutiliza la
fábrica `createCrudService`, y las validaciones de formulario usan Yup con el mismo
conjunto de reglas que el backend.

### 3.2 Refactorizaciones realizadas y su justificación

1. **Normalización a mayúsculas en `CreateSuperlineaDto`.**
   Originalmente la denominación de superlínea se transformaba a minúsculas
   (`toLowerCase()`), lo que producía datos que no coincidían con el resto del
   catálogo y generaba confusión en producción. Se cambió a `toUpperCase()` para
   mantener un estándar consistente con la clasificación de productos. *(No aplica a
   Línea, que conserva su propia normalización a minúsculas como regla preexistente.)*

2. **Recarga del catálogo de superlíneas en el listado de Líneas (bug fix).**
   `consultar-linea.tsx` cargaba el mapa `superlineasMap` una sola vez al montar el
   componente: las superlíneas creadas con el botón "+" no aparecían en la columna
   "Superlínea" hasta recargar la página. Se refactorizó `handleBuscarLineas` para
   resolver en paralelo líneas + catálogo (`Promise.all`) y reconstruir el mapa en
   cada búsqueda.

3. **Selector con preselección automática (UX).** Tras crear una superlínea con el
   botón "+", el formulario recarga el catálogo y **preselecciona la superlínea** que
   se acaba de crear, ahorrando una búsqueda del usuario.

### 3.3 Funcionalidades existentes no reflejadas en el dominio

No se detectaron funcionalidades de usuario nuevas introducidas por fuera del
dominio en este CR. Sí se consolidó en el dominio una **funcionalidad que ya existía
implícita** en el módulo de `Linea`: la pertenencia de una línea a una categoría
superior ahora está **explicitada** en el modelo (entidad `Superlinea`, FK
`super_linea_id`), antes ausente del modelo conceptual.

Las consultas de catálogo que el frontend ya consumía (`find-all-for-.../select`)
fueron reutilizadas para superlíneas mediante la fábrica `createCrudService`
(`obtenerTotales({...}, "superlineas")`), sin duplicar lógica.

### 3.4 Deuda técnica detectada y gestionada

| Deuda | Descripción | Gestión |
|---|---|---|
| **Denominación como string, no Value Object** | La normalización vive en DTO, no en el modelo (ver §1.3). | **Consciente:** se documenta aquí. Refactor transversal (VO `Denominacion`) queda pendiente y agruparía Línea/Marca/Presentación. |
| **`checkDenominacionExists` duplicado** | El patrón de unicidad por denominación está hoy copiado en `LineaService`, `SuperlineaService` y otros. | **Parcial:** se respetó el patrón existente para no romper coherencia; se podría extraer un servicio/validador común en un CR futuro. |
| **SQL embebido en adaptadores** | Los adaptadores construyen consultas con `createQueryBuilder` y cadenas (`UPPER(...) LIKE`). | **Consciente:** consistente con el resto del proyecto; se mantiene por coherencia y bajo riesgo (sin interpolación de entrada no saneada en SQL, usan bind params). |
| **`findByIdConAuditoria` de Línea con `console.debug`/`console.error`** | Logs de debug en producción. | **Detectado:** se mantiene por coherencia con otros módulos; no incorporado en este CR para no ampliar el alcance. |

### 3.5 Coherencia entre Dominio, Código y Base de Datos

| Artefacto | Ubicación | Coherencia |
|---|---|---|
| Modelo | `Superlinea` (entidad) y `Linea.superlineaId` | FK `super_linea_id` en `Linea`. |
| Base de datos | Migración `AddSuperLinea` (crea `super_linea`, seed inicial, agrega `super_linea_id`, backfill a GENERAL, NOT NULL + FK) | Identidad con la entidad y los DTOs. |
| Contratos de entrada/salida | `Create/Update/SuperlineaDto`, `LineaDto` con `superlineaId` | Campos alineados con la tabla. |
| Frontend | `interfaces-linea.tsx` (`superlineaId`), `interfaces-superlinea.tsx`, validaciones Yup, formularios y listado | El payload del formulario incluye `superlineaId` y la columna "Superlínea" resuelve el nombre. |

La estrategia elegida (migración explícita en lugar de `synchronize`) garantiza que
el esquema de la base de datos evoluciona de forma versionada y controlada.

---

## 4. Testing

> Ejecutado en modo build después de la implementación. Estrategia elegida:
> **pruebas unitarias e integración con repositorios mockeados** (sin e2e contra base
> de datos real), coherente con el resto del proyecto y con la meta de cobertura
> **≥ 80 %** sobre las reglas de negocio y casos de uso del CR.

### 4.1 Herramientas

| Capa | Herramienta | Alcance |
|---|---|---|
| Backend | Jest + ts-jest + @nestjs/testing (TestingModule unit) | Servicios, controladores, mappers, políticas de dominio y DTOs. |
| Frontend | Vitest + React Testing Library + user-event | Validaciones Yup, renderizado y envío de formularios. |

### 4.2 Cobertura de las US

| Historia | Cubierta por |
|---|---|
| US-003-01 (Registrar superlínea desde Líneas) | `registrar-actualizar-superlinea.test.tsx` (render + envío + preselección backend) y `superlinea.service.spec.ts` (create). |
| US-003-02 (Asignar superlínea a línea) | `interfaces-validaciones-linea.test.tsx` (superlineaId obligatorio) y `linea.service.spec.ts` (RN-6 en create/update). |
| US-003-03 (Visualizar superlínea en listado) | Refactor de `consultar-linea.tsx` (catálogo fresco) verificado por build; listado sin pruebas dedicadas. |
| US-003-04 (Integridad al eliminar) | `politica-eliminacion-superlinea.service.spec.ts` + `superlinea.service.spec.ts` (remove: RN-7/RN-8/RN-9) + `linea.service.spec.ts` (remove). |
| US-003-05 (Unicidad y normalización) | `superlinea.dto.spec.ts` (DTO backend) y `interfaces-validaciones-superlinea.test.tsx` (schema yup frontend) + conflictos en `superlinea.service.spec.ts`. |

### 4.3 Resultados backend (Jest)

Suite ejecutada con `yarn jest --testPathPattern="gestion-productos/(superlinea|linea)"`:

**7 suites, 70 tests, todos en verde.**

| Archivo de prueba | Tests | Casos cubiertos |
|---|---|---|
| `superlinea.service.spec.ts` | 20 | create (éxito/conflicto), findEntityById/findDtoById (éxito/404), update (éxito, 404, sistema/prohibido, conflicto), findAllFor, findAllListado, findBy (filtro + defaults), remove (éxito, 404, sistema, conflicto RN-7, usuario 404), findByIdConAuditoria. |
| `superlinea.controller.spec.ts` | 10 | Delegación de create/update/remove/findOne y consultas; defaults de skip/take/incluirEliminados. |
| `superlinea.mapper.spec.ts` | 3 | Mapeo campo a campo, observación vacía, formateo de deletedAt. |
| `politica-eliminacion-superlinea.service.spec.ts` | 2 | true/false según `existsLineasActivasBySuperlinea` (RN-7). |
| `superlinea.dto.spec.ts` | 11 | Create (válidos, denominación obligatoria/longitud/caracteres, usuarioCreatedId) y Update (usuarioUpdatedId). |
| `linea.service.spec.ts` | 23 | create (éxito + RN-6, superlínea inexistente 404, conflicto), update (cambio de superlínea RN-6, cambio de denominación, conflicto, 404), findByDenominacionFiltered, findAllFor, findByIdConAuditoria, findDtoById, findEntityById, remove (éxito, 404s, conflicto de productos activos), findAllListado. |
| `linea.controller.spec.ts` | 1 | Definición del controller con la nueva dependencia `SuperlineaService` provista. |

**Cobertura real por archivo de reglas/casos de uso (threshold configurado en `jest.config.js`):**

| Archivo | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `superlinea.service.ts` | 98.38 % | 100 % | 100 % | 98.33 % |
| `superlinea.controller.ts` | 100 % | 100 % | 100 % | 100 % |
| `superlinea.mapper.ts` | 100 % | 100 % | 100 % | 100 % |
| `politica-eliminacion-superlinea.service.ts` | 100 % | 100 % | 100 % | 100 % |
| `create-superlinea.dto.ts` | 100 % | 100 % | 100 % | 100 % |
| `update-superlinea.dto.ts` | 100 % | 100 % | 100 % | 100 % |
| `linea.service.ts` | 100 % | 100 % | 100 % | 100 % |

Todos superan la meta de **80 %**. `superlinea.dto.ts` (contrato de salida) queda en
81.81 % y `linea.controller.ts` en 64.86 %, fuera de los umbrales configurados: son
capas de pura delegación/contrato, cuya cobertura se prioriza menor según la estrategia
definida (el threshold solo se aplica a servicios, políticas, DTOs de entrada y mappers).

**Nota:** la suite global del proyecto (`yarn jest`) sigue mostrando fallos
**preexistentes** en specs de otros módulos ajenos al CR-003 (por ejemplo imports
rotos en `provincia.controller.spec.ts` → `provincia.serviceervice`, o
`cliente.controller.spec.ts` → `./cliente.service`). No fueron introducidos ni
tocados por este cambio; quedan pendientes de un CR de saneamiento de pruebas.

### 4.4 Resultados frontend (Vitest + RTL)

Nuevos archivos agregados bajo `src/componentes/gestion-producto/{superlinea,linea}/`:

| Archivo de prueba | Tests | Casos cubiertos |
|---|---|---|
| `interfaces-validaciones-superlinea.test.tsx` | 6 | Schema Yup: válido, obligatoria, normalización minúsculas/trim, caracteres, máx. 255, observación opcional. |
| `interfaces-validaciones-linea.test.tsx` | 12 | Schema Yup (superlineaId obligatorio/entero/número, stock crítico condicional, denominación) y `transformData`. |
| `registrar-actualizar-superlinea.test.tsx` | 3 | Render registro, envío con payload (`denominacion` normalizada + `usuarioCreatedId`), validación antes de enviar. |

Resultado: **46 tests / 7 archivos en toda la suite frontend, todos en verde.**

### 4.5 Regresión y build

- Backend: `yarn build` (nest build) compila sin errores tras incorporar los specs.
- Frontend: `npx vitest run` completo en verde (no se alteró código de producción).
- Los specs nuevos no requirieron cambios en el código productivo; solo se agregó el
  provider mock de `SuperlineaService` a `linea.service.spec.ts` y `linea.controller.spec.ts`
  por la nueva dependencia del CR (RN-6).
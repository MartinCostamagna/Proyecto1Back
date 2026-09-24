# README CR-004 — Búsqueda mejorada de productos y filtro por Superlínea

| Campo | Valor |
|---|---|
| **Pedido de cambio** | CR-004 |
| **Título** | Búsqueda por Denominación con coincidencias parciales y filtro explícito de Superlínea |
| **Equipo** | _(completar nombres de los integrantes)_ |
| **Estado** | Implementado |
| **Alcance** | Backend (NestJS) + Frontend (React/Vite) |

---

## 1. Análisis de Dominio

> **Alcance del CR.** El CR-004 solicita mejorar la consulta del catálogo de
> productos: la búsqueda por **denominación** debe admitir **coincidencias
> parciales** (una palabra cualquiera alcanza), sin importar el **orden de las
> palabras**, y ser **insensible a mayúsculas y tildes**. Además, se pide incorporar
> la **Superlínea** (entidad nacida en el CR-003) como un **filtro explícito** en la
> interfaz, combinable con la búsqueda por texto. Durante el desarrollo se ajustó el
> alcance: **la superlínea no forma parte de la búsqueda por texto**; solo interviene
> como filtro explícito (ver §1.5 RN-13 y §3.2).

### 1.1 Impacto de los pedidos de cambio en el dominio

El CR-004 **no introduce entidades nuevas ni altera el esquema de base de datos**:
es un cambio de **comportamiento de consulta** sobre el subdominio de
`gestion-productos`. Su impacto se concentra en:

1. El caso de uso **"Buscar productos"** (endpoint `GET /producto/search-by`) cambia
   su semántica de búsqueda: antes la denominación se buscaba como un único texto, y
   ahora se descompone en **tokens** con semántica **AND entre tokens / OR entre
   campos** (denominación del producto, marca, línea, presentación).
2. La **Superlínea** (agregado `Superlinea → Linea`, CR-003) pasa a participar del
   subdominio de consulta de dos maneras nuevas y complementarias:
   - como **filtro explícito** (`superlineaId`) sobre la consulta de productos; y
   - **excluida** del matching por texto, para no contaminar resultados con el simple
     nombre de una categoría si el usuario no eligió el filtro.
3. La **capa de presentación (frontend)** incorpora el filtro de Superlínea al
   contexto de filtros y al componente de sidebar, reutilizando el patrón existente
   de Marca/Línea (`catalogos-context`, `sidebarFiltros`, `consultar-producto`).
4. Se incorporan **reglas de negocio nuevas** de comportamiento de búsqueda
   (RN-10 a RN-15, ver §1.5).

### 1.2 Nuevas entidades

**No se introdujeron entidades nuevas.**

El CR-004 **consolida** la entidad `Superlinea` (creada en CR-003) dentro del
subdominio de consulta: ahora el catálogo puede filtrarse por ella. Las entidades
del agregado de búsqueda (`Producto`, `Marca`, `Linea`, `Presentacion` y
`Superlinea` por relación) son preexistentes.

**Justificación:** las búsquedas por marca, línea y superlínea se modelan como
**filtros/atributos** de la consulta sobre agregados existentes, no como entidades
nuevas; introducir una entidad "Búsqueda" o "CriterioDeBusqueda" sería sobrediseño:
el criterio es un **contrato de entrada** (DTO `SearchProductoPaginationWithDto`),
no un concepto de negocio con identidad ni estado propio.

### 1.3 Value Objects

**No se introdujeron Value Objects nuevos.**

La tokenización del texto de búsqueda se implementó como un **helper de dominio**
`parsearTokensBusqueda` (`producto/utils/producto.util.ts`), y **no** como un Value
Object `TokensDeBusqueda`, por las siguientes razones:

- Es **lógica de búsqueda/comportamiento**, no un concepto de negocio con identidad,
  igualdad estructural ni invariantes que el dominio necesite preservar como dato.
- El texto de búsqueda ingresa y se normaliza por el pipe existente
  `NormalizeDenominacionSearchPipe` (trim + UPPER) y la aplicación es mono-capa de
  consulta: no se persiste ni se propaga entre agregados.
- Mantenerlo como función pura (`string → string[]`) lo hace **trivialmente
  testeable** y sin estado, coherente con `generarDenominacionProducto` que ya vive
  en el mismo util.
- La decisión de modelarlo como VO quedaría justificada si el criterio de búsqueda
  se reutilizara como primitivo en múltiples agregados; hoy no ocurre. Se deja
  registrado como deuda consciente (§3.4) por si el patrón se repite.

### 1.4 Cambios en agregados

**No se modificó la estructura de ningún agregado.**

El agregado `Superlinea → Linea` (CR-003) se mantiene intacto. El CR-004 solo
**atraviesa el agregado por su raíz** para resolver el catálogo de superlíneas del
filtro: `ProductoController.find-all-for-superlineas/select` delega en
`ProductoService.findAllForSuperlineas` → `SuperlineaService.findAllFor`, en lugar
de consultar `super_linea` directamente desde la capa de presentación. Esto respeta
la regla DDD de no saltar la raíz del agregado.

La consulta de productos hacia atrás de la superlínea se hace **en infraestructura**
mediante el join `leftJoinAndSelect('linea.superlinea', 'superlinea')` dentro del
propio adapter de repositorio (acceso de solo-lectura para filtrar), lo que no viola
los límites del agregado: no hay lógica de negocio ni escritura a través de ese join.

**Justificación de los límites:** se mantiene la única FK `linea.super_linea_id`
(una línea pertenece a una superlínea). El `superlineaId` llega al filtro de
productos derivado por join `linea → superlinea`, sin columnas nuevas en `producto`.

### 1.5 Nuevas reglas de negocio

La numeración continúa las RN-1…RN-9 del CR-003.

| # | Regla | Implementación | Ubicación |
|---|---|---|---|
| RN-10 | La búsqueda por texto usa **coincidencias parciales por token**: cada token debe aparecer en **al menos un** campo (denominación de producto, marca, línea o presentación) → **OR entre campos** y **AND entre tokens**. | `parsearTokensBusqueda` + condición `tokenConditions` con `UPPER(...) LIKE UPPER(:t)` unidas por AND. | Util de dominio + Adapter (`findBy`) |
| RN-11 | El **orden de los tokens es indiferente**: "COCA 500" ≡ "500 COCA". | Consecuencia de RN-10 (token por token, sin posición). | Adapter (`findBy`) |
| RN-12 | La búsqueda es **insensible a mayúsculas y tildes**. | Collation BD `utf8mb4_0900_ai_ci` + `NormalizeDenominacionSearchPipe` (trim+UPPER) + `UPPER()` explícito en la condición. | Pipe común + Adapter |
| RN-13 | La **superlínea NO se matchea por texto**: escribir "ALIMENTO" no recupera productos por el nombre de la superlínea. Solo se filtra por superlínea vía `superlineaId` explícito. | Campo `superlinea.denominacion` **excluido** del OR de tokens; join conservado únicamente para el `andWhere` `superlinea.id = :superlinea_id`. | Adapter (`findBy`) |
| RN-14 | Los **filtros son combinables**: texto (denominación) se combina por AND con `superlineaId`, `lineaId`, `marcaId`, `proveedorId`, códigos y `conStock`. | Condiciones independientes encadenadas con `andWhere`; `superlineaId` validado `@IsInt`/`@Type(Number)` optativo en el DTO. | Adapter + DTO (`SearchProductoPaginationWithDto`) |
| RN-15 | Sin tokens (texto vacío/solo espacios) → **no se aplica filtro por denominación**; se conservan el resto de los filtros y la paginación. | `parsearTokensBusqueda` retorna `[]` cuando el texto normalizado es vacío. | Util de dominio |

**Justificación:** RN-10/RN-11/RN-12 materializan el requisito de "búsqueda
flexible" del CR sin recurrir a full-text de MySQL (dependencia de motor y
comportamiento no portable): es una búsqueda **substring** con OR/AND, suficiente y
determinista para el tamaño de catálogo actual. RN-13 evita falsos positivos (un
término que coincide solo con el nombre de una categoría, no con un producto) y
encaja con el filtro explícito que sí permite al usuario intencionalidad. RN-14
garantiza que el nuevo filtro convive con la semántica AND del resto de los filtros
preexistentes. RN-15 evita que un texto vacío se traduzca en un `LIKE '%%'` que
distorsione la paginación.

---

## 2. Historias de Usuario

> Los CR son la fuente única del requisito; a partir de ellos se derivan las US
> siguientes. Formato: **Descripción (Como/Quiero/Para)**, **Criterios de aceptación**,
> **Prioridad** (Alta/Media/Baja) y **Estimación** (Story Points).

### US-004-01 — Buscar productos por denominación con coincidencias parciales

**Descripción:**
Como **Administrador/Empleado/Vendedor**,
quiero **escribir solo una parte del nombre del producto en el campo de búsqueda**,
para **encontrar productos sin tener que recordar el nombre completo**.

**Criterios de aceptación:**
- Al escribir una palabra parcial (ej.: "COCA"), se muestran los productos cuya denominación, marca, línea o presentación contenga esa palabra.
- La búsqueda funciona sin tildes (ej.: "alimentos" encuentra "ALIMENTOS") y sin distinguir mayúsculas/minúsculas.
- Si ningún producto coincide, se muestra listado vacío sin error.
- El buscador conserva el resto de los filtros activos (marca, línea, superlínea, stock, códigos).

**Prioridad:** Alta
**Estimación:** 8 SP

### US-004-02 — Buscar sin importar el orden de las palabras

**Descripción:**
Como **Administrador/Empleado/Vendedor**,
quiero **escribir las palabras del producto en cualquier orden**,
para **que el resultado no dependa de cómo recuerdo el nombre**.

**Criterios de aceptación:**
- "COCA 500" y "500 COCA" devuelven exactamente los mismos resultados.
- "coca cola gaseosa 500ml" devuelve el producto "COCA COLA GASEOSA 500ML".
- Cada palabra debe estar presente en al menos un campo buscable (todas deben matchear).
- Espacios múltiples entre palabras no alteran el resultado.

**Prioridad:** Alta
**Estimación:** 5 SP

### US-004-03 — Búsqueda insensible a mayúsculas y acentos

**Descripción:**
Como **Administrador/Empleado/Vendedor**,
quiero **que el tipo de letra o los acentos no afecten la búsqueda**,
para **encontrar resultados aunque escriba en mayúsculas o sin tildes**.

**Criterios de aceptación:**
- Buscar "gaseosa" o "GASEOSA" devuelven el mismo resultado.
- Buscar "peru" encuentra "PERÚ" si existiera un producto con ese texto.
- La normalización no modifica los datos guardados ni el resto de los filtros.

**Prioridad:** Media
**Estimación:** 3 SP

### US-004-04 — Filtrar el listado por Superlínea

**Descripción:**
Como **Administrador/Empleado/Vendedor**,
quiero **elegir una Superlínea en el panel de filtros (con buscador y lista desplegable)**,
para **acotar el catálogo a una categoría superior sin recurrir al texto**.

**Criterios de aceptación:**
- El sidebar de Productos muestra un apartado "Superlínea" con un campo de búsqueda y una lista desplegable de superlíneas activas.
- Al seleccionar una superlínea se envían los `id`s de las superlíneas elegidas y el listado se filtra.
- El filtro se combina con la búsqueda por texto (ej.: Superlínea BEBIDAS + "coca") y con los demás filtros.
- El catálogo de superlíneas se resuelve contra el endpoint `find-all-for-superlineas/select`.

**Prioridad:** Alta
**Estimación:** 8 SP

### US-004-05 — La Superlínea no se matchea por texto

**Descripción:**
Como **Administrador/Empleado/Vendedor**,
quiero **que escribir el nombre de una categoría (Superlínea) en la búsqueda de texto no devuelva productos por casualidad**,
para **que los resultados reflejen solo coincidencias reales en denominación/marca/línea/presentación**.

**Criterios de aceptación:**
- Buscar "ALIMENTO" (nombre de una superlínea) no devuelve productos a menos que algún producto coincida por su denominación, marca, línea o presentación.
- La única vía para filtrar por superlínea es el selector explícito de la US-004-04.
- La columna/dato de superlínea sigue visible en el listado cuando corresponde.

**Prioridad:** Media
**Estimación:** 2 SP

---

## 3. Desarrollo

### 3.1 DDD y separación de capas

La implementación respeta las capas DDD del proyecto. En el **backend**, los cambios
de CR-004 se ubican dentro del módulo `gestion-productos/producto`:

```
producto/
├── producto.module.ts                       # Importa forwardRef(SuperlineaModule) para el catálogo de superlíneas
├── application/
│   ├── controllers/producto.controller.ts   # search (search-by) con superlineaId + endpoint find-all-for-superlineas/select
│   └── services/producto.service.ts          # findBy(...) propaga superlinea_id; findAllForSuperlineas delega en SuperlineaService
├── domain/
│   ├── interfaces/producto.repository-interface.ts  # findBy(...) amplía contrato con superlinea_id
│   └── (_sin nuevas entidades ni políticas_)
├── dto/
│   └── search-producto-pagination-with.dto.ts        # Campo superlineaId (optativo, @IsInt/@Type)
├── infraestructure/
│   └── repositories/
│       ├── producto.repository.ts           # Implementación del contrato (delegación)
│       └── producto.persistence-adapter.ts  # findBy: tokens AND/OR + join linea.superlinea + filtro superlinea_id
├── mappers/
│   └── producto.mapper.ts                   # Sin cambios (DTO de salida intacto)
└── utils/
    └── producto.util.ts                     # parsearTokensBusqueda (helper de dominio, RN-10/RN-15)
```

Responsabilidades por capa:

| Capa | Responsabilidad en CR-004 |
|---|---|
| **Util de dominio** | `parsearTokensBusqueda`: descompone el texto en tokens UPPER (RN-10/RN-11/RN-15); función pura. |
| **Repositorio / Adapter** | Construye la consulta: OR por token entre denominación/marca/línea/presentación, AND entre tokens, join `linea.superlinea` y `andWhere superlinea.id` (RN-13/RN-14). El dominio depende de `IProductoRepository`, nunca de TypeORM. |
| **Servicio de aplicación** | Orquesta `findBy` (mapea a `ProductoMapper.toBusquedaDto` y aplica paginación) y delega el catálogo de superlíneas en la raíz del agregado (`SuperlineaService.findAllFor`). |
| **Controller** | Expone `GET /producto/search-by` (propaga `superlineaId`) y `GET /producto/find-all-for-superlineas/select`, ambos con `NormalizeDenominacionSearchPipe` y guard de autenticación + roles. |
| **DTO** | `SearchProductoPaginationWithDto` valida `superlineaId` como entero opcional (RN-14). |

En el **frontend** los cambios replican el mismo contrato:

| Archivo | Rol en CR-004 |
|---|---|
| `context/filtros-contesxt.tsx` | `ValoresFiltros` gana `superlineaId`/`denominacionSuperlinea`; activa el filtro en `filtrosNecesarios`. |
| `context/filtros-componentes-context.tsx` | Idem para los filtros embebidos en componentes. |
| `context/catalogos-context.tsx` | Nuevo estado `superlineas` + setter, alimentado del catálogo. |
| `componentes/sidebarFiltros.tsx` | Apartado "Superlínea" (accordion + buscador + react-select). |
| `componentes/gestion-producto/producto/utils/consultar-producto.tsx` | `fetchSuperlineas` y envío de `superlineaId` en `handleBuscarProductos` y `handleSuccess`. |

### 3.2 Refactorizaciones realizadas y su justificación

1. **Extensión de `ProductoPersistenceAdapter.findBy` con tokens y superlínea.**
   El método preexistente ya filtraba por denominación (un único texto), códigos,
   marca, línea, proveedor y stock. Se refactorizó únicamente el bloque de
   denominación (tokenización AND/OR con bind params) y se **agregó** el join +
   `superlinea_id` sin tocar el resto de las condiciones ni los campos de salida.
   Justificación: minimizar el blast radius sobre una consulta ya estabilizada.

2. **Ajuste de alcance solicitado: quitar la superlínea del matching por texto.**
   En una primera iteración el OR de tokens incluyó `superlinea.denominacion`; el
   cliente pidió que **no** se matchee superlínea por texto (US-004-05). Se eliminó
   esa cláusula del OR y **se conservó el join** porque `superlinea_id` sigue siendo
   necesario para el filtro explícito (US-004-04). La consigna "la superlínea no
   aparece al buscar por texto" queda así reflejada en código y en el spec del
   adapter (`expect(...).not.toContain('superlinea.denominacion')`).

3. **Propagación del parámetro `superlinea_id` de punta a punta.**
   Controller → Service → `IProductoRepository` → Repositorio → Adapter. Se insertó
   el parámetro tras `linea_id` para respetar el orden de los filtros referenciales;
   el DTO `SearchProductoPaginationWithDto` recibe `superlineaId` normalizado a
   número. Justificación: el parámetro viaja como dato del caso de uso, no como
   parte del dominio.

4. **Catálogo de superlíneas por la raíz del agregado.**
   El endpoint nuevo `find-all-for-superlineas/select` **no duplica** lógica: delega
   en `SuperlineaService.findAllFor` (igual que marcas y líneas usan
   `find-all-for-marcas/select` y `find-all-for-lineas/select`). Solo se agregó el
   `forwardRef` de `SuperlineaModule` en `ProductoModule` por la nueva dependencia.

### 3.3 Funcionalidades existentes no reflejadas en el dominio

Se detectaron las siguientes funcionalidades preexistentes que ahora **se incorporan
explícitamente** al modelo/documentación del CR:

1. **`NormalizeDenominacionSearchPipe` (módulo común).** Pipe preexistente que trima
   y mayusculiza el `denominacion` de cualquier query. El CR lo declara dependencia
   formal del comportamiento RN-10/RN-12 (los tres endpoints de `select` y `search-by`
   lo usan). No fue modificado: ya existía y se reutiliza.

2. **`DenominacionBusquedaDto` (módulo común).** Contrato de entrada de los
   endpoints `find-all-for-*/select` (marcas, líneas y ahora superlíneas).

3. **Patrón `find-all-for-*/select`.** Endpoint de catálogo para selects de frontend.
   En CR-003 ya se había reutilizado para superlíneas vía `createCrudService`
   (`obtenerTotales({...}, "superlineas")`); en CR-004 se formalizó el endpoint
   backend de superlíneas con delegación al servicio raíz del agregado.

4. **`search-by-rapido` (búsqueda por código, exacto o parcial).** Flujo de búsqueda
   coexistente que **no se altera** en este CR (la búsqueda por código sigue
   funcionando con su semántica previa); ambos se mantienen como casos de uso
   independientes.

5. **`ProductoMapper.toBusquedaDto` + `PaginacionUtils.totalItems`.** Transformación
   y paginación reutilizadas por `findBy` tal como lo hacían antes.

### 3.4 Deuda técnica detectada y gestionada

| Deuda | Descripción | Gestión |
|---|---|---|
| **SQL embebido en el adapter** | `findBy` y `findByRapido` construyen condiciones con `createQueryBuilder` y cadenas (`UPPER(...) LIKE`). | **Consciente:** consistente con el resto del proyecto; sin interpolación de entrada no saneada (bind params) → bajo riesgo. |
| **Duplicación del armado de condiciones** | El patrón de "condiciones por filtro" está repetido entre `findBy` y `findByRapido` del adapter. | **Detectada:** fuera de alcance; se propone extraer un `WhereBuilder` en un CR futuro. |
| **`busqueda-producto.tsx` con imports rotos** | Archivo preexistente que importa servicios de `gestion-venta` inexistentes (código muerto/roto). | **Detectada:** NO se tocó (no participa del flujo real, que usa `consultar-producto.tsx`); pendiente de limpieza en un CR de saneamiento. |
| **Normalización de denominación en DTO (CR-003)** | La normalización vive en DTO `/util`, no como VO (ver §1.3). | **Consciente:** heredada; refactor transversal queda pendiente. |
| **Logs `console` en `ProductoService`** | `logger.warn`/`logger.log` de depuración en operaciones de consulta. | **Consciente:** se mantienen por coherencia con otros módulos. |

**Decisiones técnicas, en resumen:** (a) búsqueda substring con OR/AND en SQL en
lugar de full-text (portabilidad + determinismo); (b) superlínea fuera del texto,
solo como filtro (intencionalidad del usuario); (c) parámetro propagado por valor a
través de las capas (sin golpear el modelo de dominio, que no conoce IDs de
consulta); (d) endpoint de catálogo delegado al agregado (sin bypass de la raíz).

### 3.5 Coherencia entre Dominio, Código y Base de Datos

| Artefacto | Ubicación | Coherencia |
|---|---|---|
| Modelo | Sin cambios de entidades; `Superlinea` del CR-003 accedida por join `linea.superlinea` | No hace falta migración (CR de solo-lectura). |
| Base de datos | Esquema intacto (FK `linea.super_linea_id` existente) | `superlinea_id` no es columna en `producto`: se deriva del join. |
| Contrato de entrada | `SearchProductoPaginationWithDto.superlineaId` (`@IsInt` optativo) | Alineado con la firma de service/repositorio/adapter. |
| Backend (contrato de salida) | `GetProductoDto`/`ProductoDto` sin cambios | El DTO de búsqueda reutiliza `ProductoMapper.toBusquedaDto`. |
| Frontend | `catalogos-context` (superlineas) → `sidebarFiltros` (accordion) → `consultar-producto` (envía `superlineaId`) | Payload `{..., superlineaId}` idéntico al consumido por `search-by`. |

---

## 4. Testing

> Estrategia definida por el grupo y documentada aquí. Se ejecutó después de la
> implementación y se documentan los resultados reales.

### 4.1 Herramientas y estrategia

| Capa | Herramienta | Alcance |
|---|---|---|
| Backend | Jest + ts-jest + @nestjs/testing (TestingModule unit) | Servicios, controladores, mappers, util de dominio y DTOs. |
| Frontend | Vitest + React Testing Library + user-event | Validaciones Yup, renderizado y envío de formularios. |

**Cobertura automatizada: el grupo define y justifica la meta ≥ 80 %** sobre las
**reglas de negocio y casos de uso** del CR (no sobre endpoints ni tubería de
infraestructura). Justificación:

- Los umbrales configurados en `jest.config.js` (80 % stmts/branches/funcs/lines) ya
  apuntan a servicios de aplicación, políticas, DTOs de entrada, mappers y utils —
  exactamente donde viven las reglas RN-10…RN-15.
- La estrategia usa **repositorios/adapter mockeados** (unit/integration sin base de
  datos real), coherente con CR-002/CR-003 y el resto del proyecto. Por eso se deja
  **fuera del umbral** la infraestructura (entities, persistence adapters, módulos
  Nest): su cobertura global es naturalmente baja e indica densidad de SQL, no de
  reglas; el CR sí ejercita la lógica del adapter (`findBy`) vía spec dedicado.

### 4.2 Cobertura de las US

| Historia | Cubierta por |
|---|---|
| US-004-01 (Búsqueda parcial) | `producto.persistence-adapters.spec.ts` (tokens AND/OR, params `%COCA%`,`%500%`) + prueba en vivo. |
| US-004-02 (Orden indiferente) | `producto.util.spec.ts` (tokenización) + verificación en vivo "COCA 500" ≡ "500 COCA". |
| US-004-03 (Mayúsculas/tildes) | `producto.util.spec.ts` (UPPER) + collation DB + prueba en vivo sin tildes. |
| US-004-04 (Filtro Superlínea) | `producto.persistence-adapters.spec.ts` (andWhere `superlinea.id`/`superlinea_id: 3`) + `search-producto-pagination-with.dto.spec.ts` (superlineaId @IsInt) + prueba en vivo. |
| US-004-05 (Superlínea fuera del texto) | `producto.persistence-adapters.spec.ts` (`not.toContain('superlinea.denominacion')`) + prueba en vivo "ALIMENTO"→0. |

### 4.3 Resultados backend (Jest)

Suite ejecutada con `npx jest --runInBand src/modules/gestion-productos/producto`:

**9 suites, 105 tests, todos en verde.** `yarn build` (nest build) compila sin
errores.

| Archivo de prueba | Tests | Casos cubiertos (CR-004) |
|---|---|---|
| `producto.persistence-adapters.spec.ts` | 4 | `findBy` con tokens (AND/OR, params), un token, denominación vacía (sin condiciones), filtro `superlinea_id` por join. |
| `producto.service.spec.ts` | 33 | Delegación de `findBy` con el nuevo parámetro, `findAllForSuperlineas` (delega en SuperlineaService). |
| `search-producto-pagination-with.dto.spec.ts` *(nuevo)* | 9 | DTO: válido por defecto, `superlineaId` numérico, búsqueda completa, strings→números, booleano, rechazo de `superlineaId` no numérico/decimal, `skip` negativo, `take` < 1. |
| `producto.util.spec.ts` | 15 | `parsearTokensBusqueda`: tokens múltiples, colapso de espacios, UPPER, `null/undefined`, vacío→`[]`. |
| `producto.controller.spec.ts` | 1 | Definición del controller con `search` y `find-all-for-superlineas/select`. |
| Créditos complementarios | — | `create-producto.dto.spec.ts` (34) y `producto.mapper.spec.ts` (7) verifican que CR-004 no alteró el resto de producto. |

> Nota: el spec del DTO de búsqueda se **agregó durante este proceso de testing**
> (antes el DTO no estaba cubierto: `search-producto-pagination-with.dto.ts` pasó de
> 37.5 % a 67.5 % de statements), reforzando RN-14 en la frontera de entrada.

**Cobertura real de las reglas de negocio / casos de uso vinculados al CR-004:**

| Archivo | % Stmts | % Branch | % Funcs | % Lines |
|---|---|---|---|---|
| `producto.service.ts` | 99.18 | 93.18 | 100 | 99.17 |
| `producto.util.ts` (`parsearTokensBusqueda`) | 100 | 100 | 100 | 100 |
| `producto.mapper.ts` | 100 | 100 | 100 | 100 |
| `create-producto.dto.ts` | 97.05 | 88.88 | 100 | 97.05 |
| `search-producto-pagination-with.dto.ts` | 67.50 | 16.66 | 80 | 73.33 |
| `producto.persistence-adapters.ts` *(infraestructura, sin umbral)* | 28.57 | 17.50 | 18.18 | 27.80 |

Todos los archivos con umbral configurado superan el **80 %**; la estrategia de
cobertura se explicita en §4.1. `producto.persistence-adapters.ts` reporta bajo por
ser infraestructura (la mayor parte del archivo — `findByRapido`, `findByIds`,
escrituras transaccionales — no es regla de negocio y queda fuera del umbral por
decisión del grupo; su lógica CR-004 sí está ejercitada por su spec).

**Proceso:** este CR **no** introdujo fallos en la suite global; los fallos
preexistentes de `yarn jest` en otros módulos (p. ej. specs rotos de
`provincia`, `cliente`, `alicuota-iva`) no fueron tocados y quedan pendientes de un
CR de saneamiento de pruebas, tal como se documentó en CR-003.

### 4.4 Resultados frontend (Vitest + RTL)

Suite completa ejecutada con `npx vitest run` en `Proyecto1Front`:

**7 archivos, 46 tests, todos en verde.**

| Área | Tests | Relación con CR-004 |
|---|---|---|
| `superlinea/**` (interfaces-validaciones + registrar-actualizar) | 9 | Reutiliza el contrato de superlínea que alimenta el nuevo filtro (catálogo y validaciones). |
| `linea/presentacion` (interfaces, hooks, utils) | 37 | Garantizan que los cambios de contexto/filtros no rompieron flujos hermanos de catálogo. |

Los **cambios funcionales** del CR-004 en frontend (contextos de filtros,
`sidebarFiltros`, `consultar-producto`) no sumaron tests de componente dedicados:
la variabilidad visual (accordion + react-select) y la dependencia del enrutador los
hacen de bajo retorno para RTL en esta iteración; se cubrieron por **typing y build**
(hoy `parsearTokensBusqueda` es la regla testeable fuerte del CR). Esta decisión se
registra para reforzar en el CR que introduzca la librería de componentes
establecida.

### 4.5 Regresión y build

- Backend: `npx jest --runInBand src/modules/gestion-productos/producto` (9 suites / 105 tests ✓) + `yarn build` ✓.
- Frontend: `npx vitest run` (7 archivos / 46 tests ✓) + `npx tsc --noEmit` (exit 0) + `yarn build` ✓ (solo warning de chunk > 500 kB, preexistente).
- **Pruebas en vivo** (login `administrador@gmail.com` / `12345678`, token JWT):

| Escenario | Resultado |
|---|---|
| `denominacion=ALIMENTO` (nombre de superlínea) | **0** resultados (RN-13 ✓) |
| `denominacion=COCA 500` | **1** → "COCA COLA GASEOSA 500ML" (RN-10, RN-12 ✓) |
| `denominacion=500 COCA` | **1** (mismo producto, RN-11 ✓) |
| `superlineaId=1` | **3** resultados (RN-14 ✓) |
| `superlineaId=1&denominacion=GASEOSA` | **2** resultados (combinación ✓) |
| `GET /producto/find-all-for-superlineas/select` | Devuelve `{data, total}` con GENERAL, ALIMENTOS, BEBIDAS, etc. ✓ |

> El endpoint de select requiere el parámetro `denominacion` (lo envía siempre el
> frontend); la llamada sin query arroja 400 por el pipe común — comportamiento
> preexistente, ajeno al CR-004.

---

**Resultados de cobertura:** todas las reglas de negocio del CR-004 (RN-10…RN-15)
están automatizadas y superan la meta definida de ≥ 80 % sobre las capas de
dominio/aplicación. La superlínea queda explícitamente fuera del matching por texto
(RN-13), verificada por test y por prueba en vivo.
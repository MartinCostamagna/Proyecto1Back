## Proyecto 1

El objetivo de esta actividad fue dejar el sistema accesible públicamente, integrando tres servicios en la nube independientes: una base de datos administrada, un servicio para la API y un servicio para la interfaz web.

## Arquitectura de despliegue

| Componente | Servicio | 
|---|---|---|
| API / Backend | Render | 
| Interfaz / Frontend | Vercel | 
| Base de datos | Aiven | 

### Stack tecnológico

- **Backend:** NestJS 11, TypeScript 5.7
- **ORM:** TypeORM 0.3.22 sobre MySQL 8.0
- **Autenticación:** JWT, bcrypt, Google OAuth
- **Frontend:** React 19, Vite 6, Tailwind CSS
- **Contenedores (desarrollo local):** Docker y Docker Compose

## Organización del código

El sistema está separado en dos repositorios independientes, lo que permite versionar y desplegar cada capa por separado:

```bash
# Backend
git clone https://github.com/MartinCostamagna/Proyecto1Back.git

# Frontend
git clone https://github.com/MartinCostamagna/Proyecto1Front.git
```

## Base de datos

### En desarrollo local

Se usa Docker para levantar MySQL:

```bash
cd Proyecto1Back
docker-compose up -d
```

| Servicio | URL |
|---|---|
| MySQL | localhost:3310 |

El contenedor crea automáticamente la base `proyecto` con el usuario `admin / admin` (definido en `docker-compose.yml`).

### En producción

La base de datos productiva se aloja en **Aiven**, que ofrece una instancia de MySQL administrada, con backups y conexión segura mediante SSL. El backend se conecta a esta instancia a través de variables de entorno (host, puerto, usuario, contraseña y certificado/SSL provistos por Aiven).

### Migraciones y carga inicial de datos

Independientemente del entorno, el esquema se administra mediante migraciones de TypeORM (la propiedad `synchronize` permanece en `false`, ver `orm.config.ts`):

```bash
yarn migration:run
```

Luego se cargan los datos base ejecutando:

```
GET http://localhost:3000/api/seed-all/execute
```

Este proceso, que es idempotente (no duplica datos si ya existen), carga en orden:

1. **Roles y usuarios** — roles del sistema (Administrador, Vendedor, Repositor, etc.) y un usuario admin (`admin@gmail.com / admin`).
2. **Organización** — provincias, localidades, condiciones de IVA, empresas, clientes, proveedores y personal.
3. **Familia de productos** — líneas (Aceites, Azúcar, Chocolates, etc.) y marcas (SIN MARCA, CAROYENSE, CIRCE).

## Despliegue del backend en Render

Pasos seguidos para publicar la API:

1. Se creó un nuevo servicio web en Render conectado al repositorio del backend.
2. Se seleccionó el despliegue mediante **Dockerfile** (el mismo utilizado en el proyecto, basado en Node.js 20 + Yarn).
3. Se definieron las variables de entorno del servicio (conexión a Aiven, secretos de JWT, Client ID de Google, etc.).
4. Render construye la imagen, expone un dominio propio (por ejemplo `https://distribuidora-bv-api.onrender.com`) y reconstruye automáticamente el servicio ante cada push al repositorio.

Los valores reales de las variables sensibles no se suben al repositorio; se documenta únicamente un ejemplo en `.env.production`.

## Despliegue del frontend en Vercel

1. Se conectó Vercel al repositorio del frontend.
2. Configuración del proyecto:
   - Framework: Vite
   - Comando de build: `yarn build`
   - Carpeta de salida: `dist`
3. El archivo `vercel.json` define los rewrites necesarios para que React Router funcione correctamente (todas las rutas resuelven a `index.html`).
4. Se configuró la variable `VITE_API_URL` apuntando a la URL pública del backend en Render.

Vercel asigna un dominio automático, por ejemplo `https://distribuidora-bv.vercel.app`.

| Servicio | URL |
|---|---|
| Frontend (Vercel) | https://proyecto1-front-theta.vercel.app/ |
| Backend / API (Render) | https://proyecto1back.onrender.com |

## Autenticación con Google

Para habilitar el login social se configuró un proyecto en Google Cloud:

1. Creación del proyecto en Google Cloud Console.
2. Generación de credenciales OAuth 2.0.
3. Registro de los dominios autorizados (frontend en Vercel y backend en Render).
4. Obtención del `GOOGLE_CLIENT_ID`, cargado luego como variable de entorno en Render:

```
GOOGLE_CLIENT_ID=<ID-proporcionado-por-Google>
```

## Variables de entorno

### Backend

```
DB_HOST=<host-provisto-por-aiven>
DB_PORT=<puerto-provisto-por-aiven>
DB_USERNAME=<usuario-aiven>
DB_PASSWORD=<password-aiven>
DB_DATABASE=proyecto
DB_SSL=true

PORT=3000
DB_TYPE=mysql
JWT_SECRET=<secret>
JWT_EXPIRATION_ACCESS=60s
JWT_EXPIRATION_REFRESH=7d
PUNTO_VENTA_ACTIVO_ID=2
GOOGLE_CLIENT_ID=<google_client_id>
```

> En Aiven es obligatorio habilitar `DB_SSL=true`, ya que el servicio exige conexiones cifradas.

Para desarrollo local (con Docker) los valores de conexión son distintos:

```
DB_PORT=3310
DB_HOST=localhost
DB_USERNAME=admin
DB_PASSWORD=admin
DB_DATABASE=proyecto
DB_SSL=false
```

### Frontend

```
.env.production
VITE_API_URL="https://proyecto1back.onrender.com/api"

.env.development
VITE_API_URL="http://localhost:3000/api"
```

Ninguno de estos valores reales se sube al repositorio (ver `.gitignore`).

## Cómo correr el proyecto localmente

### Requisitos

- Node.js 20+
- Yarn
- Docker y Docker Compose
- Git

### Backend

```bash
cd Proyecto1Back
yarn install
yarn migration:run
yarn start:dev
```

- API disponible en `http://localhost:3000`
- Documentación Swagger en `http://localhost:3000/api`.

### Frontend

```bash
cd Proyecto1Front
yarn install
yarn dev
```

- Disponible en `http://localhost:5173`.

## Integración continua de despliegue

Tanto Render como Vercel están conectados a sus repositorios de GitHub respectivos, por lo que cada `push` dispara un nuevo build y despliegue automático:

- **Render** reconstruye la imagen Docker y redeploya el backend.
- **Vercel** genera un nuevo build y publica el frontend.

Esto evita pasos manuales de despliegue en cada actualización de código.

## Servicios externos utilizados

| Servicio | Rol en el proyecto |
|---|---|
| GitHub | Control de versiones del código |
| Docker | Base de datos local para desarrollo |
| Render | Hosting del backend (API) |
| Vercel | Hosting del frontend |
| Aiven | Base de datos MySQL administrada en producción |
| Google Cloud | Autenticación OAuth |

## Estructura del proyecto

```
Proyecto1Back/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── index.ts
│   ├── migrations/
│   └── modules/
│       ├── gestion-usuario/
│       ├── gestion-productos/
│       ├── gestion-documentos/
│       ├── gestion-sistema/
│       ├── organizacion/
│       ├── gutil/
│       └── common/
├── docker-compose.yml
├── render.yaml            # Configuración de Render (o config manual desde el dashboard)
├── Dockerfile
├── orm.config.ts
└── .env / .env.production

Proyecto1Front/
├── src/
├── .env.development
├── .env.production
├── vercel.json
└── vite.config.ts
```

## Justificación de la elección de herramientas de despliegue

Para el despliegue del sistema se evaluaron distintas alternativas de hosting para cada componente (backend, frontend y base de datos), priorizando opciones que permitieran una puesta en producción rápida, sin costo para un proyecto académico, y con una curva de aprendizaje baja para el equipo.

### Render (Backend)
Se eligió Render porque permite desplegar directamente a partir de un Dockerfile, lo cual se ajustaba a la forma en que ya estaba containerizado el backend en desarrollo. Además, ofrece integración continua con GitHub (redeploy automático ante cada push), logs accesibles en tiempo real para debug, y un plan gratuito suficiente para las necesidades de un entorno de prueba o demo. Esto evitó tener que configurar manualmente un servidor o pipeline de CI/CD desde cero.

### Vercel (Frontend)
Vercel es una de las plataformas más utilizadas para desplegar aplicaciones frontend modernas, con soporte nativo para proyectos Vite/React. Se optó por esta herramienta por su configuración prácticamente automática (detecta el framework y el comando de build sin configuración adicional), tiempos de build muy rápidos, CDN global incluida, y también por ofrecer un plan gratuito acorde al alcance del proyecto. El manejo de rewrites para SPA (necesario para que funcione React Router) es simple mediante vercel.json.

### Aiven (Base de datos)
Para la base de datos se buscó un servicio administrado que evitara mantener manualmente un servidor de MySQL en producción (parches de seguridad, backups, escalado, etc.). Aiven ofrece un plan gratuito de prueba con una instancia de MySQL completamente administrada, conexión segura por SSL, y una configuración sencilla de variables de entorno para conectarla con el backend. Esto permitió separar la persistencia de datos del hosting de la API, siguiendo buenas prácticas de arquitectura.

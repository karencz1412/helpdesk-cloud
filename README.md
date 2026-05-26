# HelpDesk Cloud — Sistema de Tickets y Soporte DevOps

Proyecto final DevOps: plataforma HelpDesk en la nube para creación, gestión y seguimiento de tickets de soporte técnico.

## Qué incluye

- Frontend React con páginas de login, registro, dashboard, tickets, administración, usuarios y reportes.
- Backend Node.js + Express + PostgreSQL.
- Autenticación con JWT y roles: Usuario, Técnico y Administrador.
- Base de datos PostgreSQL con tablas `users`, `tickets`, `ticket_comments`, `ticket_history` y `attachments`.
- Dockerfile para frontend y backend.
- Docker Compose para levantar frontend, backend, PostgreSQL, Nginx, Prometheus y Grafana.
- Docker Swarm mediante `stack.yml`.
- Pipeline CI/CD con GitHub Actions.
- Nginx como proxy inverso.
- Prometheus y Grafana para monitoreo.
- Documentación técnica, diagramas y guía de despliegue en Azure.
- Website widget del chatbot Docs2AI integrado en el frontend.

## Estructura

```text
helpdesk-cloud/
├── backend/
├── frontend/
├── nginx/
├── monitoring/
│   ├── prometheus/
│   └── grafana/
├── docker-compose.yml
├── stack.yml
├── .github/workflows/ci-cd.yml
├── docs/
├── .env.example
└── README.md
```
## Usuarios de prueba

El sistema crea usuarios iniciales para fines de demostración.  
Las credenciales pueden consultarse o modificarse desde el archivo de inicialización de la base de datos.

## Ejecutar localmente con Docker Compose

1. Copiar variables de entorno:

```bash
cp .env.example .env
```

2. Levantar los servicios:

```bash
docker compose up -d --build
```

3. Abrir en navegador:

- Aplicación: http://localhost
- Backend API: http://localhost/api/health
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

Credenciales Grafana:

```text
Usuario: admin
Contraseña: admin123
```

## Ejecutar sin Docker para desarrollo

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Despliegue con Docker Swarm

En la VM de Azure:

```bash
docker swarm init
cp .env.example .env
docker stack deploy -c stack.yml helpdesk
```

Ver servicios:

```bash
docker service ls
```

Ver logs:

```bash
docker service logs helpdesk_backend -f
```

## Pipeline CI/CD

El archivo `.github/workflows/ci-cd.yml` realiza:

1. Clonar repositorio.
2. Instalar dependencias del frontend y backend.
3. Ejecutar pruebas básicas.
4. Construir imágenes Docker.
5. Publicar imágenes en Docker Hub.
6. Conectarse por SSH a la VM de Azure.
7. Actualizar el stack de Docker Swarm.

Configura estos secretos en GitHub:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
AZURE_VM_HOST
AZURE_VM_USER
AZURE_VM_SSH_KEY
JWT_SECRET
POSTGRES_PASSWORD
```

## Documentación

La carpeta `docs/` contiene:

- `01-introduccion.md`
- `02-objetivos.md`
- `03-arquitectura-cloud.md`
- `04-configuracion-azure.md`
- `05-docker-contenedores.md`
- `06-ci-cd.md`
- `07-seguridad.md`
- `08-monitoreo.md`
- `09-evidencias.md`
- `10-retos-conclusiones.md`
- `diagramas.md`
- `guion-presentacion.md`

## Checklist de cumplimiento

| Requisito | Cumplimiento |
|---|---|
| Aplicación administrativa | Sistema de tickets HelpDesk |
| Frontend | React |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| Autenticación | JWT + bcrypt |
| Roles | Usuario, Técnico, Administrador |
| Docker | Frontend, backend, PostgreSQL, Nginx, Prometheus y Grafana |
| Orquestación | Docker Swarm con `stack.yml` |
| CI/CD | GitHub Actions |
| Cloud | Azure VM |
| Proxy | Nginx |
| Monitoreo | Prometheus + Grafana |
| Seguridad | Firewall, SSH, JWT, variables de entorno |
| Diagramas | Arquitectura, red, CI/CD y contenedores |
| Chatbot | Widget Docs2AI integrado |

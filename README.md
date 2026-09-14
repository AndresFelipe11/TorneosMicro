# TorneosMicro

Aplicativo web para programar torneos de microfútbol: todos contra todos, fases de grupos o cuadrangular. Genera el calendario según las fechas y días de juego, permite cargar resultados y muestra tablas de posiciones y goleadores.

## Requisitos

- Node.js 20+
- PostgreSQL (Neon u otra instancia)

## Configuración

1. Copia `.env.example` a `.env` y completa `DATABASE_URL`, `DIRECT_URL` y `AUTH_SECRET`.
2. Instala dependencias: `npm install`
3. Empuja el esquema: `npx prisma db push`
4. Carga el admin y el torneo demo: `npx prisma db seed`
5. Arranca: `npm run dev`

El primer usuario se crea con `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `.env` y queda como **admin global**. Ese usuario puede crear más administradores: globales (todos los torneos) o de un torneo (solo los asignados).

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npx prisma db seed` — admin + Copa Micro Demo

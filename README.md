# Asistencias COBACH 35 — Sistema web

Panel del orientador y del administrador. Vue 3 + TypeScript + Vite + Pinia + Vue Router + Tailwind 4.
Consume la API de `../asistencias_back` (Laravel) con token Bearer, igual que la app móvil.

Avance, fases y pendientes: `COBACH35_Sistema_Web.md` en el proyecto de Claude.

## Requisitos

- Node `^22.18` o `>=24.12` (`node -v`)
- El backend corriendo en `http://127.0.0.1:8000` **o** el mock de Prism

## Arrancar

```bash
npm install
npm run dev          # contra el backend real en http://127.0.0.1:8000/api
```

Sin backend, contra el mock generado de `openapi.yaml`:

```bash
npm run mock         # terminal 1 — Prism en :4010
npm run dev:mock     # terminal 2 — apunta a http://127.0.0.1:4010
```

Abre http://localhost:5173. Usuarios demo (contraseña `password`, solo local):
`admin`, `orientador1`, `orientador2`, `docente1`, `docente2`, `superadmin`.

Para otra URL (otra máquina, producción), copia `.env.example` a `.env` y cambia `VITE_API_URL`.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` / `dev:mock` | Servidor de desarrollo contra backend real / mock |
| `npm run gen:api` | Regenera `src/api/schema.d.ts` desde `../asistencias_back/openapi.yaml` |
| `npm run type-check` | Revisa tipos (falla si el front no cuadra con el contrato) |
| `npm run build` | Type-check + build de producción en `dist/` |
| `npm run lint` / `format` | oxlint + eslint / prettier |

**Cada vez que cambie `openapi.yaml`:** `npm run gen:api && npm run type-check`.

## Estructura

```
src/
├─ api/        http.ts (axios + token + 401), auth.ts, tipos.ts, schema.d.ts (generado, no editar)
├─ stores/     auth.ts — sesión, permisos y puede(permiso)
├─ router/     rutas con meta.permiso / meta.seccion + guard
├─ layouts/    AppLayout — el menú se arma solo con las rutas que el usuario puede ver
└─ views/      auth/, InicioView, PendienteView (pantallas por programar), 403, 404
```

### Agregar una pantalla

1. Crear la vista en `src/views/...`.
2. Agregar la ruta como hija de `AppLayout` en `src/router/index.ts` con `meta: { titulo, seccion, permiso }`.

Con eso aparece en el menú y en Inicio para quien tenga el permiso, y el guard bloquea al resto (pantalla 403).
**Se decide por permiso, nunca por nombre de rol.** El backend vuelve a validar cada petición; el front solo oculta.

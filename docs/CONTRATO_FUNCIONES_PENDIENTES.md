# Contrato de API — funciones pendientes del backend

El front ya implementa estas cuatro funciones, pero el backend todavía no tiene
los endpoints. Cada una está apagada por una variable de entorno y se enciende
cuando el backend cumpla este contrato:

| Función | Variable del front | Servicio dueño |
|---|---|---|
| Reportar obras | `VITE_FEATURE_REPORTES` | `artagram-feed` |
| Artistas seguidos dibujando ahora | `VITE_FEATURE_PRESENCIA` | `artagram-canvas` |
| Comunidades recomendadas | `VITE_FEATURE_COMUNIDADES_RECOMENDADAS` | `artagram-canvas` |
| Login con Google | `VITE_FEATURE_LOGIN_EXTERNO` | `artagram-auth` |

Para probar el front sin backend se pueden encender en caliente desde la
consola del navegador:

```js
localStorage.setItem('artagram.features', '{"reportes":true,"presencia":true,"comunidadesRecomendadas":true,"loginExterno":true}')
```

Todas las rutas pasan por el gateway (`:8080`), usan `Authorization: Bearer <jwt>`
salvo que se indique otra cosa, y los errores siguen el formato estándar
`{ code, message, traceId, violations }` de `artagram-infra/docs/contracts.md`.

---

## 1. Reportar obras (`artagram-feed`)

### `POST /api/publicaciones/{id}/reportes`
Cualquier usuario autenticado que **no** sea el autor.

```json
{ "motivo": "SPAM | CONTENIDO_INAPROPIADO | PLAGIO | ACOSO | OTRO", "detalle": "texto opcional, máx. 500" }
```

- `201` → `{ "id": "UUID", "estado": "PENDIENTE" }`
- `400 VALIDACION` → motivo inválido, o `detalle` vacío cuando `motivo = OTRO`
- `403 REPORTE_PROPIO` → el autor intenta reportar su propia obra
- `409 REPORTE_DUPLICADO` → el usuario ya tiene un reporte pendiente de esa obra

### `GET /api/reportes?estado=PENDIENTE` — solo `rolGlobal = ADMIN`
```json
[
  {
    "id": "UUID",
    "publicacionId": "UUID",
    "publicacionTitulo": "string",
    "obraUrl": "string",
    "autorNombre": "string",
    "reportanteNombre": "string",
    "motivo": "PLAGIO",
    "detalle": "string | null",
    "estado": "PENDIENTE | ACEPTADO | DESCARTADO",
    "creadoEn": "ISO-8601"
  }
]
```

### `PATCH /api/reportes/{id}` — solo `ADMIN`
```json
{ "estado": "ACEPTADO | DESCARTADO" }
```
- `ACEPTADO` elimina la publicación (mismo efecto que `DELETE /api/publicaciones/{id}` como admin) y marca como `ACEPTADO` los demás reportes pendientes de esa obra.
- `200` → el reporte actualizado (mismo DTO del listado).

> **Gateway:** hace falta agregar `/api/reportes/**` a la ruta de `artagram-feed`
> (`/api/admin/**` ya está tomada por `artagram-users`).

---

## 2. Artistas seguidos dibujando ahora (`artagram-canvas`)

`artagram-canvas` ya detecta cuándo alguien entra o sale de un lienzo o una
sala de fiesta (`KpiSessionListener`, suscripciones a `/topic/lienzo/{id}` y
`/topic/fiesta/{id}`). Falta exponerlo. Para saber a quién sigue cada usuario,
canvas debe mantener una proyección de seguidores consumiendo
`follow.created` / `follow.deleted`, igual que `artagram-feed`.

### `GET /api/presencia/seguidos`
Artistas que el usuario sigue y que **ahora mismo** están conectados a un lienzo o sala.

```json
[
  {
    "usuarioId": "UUID",
    "nombreArtista": "string",
    "lugar": "LIENZO | FIESTA",
    "comunidadId": "UUID | null",
    "comunidadNombre": "string | null",
    "salaId": "UUID | null",
    "desde": "ISO-8601"
  }
]
```

**Privacidad:** si el lienzo es de una comunidad privada de la que el usuario
que consulta no es miembro, `comunidadId` y `comunidadNombre` van en `null`.
`salaId` va siempre en `null` (las salas de fiesta se unen por código).

### Evento en vivo — STOMP `/user/queue/presencia`
Se envía a cada seguidor cuando el artista entra o sale:

```json
{ "tipo": "EMPEZO_A_DIBUJAR | DEJO_DE_DIBUJAR", "artista": { …mismo DTO de arriba… } }
```

---

## 3. Comunidades recomendadas (`artagram-canvas`)

Hoy no hay ningún endpoint que liste comunidades públicas, así que el front no
puede recomendar comunidades por sí solo.

### `GET /api/comunidades/recomendadas?limite=5`
Comunidades **públicas** de las que el usuario **no** es miembro, ordenadas por relevancia.

```json
[
  {
    "id": "UUID",
    "nombre": "string",
    "descripcion": "string",
    "publica": true,
    "creador": "string",
    "totalMiembros": 12,
    "miRol": null,
    "motivo": "3 artistas que sigues son miembros"
  }
]
```

Sugerencia de criterio: miembros que el usuario sigue (peso alto), actividad
reciente del lienzo y número de miembros. `motivo` es un texto corto para mostrar.
Para unirse se usa el endpoint que ya existe: `POST /api/comunidades/{id}/miembros`.

---

## 4. Login con Google (`artagram-auth`)

Flujo OAuth 2.0 / OpenID Connect con *authorization code* resuelto **en el backend**
(el secreto del cliente nunca llega al navegador). Para no poner el JWT en la URL,
el backend devuelve al front un código de un solo uso que se canjea por la sesión.

1. **Inicio** — el front navega (navegación completa, no `fetch`) a:
   `GET /api/auth/oauth2/google/autorizar?retorno=<url del front>/login/oauth`
   - Público. El backend valida que `retorno` esté en una lista blanca (`CORS_ORIGINS`), guarda `state` + `retorno` y responde `302` a Google.
2. **Callback** — Google vuelve al backend (`/api/auth/oauth2/google/callback`). El backend:
   - valida `state` y el `id_token`,
   - busca el usuario por correo verificado o lo crea (`nombreArtista` generado a partir del nombre, único; `verificado = true`; publica `user.registered`),
   - responde `302` a `retorno?codigo=<código de un solo uso, 60 s>`.
   - Si algo falla: `302` a `retorno?error=<CODIGO>` (`ACCESO_DENEGADO`, `CORREO_NO_VERIFICADO`, `ERROR_PROVEEDOR`).
3. **Canje** — el front llama a `POST /api/auth/oauth2/canjear` (público):
   ```json
   { "codigo": "string" }
   ```
   - `200` → el mismo `LoginResponse` de `/api/auth/login`, más `"cuentaNueva": boolean`
   - `400 CODIGO_INVALIDO` → código vencido, ya usado o inexistente

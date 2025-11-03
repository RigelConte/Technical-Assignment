## Formify – Technical Assignment (Senior 3D Web Developer) Possible Solution (Rigel Conte 11/03/2025) .:. Forked from main branch .:.

### Quick start (Docker Compose)

.env is optional — docker-compose has sane defaults. Run:

```bash
docker compose up --build
```

https://github.com/user-attachments/assets/d63c8175-4488-4efa-af2e-934b04bb41d7

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Postgres: `localhost:5432` (db `formify`, user `postgres`, password `postgres`)

This repository is dedicated to bring a possible soutions to the Formify  assignemnt test and implements a The addDoor functionality, and AI tool for user direct commands and a Prima feature for snapshots layer and classification.


### Highlights

- **Wood material configurator**: Real‑time, procedural wood appearance with configurable genuses/finishes and physically based lighting.
- **Snapshots (save/restore) with Prisma ORM**: Serialize the full configurator state, persist to the backend, and restore later to continue editing.
- **Modern 3D stack**: React + React Three Fiber + Three.js, optional WebGPU renderer fallback to WebGL.
- **Typed API + Postgres**: Express routes to create/list/load/update/delete saved states, validated and stored in PostgreSQL.
- **NLP AI tool**: Uses commands such as "Add door" "remove column" to optimize the UI Interface.


## Architecture

- **Monorepo** powered by Bun workspaces:
  - `services/frontend-react` – React + Vite + TypeScript + Zustand + R3F/Drei
  - `services/backend-express` – Express + TypeScript + `pg`
  - Orchestrated via `docker-compose.yml` for hot‑reload dev (frontend, backend, Postgres)

### Frontend (React, R3F, Three.js)

- Rendering surface in `ProductCanvas.tsx`:

  - Prefers WebGPU (`three/webgpu`) whenever available and secure; otherwise falls back to `THREE.WebGLRenderer`.
  - Uses physically correct lighting and consistent tone mapping per backend (WebGPU: Neutral; WebGL: ACES Filmic).
  - Ambient, hemisphere, and a shadow‑casting directional light with tuned map size/bias for clean soft shadows.
  - Uses `preserveDrawingBuffer` on the WebGL path to make snapshot capture reliable.

- Configurator store in `createNewConfiguratorModule.ts`:

  - A typed Zustand store models dimensions, frame/column/shelf thicknesses, material selection, and detailed wood parameters.
  - Geometry/layout helpers enforce valid spacing with forward/backward passes to clamp positions within the inner frame cavity.
  - Preset application merges mapped wood parameters for a given genus/finish.

- Snapshot helpers in `serialize.ts`:
  - `serializeModuleStore` emits a complete, versioned JSON snapshot of the module state.
  - `applySerializedState` restores the snapshot deterministically, re‑applying dimensions, elements, selection, material choice, and wood parameters.

### Backend (Express + Postgres)

- App bootstrap in `services/backend-express/src/index.ts` with CORS, JSON body parsing, and JSON error handling.
- Services of nlp ai implemented `/src/nlp.service.ts` 
- Saved routes of nlp ai `/src/routes/nlp.routes.ts` 
- Saved‑states routes are mounted under `/api/states` (`states.routes.ts`). Intended REST design:
  - `GET /api/states?limit&offset&query` → list summaries
  - `GET /api/states/:id` → fetch full saved state
  - `POST /api/states` → create new saved state (name, optional thumbnail, JSON snapshot)
  - `PUT /api/states/:id` → update name/thumbnail/state
  - `DELETE /api/states/:id` → remove
- Data model (table `configurator_states`): `id`, `name`, `thumbnail_data_url`, `state` (JSONB), timestamps, indexed by `created_at DESC`.
- Prisma Database snapshots implemented and classified to Postgres database 
via  `/prisma/schema.prisma` 

### Ai new Tool (OpenAI)

Available actions:
- add_door: Add doors to the wardrobe (optional count parameter, defaults to 1)
- remove_door: Remove doors from the wardrobe (optional count parameter, defaults to 1)
- change_material: Change wardrobe material (requires material name)
- modify_grid: Change wardrobe dimensions (requires width, height, or depth)
- add_shelf: Add shelves to the wardrobe (optional count parameter, defaults to 1)
- remove_shelf: Remove shelves from the wardrobe (optional count parameter, defaults to 1)
- add_column: Add columns to the wardrobe (optional count parameter, defaults to 1)
- remove_column: Remove columns from the wardrobe (optional count parameter, defaults to 1)
- set_dimensions: Set specific dimensions (requires width/height/depth in cm)

Materials available: oak, walnut, pine, birch, cherry

Respond ONLY with valid JSON in this exact format:
{
  "action": "action_name",
  "confidence": 0.0-1.0,
  "parameters": {},
  "clarification": "optional message if confidence < 0.7"
}

Examples:
- "add a door" → {"action": "add_door", "confidence": 0.95, "parameters": {"count": 1}}
- "add 2 doors" → {"action": "add_door", "confidence": 0.95, "parameters": {"count": 2}}
- "remove door" → {"action": "remove_door", "confidence": 0.95, "parameters": {"count": 1}}
- "delete door" → {"action": "remove_door", "confidence": 0.95, "parameters": {"count": 1}}
- "change material to oak" → {"action": "change_material", "confidence": 0.98, "parameters": {"material": "oak"}}
- "make it 200cm wide" → {"action": "set_dimensions", "confidence": 0.92, "parameters": {"width": 200}}
- "add a shelf" → {"action": "add_shelf", "confidence": 0.95, "parameters": {"count": 1}}
- "add 3 shelves" → {"action": "add_shelf", "confidence": 0.95, "parameters": {"count": 3}}
- "add a column" → {"action": "add_column", "confidence": 0.95, "parameters": {"count": 1}}
- "remove column" → {"action": "remove_column", "confidence": 0.95, "parameters": {"count": 1}}

If unclear, set confidence < 0.7 and provide clarification.`;

Example video

## Technical decisions

- **Renderer selection (WebGPU → WebGL)**: We detect capability and secure context to opt into WebGPU for better performance and temporal stability; the code bridges R3F’s render loop if `renderAsync` exists. WebGL is tuned for quality (tone mapping, exposure, soft shadows).
- **Physically based lighting**: Consistent tone mapping and IBL (`<Environment preset="studio"/>`) keep materials believable across backends.
- **Deterministic layout**: When size or thickness changes, we recompute column and shelf positions with clamped forward/backward passes to guarantee spacing invariants without overlaps.
- **Versioned serialization**: Snapshots include a `version` field to enable future migrations while keeping old saves compatible.
- **Strict TypeScript + ESLint**: Latest TS and ESLint ensure safe, legible code. In the UI we prefer `rem` over absolute `px` for scale consistency.
- **Strict TypeScript + ESLint**: Latest TS and ESLint ensure safe, legible code. In the UI we prefer `rem` over absolute `px` for scale consistency.


## API schema (snapshot shape)

The snapshot JSON aligns with the frontend store (see `serialize.ts`):

- **Root**: `{ version: '1', dimensions, columns, shelves, columnThickness, shelfThickness, frameThickness, materials, selectedMaterialKey, woodParams, selectedGenus, selectedFinish, hoveredId, selectedId }`

** Added the new prisma ORM layer that helps classification in various instances for the snapshots.
 ex.: "wardrobe" and "kitcken cabinets", and allow the current UI to filter between them

This structure is suitable for validation (e.g., with Zod) and storage in a `JSONB` column.

## Getting started

### Prerequisites

- Docker (Engine/Desktop) and Docker Compose
- Optional for local (non‑Docker) dev: Bun `1.x`

### 1) Clone

```bash
git clone <your-fork-or-repo-url> formify
cd formify
```

.env is optional (compose provides defaults via environment fallbacks). Create one only if you need overrides. If you do create a `.env`, typical keys: `API_PORT=3000`, `WEB_PORT=5173`, `VITE_API_URL=http://localhost:3000`, and `DATABASE_URL` for the backend.

### 2) Run with Docker (recommended)

```bash
docker compose up --build
```

### 3)  Natural Language & LLM Integration

In this solution OpenAI was the AI option.
Please make sure that tyour have an OPENAI_API_KEY Key for the environment;

```bash
 OPENAI_API_KEY="Your OpenAi Key"
```

If you prefere please, just add the key manually in the: 

`\services\backend-express\src\services\nlp.service.ts line 4 ` 

```bash
   apiKey: process.env.OPENAI_API_KEY 

  or 
  
  apiKey: "Your OpenAi Key" 
```
* I am using a temporary key that i have registered for this example

NLP_Demo_Version_2025-11-03 14-31-51.mp4

Addresses:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Postgres: `localhost:5432` (db `formify`, user `postgres`, password `postgres`)

Hot‑reload is enabled via bind mounts; node_modules are volume‑mounted per service.

## Development notes

- **TypeScript**: strict configuration; prefer explicit types on public APIs.
- **Linting**: latest ESLint rules; keep changes clean and legible.
- **Styling**: use `rem` for spacing/typography where applicable.


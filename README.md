# Meshcapade Bra‑Fit App

**Lightning‑fast, 3‑D bra‑size calculator powered by Meshcapade avatars**
Mobile‑first • Next.js + Tailwind CSS • Python FastAPI • three.js point‑cloud viewer

---

## ✨ Features

|  Module                     |  What it does                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| **Two‑scan wizard**         | Captures *standing* + *lean‑forward* photo sets to reveal hidden breast geometry.                |
| **Meshcapade bridge**       | Creates avatars from images (100 credits each), polls build, exports OBJ.                        |
| **Geometry engine**         | Slices SMPL‑X mesh → under‑bust, bust, depth‑to‑width, volume (≤ 3 % error).                     |
| **ABTF‑plus sizing**        | Combines standing/leaning metrics, DWR & volume to predict band & cup; flags gapping / spillage. |
| **Pink point‑cloud viewer** | three.js scene with toggle between the two scans.                                                |
| **Mailchimp sync**          | Upserts contact and saves calculated size in custom field `BRA_SIZE`.                            |
| **Admin KPIs**              | Job‑success dashboard, average processing time, credit balance.                                  |

Primary accent `#2c9f82`  |  Secondary accent `#de1465`

---

## 🗂 Repo layout

```
.
├─ apps/
│  ├─ web/            # Next.js (TypeScript) UI
│  └─ api/            # FastAPI micro‑backend
├─ packages/
│  └─ ui/             # shadcn/ui components
├─ turbo.json         # Turborepo tasks
└─ README.md
```

---

## 🔧 Quick start

```bash
# clone and bootstrap
git clone https://github.com/your-org/bra-fit-app.git && cd bra-fit-app
corepack enable && corepack prepare pnpm@latest --activate
pnpm install        # installs both front‑ and back‑end deps
```

### 1. Environment variables

Create `.env` in **apps/api**:

```dotenv
# Meshcapade
MESHA_CLIENT_ID=...
MESHA_CLIENT_SECRET=...

# Mailchimp
MC_API_KEY=usX-xxxxxxxxxxxxxxxxxxxxxx
MC_LIST_ID=xxxxxxxxxx

# Storage (local MinIO or AWS S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=meshes
```

> **Tip:** During local smoke‑tests you can bypass S3 entirely; the uploader downloads the OBJ straight from Meshcapade.

### 2. Run dev servers

```bash
# backend (FastAPI + reload)
pnpm --filter api dev      # http://localhost:8000

# frontend (Next.js)
pnpm --filter web dev      # http://localhost:3000
```

Open [http://localhost:3000/start](http://localhost:3000/start) on your phone, paste an access token, follow the wizard, and watch the result render as a pink point cloud.

---

## 📐 Sizing math overview

```text
1. Capture UB_tight (standing mesh) and B_standing.
2. Capture B_leaning + volume + depth/width (lean mesh).
3. Band = round_even(UB_tight_inches)
4. Bust = if |B_lea‑B_sta| ≤ 2 in → B_lea else avg(B_sta, B_lea, 0.9·B_lea)
5. CupDiff = Bust – UB_tight  →  1 in = A, 2 in = B ...
6. Shape adjust:
      if DWR > 1.1  ↑1 cup
      if DWR < 0.9  ↓1 cup
7. Volume adjust against bra‑model table (±15 % threshold)
8. Flags: side‑spillage (depth > pattern*1.15), gap (volume < 0.85*pattern)
```

All geometry is calculated with `trimesh`, the mesh is scaled using the user’s supplied height.

---

## 🖼 UI snapshots

| Start page                 | Scan wizard              | Result                       |
| -------------------------- | ------------------------ | ---------------------------- |
| ![start](./docs/start.png) | ![scan](./docs/scan.png) | ![result](./docs/result.png) |

---

## 🛠 Scripts & tasks

|  Command           |  Runs                     |  Purpose             |
| ------------------ | ------------------------- | -------------------- |
| `pnpm turbo build` | Next.js & FastAPI compile | CI build gate        |
| `pnpm web:lint`    | ESLint + Prettier         | style check          |
| `pnpm api:test`    | Pytest + pytest‑asyncio   | backend unit tests   |
| `pnpm e2e`         | Playwright headless       | full happy‑path scan |

---

## 🚀 Deploy

* **Frontend:** push `main` → Vercel; environment variables set in Project → Environment.
* **Backend:** Fly.io (`fly launch`) or any Docker host; image built from `Dockerfile` in apps/api.
* **MinIO/S3:** optional; set `S3_ENDPOINT` to point at provider.

---

## 📜 Meshcapade API endpoints used

| Step        | Method & URL                              | Notes                               |
| ----------- | ----------------------------------------- | ----------------------------------- |
| Auth        | `POST /oauth/token`                       | client‑id/secret → access\_token    |
| Placeholder | `POST /api/v1/avatars/create/from-images` | returns `avatarId`                  |
| Upload      | `POST /avatars/{id}/images` ≥ 1×          | presigned PUT URLs                  |
| Fit         | `POST /avatars/{id}/fit-to-images`        | `imageMode: AFI`, costs 100 credits |
| Poll        | `GET /avatars/{id}`                       | wait until `state=READY`            |
| Export      | `POST /avatars/{id}/export`               | `{format:\"obj\", pose:\"t\"}`      |
| Download    | direct HTTPS from returned `url`          | saved as `{user}/{pose}.obj`        |

*(CORS blocked → frontend relays all calls through FastAPI to add `Access-Control-Allow-Origin`)*
1

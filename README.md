# StepTrack

A web-based decision-support platform for following a child's development. This repository currently contains the walking skeleton (v0.0): a React frontend that calls an Express API backed by SQLite.

Requirements and design documents are in the `Docs` folder.

## Tech stack

- Frontend: React (Vite)
- Backend: Node.js + Express
- Database: SQLite (`better-sqlite3`)

## Requirements

- Node.js 20 or newer
- Git

## How to run

1. Clone the repository and install the dependencies:

```
git clone https://github.com/Dotokafu/SENG-383-Team.git
cd SENG-383-Team
cd backend
npm install
cd ../frontend
npm install
cd ..
```

2. Start the backend (first terminal):

```
cd backend
node src/server.js
```

The API runs at http://localhost:3001. The SQLite database file is created automatically on the first start.

3. Start the frontend (second terminal):

```
cd frontend
npm run dev
```

4. Open http://localhost:5173 in the browser. The page should show `Backend: ok / Database: connected`.

You can also check the API directly at http://localhost:3001/api/health.
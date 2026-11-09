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

2. Create the backend settings file `backend/.env` from the example (once):

```
cd backend
copy .env.example .env
```

(on macOS or Linux use `cp .env.example .env`). Open `backend/.env` and replace the value of `JWT_SECRET` with a long random string, for example the output of:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The `.env` file is private and is never committed.

3. Create the database tables and the demo data (once, and again whenever you want to reset the data):

```
cd backend
npm run seed
```

All demo accounts use the password `Password123!`, for example `parent1@example.com` (parent), `teacher1@example.com` (specialist) and `child1@example.com` (child). The data is synthetic.

4. Start the backend (first terminal):

```
cd backend
node src/server.js
```

The API runs at [http://localhost:3001](http://localhost:3001). The SQLite database file is created automatically on the first start.

5. Start the frontend (second terminal):

```
cd frontend
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in the browser. You should see the login page; log in with one of the demo accounts above (for example `parent1@example.com`). Under the form the page shows `Backend: ok / Database: connected`.

You can also check the API directly at [http://localhost:3001/api/health](http://localhost:3001/api/health).

## Tests

```
cd backend
npm test
```

The backend tests use a temporary in-memory database, so they do not need the server and do not change your data.
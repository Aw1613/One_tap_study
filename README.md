# 🔥 StudyFlare

> **Find someone to study with — right now, right in your hostel.**

StudyFlare is a real-time study matching app built for hostel students. You "broadcast" a Flare when you want to study, and anyone in your hostel can see it, join it, and chat with you instantly. No scheduling, no DMs, no awkwardness — just open a flare and see who's studying nearby.

---

## What It Does

- **Broadcast a Flare** — Tell everyone in your hostel what you're studying and for how long. It auto-expires when you're done.
- **Discover Flares** — See active flares from students in your hostel in real time.
- **Join & Chat** — Tap "Join Study" on any flare to open a live group chat with that student.
- **Your Profile** — Sign in with Google, pick your hostel, and you're set. No lengthy setup.
- **Hindi / English** — Switch between languages right from the nav bar.

---

## Tech Stack

| Layer | What's Used |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Motion (Framer Motion) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firebase Firestore (real-time) |
| Icons | Lucide React |
| Build Tool | Vite |
| AI Integration | Google Gemini (`@google/genai`) |

---

## Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd studyflare
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your environment

Copy the example env file and fill in your Gemini API key:

```bash
cp .env.example .env
```

Then open `.env` and add:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Firebase setup

The app is already connected to a Firebase project via `firebase-applet-config.json`. If you want to use your own Firebase project:

1. Create a project at [firebase.google.com](https://firebase.google.com)
2. Enable **Authentication** (Google provider) and **Firestore**
3. Replace the values in `firebase-applet-config.json` with your own config

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

---

## How to Use It

1. **Sign in** with your Google account
2. **Pick your hostel** — you'll only see flares from students in the same hostel
3. **Hit the + button** to broadcast your own Flare (subject, description, duration)
4. **See active flares** from your hostel on the Discover tab
5. **Tap "Join Study"** to open a live chat with that student
6. **Your chats** stay visible in the Chats tab as long as the flare is active

---

## Project Structure

```
.
├── src/
│   ├── App.tsx              # Main app — all views and logic
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles + Tailwind
│   └── lib/
│       ├── firebase.ts      # Firebase init + auth helpers
│       └── utils.ts         # Tailwind class merge helper (cn)
├── firebase-applet-config.json  # Firebase project config
├── firebase-blueprint.json      # Firestore data schema reference
├── firestore.rules              # Firestore security rules
├── index.html
├── vite.config.ts
└── package.json
```

---

## Firestore Data Model

The app uses four collections:

- **`/users/{userId}`** — Profile info: name, photo, email, hostel, bio
- **`/flares/{flareId}`** — Study flares: subject, description, hostel, expiry, active status
- **`/messages/{messageId}`** — Chat messages tied to a specific flare
- **`/friendships/{friendshipId}`** — Connections between students (pending/accepted)

---

## Hostels Supported

Boys Hostel 1–8 and Girls Hostel 1–2. You can easily add more by editing the `HOSTELS` array in `App.tsx`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check with TypeScript |

---

## Contributing

This was built as a hackathon project, but contributions are welcome! Feel free to open issues or PRs for bugs, new features, or improvements.

---

## License

Apache 2.0 — see source file headers for details.

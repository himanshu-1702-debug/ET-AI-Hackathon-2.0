# Setup Instructions (for you — delete this file before pushing to GitHub)

This file walks you through getting the project running on your machine. It's
written for local use only. Once everything works, delete `instructions.md`
before you push the repository anywhere public — everything else in the
project is written to stand on its own without it.

---

## 1. Get an Anthropic API key

1. Go to console.anthropic.com and sign up or log in.
2. Go to Settings → Billing, add a payment method, and add $5–10 in credit.
   This is pay-as-you-go, no subscription needed.
3. Go to Settings → API Keys, click Create Key, and copy it immediately —
   it's shown only once.

If credit runs low later, just add more on the same page — the key itself
doesn't need to change.

## 2. Set up a virtual environment and install backend dependencies

A virtual environment keeps this project's exact package versions isolated
from anything else installed on your machine — this prevents version
conflicts and dependency mismatches down the line.

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

On Mac/Linux, activate with `source venv/bin/activate` instead.

You should see `(venv)` at the start of your terminal prompt once it's
active. **Every time you open a new terminal to run the backend, activate
the virtual environment first** before running uvicorn:

```
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Whenever you receive an updated copy of this project, reactivate the
virtual environment and run `pip install -r requirements.txt` again to
pick up any dependency changes.

## 3. Add your API key

```
cp .env.example .env
```

Open `.env` in a text editor and replace `your_key_here` with your real key:

```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

Save the file. Never commit `.env` — it's already excluded by `.gitignore`.

## 4. Run the backend

Make sure your virtual environment is activated (you should see `(venv)`
in your prompt — if not, run `venv\Scripts\activate` from the `backend`
folder first), then:

```
uvicorn app.main:app --reload --port 8000
```

You should see "Uvicorn running on http://127.0.0.1:8000". Leave this
terminal open.

## 5. Install and run the frontend

In a second terminal:

```
cd frontend
npm install
npm run dev
```

Open the URL it prints, usually `http://localhost:5173`.

If `npm` isn't recognized on Windows, install Node.js from nodejs.org (the
LTS version), then close and reopen your terminal before trying again.

## 6. Log in

Four accounts are built in, all with password `demo123`:

| Username | Role |
|---|---|
| `maintenance.lead` | Maintenance Lead |
| `compliance.officer` | Compliance Officer |
| `safety.officer` | Safety Officer |
| `plant.manager` | Plant Manager — the only role that can reset demo data or view the observability screen |

The login screen has a button for each account that fills in the fields
for you.

## 7. Check the status bar

Once logged in, look at the top status bar. It should show a green "AI
ENGINE ONLINE" indicator. If it's red, double-check the key in `.env` and
make sure you restarted the backend after adding it — `.env` is only read
at startup.

## 8. Load sample documents

You don't need to do this manually anymore — the backend automatically
loads the full `sample_data/` corpus the first time it starts with a valid
API key in place. This only happens once; if the knowledge graph already
has data in it, startup skips seeding and starts normally. Give it a minute
or two on that very first run, since it's running real extraction on ~19
documents before the server finishes starting up.

If you want to reload the sample data from scratch, use the "Reset demo
data" button (visible when logged in as Plant Manager) and restart the
backend — seeding will run again since the graph will be empty.

## About the demo_uploads folder

Separate from `sample_data/`, there's a `demo_uploads/` folder with 3 files
meant for live demonstration once the app is already running with the
seeded data loaded — a PDF permit, a PDF maintenance log, and a P&ID-style
image. See `demo_uploads/README.md` for what each one demonstrates and a
suggested order.

## About chat history

Every conversation — Copilot, the tacit knowledge interview, and Field
Access — is saved permanently per logged-in account. Logging out and back
in, switching between tabs, or closing and reopening the browser won't lose
it. Each account only sees its own conversations, not other roles'.

## About voice input

Wherever you see a microphone icon next to a text input, you can speak
instead of typing. This uses Chrome's built-in speech recognition, which
works in Chrome and Chrome-based browsers (Edge, Brave) but not all
browsers support it — the mic icon simply won't appear if it's unsupported.
Note that despite being "built into the browser," this feature does send
audio to Google's servers for transcription in the background, so it needs
an internet connection to work, same as everything else here.

## If data seems to disappear between sessions

The reset button is the only thing in the app that intentionally clears
data, and it always asks for confirmation first. If documents you uploaded
seem to have vanished, the most likely explanation is that a fresh copy of
the project was extracted or downloaded over the old one — since the
project ships with an empty data folder by default, extracting a new copy
starts fresh rather than carrying over what you'd previously ingested.
Auto-seeding means it'll no longer look empty in that case, but anything
you'd added manually beyond the seeded set would need re-uploading. Keep
working from the same extracted folder rather than re-extracting a fresh
copy each time, and this won't come up.

## 9. Try it out

A few things worth trying once documents are loaded:

- Ask the Copilot: "Was there any overlap between hot work and confined
  space permits near Compressor B-12 in January?"
- Run a Compliance check on "Compressor B-12" — it should catch the
  overlapping permits.
- Run RCA on "Compressor B-12 sensor fluctuation" — it should trace the
  pattern across the maintenance log entries.

More test questions are in `docs/OPERATIONS.md`.

## Optional: real WhatsApp integration

The Field Access screen works out of the box in a simulated mode, wired to
the same real backend. If you want an actual WhatsApp number that can
receive real messages, here's the setup — about 15 minutes.

1. Create a free account at twilio.com/try-twilio.
2. In the Twilio Console, go to Messaging → Try it out → Send a WhatsApp
   message. You'll get a sandbox number and a join code like `join
   happy-tiger`.
3. Send that join code as a WhatsApp message to the sandbox number from
   your own phone to link it.
4. Copy your Account SID and Auth Token from the Twilio Console dashboard.
5. Add them to `backend/.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```
6. Expose your local backend to the internet with a tunnel, since Twilio
   can't reach `localhost` directly:
   ```
   ngrok http 8000
   ```
   This gives a public URL like `https://abc123.ngrok-free.app`.
7. In the Twilio Console's WhatsApp Sandbox settings, set "WHEN A MESSAGE
   COMES IN" to `https://abc123.ngrok-free.app/api/whatsapp/webhook`,
   method POST.
8. Message the sandbox number from your phone with a question — you should
   get a real answer back within a few seconds.

Note that free-tier ngrok URLs change every time you restart the tunnel, so
you'll need to update step 7 again if that happens. If this feels fragile
close to a demo, the simulated mode is a complete fallback — it uses the
same backend and produces identical answers.

## Optional: running everything with Docker

If you'd rather not install Python or Node locally:

```
docker compose up --build
```

Backend on `:8000`, frontend on `:5173`. You still need to add your API key
to `backend/.env` first, as in step 3.

## If something doesn't work

- Red status dot — key missing or wrong in `.env`, or the backend wasn't
  restarted after editing it.
- Errors mentioning a package version mismatch (for example, a `KeyError`
  coming from inside the `chromadb` package) — usually means the virtual
  environment isn't activated, or dependencies weren't reinstalled after an
  update. Activate the venv and run `pip install -r requirements.txt`
  again. If it persists, delete the contents of
  `backend/app/data/vector_store/` and restart — this rebuilds it fresh
  against whatever version is currently installed, without affecting the
  knowledge graph.
- Port already in use — something else is using 8000 or 5173; close it or
  change the port in the run command.
- More troubleshooting notes are in `docs/OPERATIONS.md`.

## Before you push to GitHub

- Delete this file (`instructions.md`).
- Set your own git identity if you haven't already:
  ```
  git config user.name "Your Name"
  git config user.email "your@email.com"
  ```
- Double check `.env` was never committed — `git status` should not show it.
- That's it.

# iFigmaLab

**Figma design → production-ready HTML/CSS/JS, powered by Google Gemini AI.**

iFigmaLab connects directly to Figma Desktop App via MCP (Model Context Protocol), feeds the design context into Gemini, and outputs a fully self-contained HTML file you can open in any browser.

---

## Features

- **Figma MCP Integration** — Fetch live design context (JSON) straight from Figma Desktop App via a lightweight proxy server
- **Screenshot Support** — Capture a visual snapshot of the design and include it alongside the structured data for higher fidelity output
- **Multi-Model Selection** — Choose from Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash-Lite, or 2.0 Flash to balance quality vs. cost
- **Token Counter** — Preview exact token usage before submitting to avoid surprises
- **Model Info** — Inspect token limits and model capabilities directly from the UI
- **Optimizer** — Strip unnecessary `data-*` attributes from the design context to reduce token count
- **Live Preview** — Rendered in a sandboxed iframe; no build step required
- **Source Export** — Download the generated HTML file with one click
- **Debug Log** — Timestamped request/response log for troubleshooting
- **API Key Persistence** — Opt-in "Remember" checkbox saves the key to localStorage

---

## How It Works

```
Figma Desktop App
  └─ Figma MCP Server  (:3845)
       └─ Proxy Server  (:3006)
            └─ iFigmaLab (browser)
                 └─ Google Gemini API  ← called directly from the browser
```

The Gemini API call is made **directly from the browser** — the proxy server is only used for fetching Figma design data and capturing screenshots.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Google Gemini API Key](https://aistudio.google.com/apikey) (free tier available)
- *(Optional)* Figma Desktop App + Proxy Server for live Figma integration

### Install & Run

```bash
git clone https://github.com/your-username/ifigmalab.git
cd ifigmalab
npm install
npm run dev
```

Open [http://localhost:3005](http://localhost:3005) in your browser.

### Build

```bash
npm run build
# Output: ./dist
```

---

## Usage

### With Figma (full integration)

1. Start **Figma Desktop App**
2. Start the **Proxy Server** on `localhost:3006`
3. Open iFigmaLab → **AGENT tab**: enter your Gemini API Key
4. **MCP tab**: paste a Figma Node ID or URL, click **Fetch**
5. Optionally click **Screenshot** to capture the design image
6. Click **Submit ▶**
7. View the result in the **VIEW tab**

### Without Figma (paste mode)

1. **AGENT tab**: enter your Gemini API Key
2. **MCP tab**: paste Design Context JSON directly into the Context field
3. Add any additional instructions in the **Prompt** field
4. Click **Submit ▶**

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 |
| State | Jotai |
| Styling | SCSS Modules |
| Bundler | Webpack 5 + Module Federation |
| Language | TypeScript 5 |
| AI | Google Gemini API (v1beta) |

---

## Project Structure

```
src/
├── App.tsx                          # 5-tab layout (AGENT / MCP / VIEW / LOG / HELP)
├── components/FigmaAgent/
│   ├── atoms.ts                     # Jotai global state atoms
│   ├── ControlLayer/
│   │   ├── AgentSetupPanel.tsx      # API key, model, localStorage persistence
│   │   ├── FigmaMcpPanel.tsx        # Figma connection, fetch, screenshot
│   │   └── InputPanel.tsx           # Prompt, token count, submit
│   └── ContentLayer/
│       ├── PreviewFrame.tsx         # Sandboxed HTML preview
│       └── StatusBar.tsx
├── shared/store.ts                  # Shared Jotai store
└── content/help.md                  # In-app help page
```

---

## Security Notes

- The Gemini API key is **never sent to any backend** — all API calls go directly from your browser to Google's servers.
- When "API 키 기억하기 (Remember)" is checked, the key is stored in `localStorage`. Use this only on personal/trusted machines.
- Generated HTML is rendered in a **sandboxed iframe** (`sandbox="allow-scripts allow-same-origin"`).

---

## License

MIT

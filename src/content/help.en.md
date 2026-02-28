# iFigmaLab User Guide

iFigmaLab is a tool that analyzes Figma designs using Google Gemini AI and converts them into immediately executable HTML, CSS, and JS code.

---

## 🚀 Quick Start

### Step 1: Set Up API Key (AGENT Tab)

- Enter your **Gemini API key**.
- Check **Encrypt and save locally** and enter a **PIN of 4 or more characters** to securely encrypt and store your API key in your browser's local storage. On your next visit, simply enter your PIN to unlock it.
- If you don't have an API key, click the **GET** link to get one for free at [Google AI Studio](https://aistudio.google.com/apikey).

### Step 2: Select AI Model (AGENT Tab)

- Select the desired AI model from the dropdown list, then click the **SET** button to apply it.
- Model selection and actual application are separate steps. You must click the **SET** button to finalize the selection.
- Click the **↻ Refresh** button to fetch the latest supported model list from the Gemini API. (An API key must be entered first.)

### Step 3: Fetch Design Data (MCP Tab)

Figma data can be imported via automatic integration or direct paste.

**Method A: Figma Auto Integration**
1. Launch the Figma desktop app.
2. Start the local Proxy server (`localhost:3006`).
3. Verify the connection status shows `Connected`.
4. Enter the Figma Node ID or full URL of the design you want to convert, then click the **Fetch** button.

**Method B: Direct Paste (Without Proxy Server)**
- To use without Proxy server integration, paste the design context (JSON format) copied directly from Figma into the Context input field.

### Step 4: Generate Code (MCP Tab)

- **Prompt**: Enter any additional instructions for the AI to reference when writing code. (Optional)
- **Count Tokens**: Preview the total token count that will be sent before clicking **Submit**.
- **Submit ▶**: Start the conversion request.
- Once conversion is complete, you can preview the result in the inline panel at the bottom, and use the notification in the bottom right to navigate to the VIEW tab for a full-screen preview.

---

## 📑 Tab Guide

- **AGENT**: Manage Gemini API key entry, AI model selection, and local encryption storage settings.
- **MCP**: Figma integration, design context input, code generation request, and inline preview of generated results.
- **VIEW**: Renders the AI-generated HTML code in a full-screen sandboxed iframe.
- **HELP**: The user guide page you are currently viewing.

---

## ⚙️ AGENT Tab Details

### AI Provider Support
Currently supports **Google Gemini** models by default. Claude, Codex, and other AI models will be added in future updates.

### API Key Management

| Item | Description |
|---|---|
| **Input Field** | The key is hidden by default for security. Use the Show/Hide button to view the value. |
| **Encrypt and save locally** | When checked, the API key is encrypted using AES with your PIN (4+ characters) and stored in the browser's `localStorage`. |
| **Unlock / Clear** | If a previously encrypted key is detected, a lock screen appears. Enter your PIN to unlock, or click Clear to erase all stored data. |

### Model Settings

| Item | Description |
|---|---|
| **Dropdown** | A selectable list of available AI models. (Default: `gemini-2.5-flash`) |
| **↻ Refresh** | Dynamically fetches the currently available models (supporting the `generateContent` method) from the Gemini API in real time. |
| **SET** | Applies the selected model to the project. The button turns blue when a model that hasn't been applied yet is selected. |
| **Active Model** | The name of the model last applied via the SET button is displayed at the bottom of the UI. |

### Model Info (Get Model Info)
With a valid API key and model configured, clicking **Get Model Info** retrieves and displays detailed specs for that model (`version`, `input/output token limits`, `supported methods`, `Temperature`, etc.) in JSON format.

---

## 📐 MCP Tab Details

### Communication & Figma Integration (Figma MCP Integration Panel)

| Item | Description |
|---|---|
| **Server URL** | The MCP server address within the Figma desktop app. (Default: `http://localhost:3845`) |
| **Apply** | Re-verifies connectivity to the entered custom URL. |
| **Connection Status** | Polls the server every 10 seconds and displays `Connected` (green) or `Disconnected` (gray). |
| **Node ID** | Enter the target Node ID (e.g., `12-34`) or the full URL (both hyphen and colon formats are auto-parsed). |
| **Fetch** | Communicates with the Proxy server to retrieve design object information and populates the Context box below. |
| **Screenshot** | Captures a screenshot of the target screen based on Node ID and attaches it as a visual input for AI. (Requires active Figma integration.) |
| **Image Preview** | Displays a thumbnail of the captured image. Use the **✕ Remove** option to prevent unnecessary image data from being sent to the model. |

### Conversion Request (Design Prompt Panel)

| Item | Description |
|---|---|
| **Context** | Figma design information (JSON format). Auto-populated from Fetch results or paste the original directly. |
| **Size Badge** | Calculates the byte (Byte/KB) size of the entered context in real time. |
| **Optimize** | Cleans up unnecessary Figma internal `data-*` attributes to reduce the size of the text sent. (Saves tokens) |
| **Prompt** | Additional requirements for AI generation (styles, functional constraints, etc.). If left empty, iFigmaLab's default prompt is used. |
| **Readiness Badge** | Displays API key availability and content existence at a glance using `✓` and `✗` symbols. |
| **Count Tokens** | Previews the estimated token consumption based on current inputs before submitting. |

### Viewing Results & Debugging

| Item | Description |
|---|---|
| **Preview / Features** | After submission, provides integrated tools including HTML source code (Show Code), rendered inline view, text download (`Download HTML`), and raw API response parsing checker (`Debug Info`). |
| **Debug Log** | A system log that records operation details (input validation, network latency, HTML tag integrity checks, etc.). Displays up to the last 500 lines to prevent memory leaks. Supports manual **Clear** action. |

---

## 🖥 VIEW Tab Guide

- Renders the final output (HTML document) produced by the AI model safely within an isolated `<iframe>` sandbox.
- When conversion is complete, a completion notification popup appears in the bottom right. Click the **Go to VIEW** button to immediately navigate to the full-screen preview. The notification closes automatically after 5 seconds.

---

## 🤖 Supported Models

| Model | Features & Recommendations |
|---|---|
| `gemini-2.5-pro` | **Best Performance** — Ideal for complex layout analysis and screen structure decomposition requiring diverse contexts. |
| `gemini-2.5-flash` | **Default** — A versatile model with excellent speed and solid quality, strong for practical conversion speed and cost efficiency. |
| `gemini-2.5-flash-lite` | **Lightweight** — The lightest and lowest-latency model for simple generation tasks. |
| `gemini-2.0-flash` | A stable flash model from the previous generation. |

> **Tip:** Use the **↻ Refresh** button in the `AGENT` tab to instantly sync and use newly released model names from the Google API.

---

## 🏗 System Architecture

```text
Figma Desktop App
  └─ Figma MCP Server  (:3845)
       └─ Proxy Server  (:3006)
            └─ iFigmaLab  (:3005, browser environment)
                 └─ Google Gemini API (v1beta)
```

- **Direct Gemini API Calls:** AI requests such as text/image transmission and code conversion are performed directly in the browser without going through a backend, minimizing server dependency and maximizing speed.
- **Proxy Role:** The Proxy server's sole responsibility is to act as a bridge to the local `Figma MCP Server` that the web browser cannot reach directly — reading data indirectly and performing screenshots.

---

## ⚠️ Troubleshooting & FAQ

**Q. "API Key is invalid" or an error message appears.**
- Go to the `AGENT` tab → Use **Get Model Info** to first verify the validity of your API key.
- Check whether invisible whitespace characters were included at the beginning or end of the key during copy/paste.

**Q. The button shows `Disconnected` and the Proxy server won't connect.**
- Check that a project file is properly open in the Figma desktop application.
- Use a terminal to verify that the Proxy Server (`localhost:3006`) is running correctly.
- If local environment setup is limited, you can paste the Design Context text data (from the plugin) directly into the input field as an alternative.

**Q. The Screenshot capture button is not clickable.**
- The capture function requires both active Proxy server integration (`Connected`) and a target Node ID entered.

**Q. I changed the model in the dropdown but the old model is still running.**
- After changing the dropdown selection, you must click the **SET** button (which turns blue) to fully apply the selected model to the system.

**Q. The generated HTML code is cut off or incomplete.**
- This occurs when the output exceeds the token limit of the LLM model. Check the `Debug Log` to see if a `MAX_TOKENS` stop error was recorded.
- Solutions: Use the **Optimize** feature to clean up Figma attributes, or use a higher-tier model like `gemini-2.5-pro` with a significantly larger maximum output token limit.
- For complex large components or very long designs, it is highly effective to split the capture scope by element and request code generation in multiple rounds.

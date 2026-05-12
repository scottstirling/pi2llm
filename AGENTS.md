# AGENTS.md — pi2llm (LLM Assistant for PixInsight)

## Runtime environment — this is not a Node.js project

All `.js` files execute inside **PixInsight's embedded SpiderMonkey (PJSR)** engine, not Node.js or a browser. There is no `package.json`, no `npm`, no `fetch()`, no `XMLHttpRequest`, and no DOM. Standard Node.js tooling (ESLint, Jest, Webpack, etc.) does not apply here.

## How scripts are loaded

PixInsight uses C-preprocessor–style directives, not ES modules:

```js
#include "./lib/configuration.js"   // relative path include
#include <pjsr/Sizer.jsh>           // PixInsight standard library include
#include <../src/scripts/AdP/WCSmetadata.jsh>  // AdP plate-solve library
```

`#define`, `#feature-id`, `#feature-info`, and `#feature-icon` are also preprocessor directives, not JavaScript. Do not replace them with `import`/`export` or `require()`.

## Entrypoint and load order

`pi2llm-main.js` is the only file PixInsight loads directly. It `#include`s the lib files in this required order:

1. `lib/configuration.js` — defines `Configuration` and `ConfigDialog`
2. `lib/extractors.js` — defines `ImagePreparer`, `cloneView`, `FitsKeywordExtractor`
3. `lib/image_profile.js` — defines `ImageProfile` (depends on `FitsKeywordExtractor`)
4. `lib/chat_ui.js` — defines `pi2llmChatDialog` and `formatSimpleMarkdown` (depends on `Configuration`, `ImageProfile`, `ImagePreparer`, `LLMCommunicator`)

`LLMCommunicator` is defined in `pi2llm-main.js` itself, after all includes.

## How to run / test

There is no build step, no compile step, no test runner command. Everything runs inside a live PixInsight instance:

- **Script tests** (`tests/*.js`): Open PixInsight → Script → Run Script File → select the test file. Each test calls its own `main()` or named function at the bottom.
- **API connectivity tests** (`tests/*.sh`): Run with `bash` from a terminal; they use `curl` and require the relevant env var (e.g. `OPENAI_API_KEY`, `CF_GATEWAY_AUTH_TOKEN`).
- **Main script**: Installed via Script → Feature Scripts → Add → select the `pi2llm/` folder.

There is no CI, no pre-commit hook, no linter config.

## Critical NetworkTransfer gotchas

PixInsight's `NetworkTransfer` is the only HTTP client available. It has sharp edges:

- **`setURL()` resets all custom headers** — always call `setURL()` before `setCustomHTTPHeaders()`, never after.
- **`transfer.setSSL()`** must be called explicitly for any `https://` URL; it is not automatic.
- **Response is a raw `ByteArray`** — use `response.utf8ToString()` to decode, not `.toString()` (which breaks on non-ASCII).
- **Unicode in the outgoing JSON payload must be escaped** after `JSON.stringify()` — the `unicodeEscape()` function in `pi2llm-main.js` handles this. Do not remove it.
- The API call is synchronous and blocks the UI thread. `processEvents()` must be called to let the UI repaint during long operations.

## LLM provider handling — how detection and dispatch works

Provider detection is **URL-based** inside `LLMCommunicator.sendMessage()`. Currently two code paths exist:

**Anthropic** — detected when `url.indexOf("api.anthropic.com") !== -1`:
- Auth header: `x-api-key: <key>` (not `Authorization: Bearer`)
- Extra required header: `anthropic-version: 2023-06-01` — requests are rejected without it
- Payload: the `{role:"system"}` message from `messages[]` is extracted and moved to a top-level `"system"` field; Anthropic rejects a system role inside the messages array
- Model field is required (no server-side default); falls back to `claude-3-5-sonnet-20241022` if omitted
- Response shape: `response.content[0].text`
- Error shape: `response.error.{type, message}`
- `adaptPayloadForAnthropic()` handles the payload transform; `isAnthropicUrl()` is the detector

**All other providers** (OpenAI, LM Studio, Ollama, llama.cpp, Gemini, OpenRouter, Cloudflare):
- Auth header: `Authorization: Bearer <key>` (skipped when apiKey is empty or `"no-key"`)
- Payload: passed through unchanged (OpenAI-compatible shape)
- Response tried in order:
  1. `response.choices[0].message.content` — OpenAI / LM Studio / Ollama / Gemini / OpenRouter
  2. `response.result.response` — Cloudflare AI Gateway
  3. `response[0].error.{message,code,status}` — generic error array

**Adding a new provider with a different shape:** add a detector function alongside `isAnthropicUrl()`, branch in `sendMessage()` for headers and payload, add a response-format branch in the parser block. Do not change the call sites in `chat_ui.js`.

**Smoke-testing providers without PixInsight:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."  && bash tests/test-anthropic.sh
export OPENAI_API_KEY="sk-..."         && bash tests/test-openai.sh
export CF_GATEWAY_AUTH_TOKEN="..."     && bash tests/test-cloudflare.sh
bash tests/test-ollama.sh    # no env var needed
bash tests/test-lmstudio.sh  # no env var needed
```

## Vision (image) request path

When visual analysis is enabled and the user opts in per-request:

1. `ImagePreparer.prepare(maxDimension)` clones the view via `cloneView()` (leaves the original untouched), resizes if needed, writes a temp JPEG to `File.systemTempDirectory`, reads it back, deletes it, and returns a `data:image/jpeg;base64,...` string.
2. `cloneView()` uses `beginProcess(UndoFlag_NoSwapFile)` / `endProcess()` — these must be balanced. The current code has a known asymmetry (one `endProcess()` inside the `if`-branch only); be careful when modifying that function.
3. The debug `newWindow.show()` call in `cloneView()` is intentionally left uncommented — it creates a visible temporary window during vision requests. Comment it out (`// newWindow.show()`) for production-clean behavior, or call `newWindow.forceClose()` after use.
4. The last `chatHistory` message is mutated in-place to the multipart vision format; `onSuccess` restores it to the plain object form for subsequent turns.

## Settings persistence

Settings are stored in PixInsight's internal key-value store via `Settings.read()` / `Settings.write()`, keyed under the `pi2llm/` prefix (defined as `SETTINGS_PREFIX`). Configuration profiles saved to disk use the `.pi2llm.json` extension and contain **API keys in plain text**.

## `WCSmetadata.jsh` dependency

`image_profile.js` includes `<../src/scripts/AdP/WCSmetadata.jsh>` — a PixInsight-bundled plate-solve library. This path is relative to PixInsight's installation. On non-Linux systems (macOS, Windows) the path resolves differently; if `ImageMetadata` is undefined at runtime, the include path is the cause.

## File/directory map

```
pi2llm-main.js          entrypoint + LLMCommunicator + unicodeEscape()
pi2llm-main.xsgn        PixInsight code signature — do not edit manually
lib/
  configuration.js      Configuration class + ConfigDialog UI
  extractors.js         ImagePreparer, cloneView, FitsKeywordExtractor
  image_profile.js      ImageProfile DTO (calls FitsKeywordExtractor + WCSmetadata)
  chat_ui.js            pi2llmChatDialog + formatSimpleMarkdown()
doc/
  LLMAssistant.pidoc    PixInsight native documentation source (pidoc format)
  scripts/              Compiled HTML output of the pidoc
etc/
  updates.xri           PixInsight update-repository descriptor
tests/
  test_*.js             PJSR scripts run inside PixInsight
  test-*.sh             curl scripts for API endpoint smoke-testing
```

## What not to do

- Do not add `export`/`import`, `require()`, or any Node.js-isms — they will cause PJSR parse errors.
- Do not call `console.clear()` — it erases previous session output the user may need.
- Do not use `transfer.response.toString()` — use `utf8ToString()`.
- Do not call `JSON.stringify()` without running the result through `unicodeEscape()` before passing to `NetworkTransfer.post()`.
- Do not edit `pi2llm-main.xsgn` — it is a cryptographic signature generated by PixInsight.

# Progress

## Current Status

**Version:** 2.5.0 — mature, feature-complete for v2 scope.

The project ships a working PixInsight script that:
- Extracts comprehensive image metadata and sends it to any OpenAI-compatible LLM.
- Supports vision/multimodal requests with in-memory JPEG encoding and base64 attachment.
- Provides a full chat UI with history, export, and settings management.
- Has a PixInsight update repository descriptor (`etc/updates.xri`) and a cryptographic code signature (`pi2llm-main.xsgn`).

## What Works (verified by code read + implementation)

- FITS keyword extraction via `FitsKeywordExtractor` (reads directly from file, skips in-memory views gracefully).
- Plate-solve astrometry via `ImageMetadata.ExtractMetadata()` from `WCSmetadata.jsh`.
- Live session processing history via `View.initialProcessing` and `View.processing` containers.
- Image cloning, resizing, JPEG compression, and base64 encoding via `ImagePreparer` + `cloneView()`.
- **Anthropic API support** (`api.anthropic.com`) — correct `x-api-key` + `anthropic-version` headers, system-prompt extracted to top-level field, `content[0].text` response parsing.
- OpenAI-compatible response format: `choices[0].message.content` (LM Studio, Ollama, Gemini, OpenRouter, etc.)
- Cloudflare AI Gateway response format: `result.response`.
- Settings persistence via `Settings.read/write` under `pi2llm/` key prefix.
- Save/load configuration profiles to `.pi2llm.json`.
- Export chat history to `.txt` or `.json`.
- `Ctrl+Enter` keyboard shortcut for sending messages.
- URL validation in `ConfigDialog` before accepting settings.
- First-run detection and guided setup.
- PixInsight native documentation (`LLMAssistant.pidoc` + compiled HTML).
- `AGENTS.md` created — documents runtime, load order, NetworkTransfer gotchas, full provider-handling details, and what not to do.

## Known Bugs / Incomplete Areas

| Issue | Location | Severity |
|-------|----------|----------|
| `beginProcess` called but `endProcess` only fires in resize branch | `lib/extractors.js` `cloneView()` | Medium — may cause PI undo state issues |
| `newWindow.show()` uncommented — debug window appears during vision requests | `lib/extractors.js` `cloneView()` | Low — cosmetic, not destructive |
| Cloned image forced to grayscale (`false`) regardless of source color space | `lib/extractors.js` `cloneView()` | Low — JPEG output still works |
| `loadProfile()` only restores a subset of config fields | `lib/configuration.js` `ConfigDialog` | Medium — silent data loss on profile load |
| `test-openai.sh` uses wrong Content-Type (`x-www-form-urlencoded`) | `tests/test-openai.sh` | Low — test script only, not production |
| API keys stored in plain text in `.pi2llm.json` | `lib/configuration.js` | Known, documented in README |
| Vision analysis only on first "Analyze" — subsequent chat turns are text-only | `lib/chat_ui.js` | By design, but not surfaced to user |

## Session History

| Session | Work Done |
|---------|-----------|
| 2026-05-07 (1) | Initial codebase read and analysis; memory bank initialized; `AGENTS.md` created; memory bank updated with full detail. |
| 2026-05-07 (2) | Anthropic provider support added to `LLMCommunicator` (`isAnthropicUrl`, `adaptPayloadForAnthropic`, header branching, response parsing); `tests/test-anthropic.sh` created; `AGENTS.md` updated with full provider-handling section; memory bank updated. |
| 2026-05-07 (3) | Removed stale `pi2llm-main.xsgn` — modifying `pi2llm-main.js` invalidated the cryptographic signature; PixInsight rejected the script at load time. Absence of `.xsgn` is valid (development mode); re-signing requires the upstream developer's `.xssk` private key. PR #16 updated. |

# System Patterns

## File Load Order (mandatory)

`pi2llm-main.js` is the sole PixInsight entrypoint. It includes lib files in this exact order — changing the order causes undefined-symbol errors at parse time:

```
1. lib/configuration.js   → Configuration, ConfigDialog
2. lib/extractors.js      → ImagePreparer, cloneView, FitsKeywordExtractor
3. lib/image_profile.js   → ImageProfile  (uses FitsKeywordExtractor)
4. lib/chat_ui.js         → pi2llmChatDialog, formatSimpleMarkdown
                              (uses Configuration, ImageProfile, ImagePreparer, LLMCommunicator)
```

`LLMCommunicator` and `unicodeEscape()` are defined in `pi2llm-main.js` after the includes — they are globally available to `chat_ui.js` because PJSR shares one global scope across all included files.

## Key Classes and Responsibilities

| Symbol | File | Responsibility |
|--------|------|----------------|
| `Configuration` | `lib/configuration.js` | Default values, `Settings` KV load/save, first-run detection |
| `ConfigDialog` | `lib/configuration.js` | UI for all settings; validates URL before accepting |
| `FitsKeywordExtractor` | `lib/extractors.js` | Opens image file, reads raw FITS keyword list |
| `ImagePreparer` | `lib/extractors.js` | Clones view, resizes, JPEG-compresses, base64-encodes for vision LLMs |
| `cloneView()` | `lib/extractors.js` | Creates a throw-away `ImageWindow` copy without touching the original |
| `ImageProfile` | `lib/image_profile.js` | DTO aggregating environment, image, astrometry, sensor, history, FITS keywords |
| `pi2llmChatDialog` | `lib/chat_ui.js` | Main UI — image selector, chat history display, input, send/export/reset |
| `formatSimpleMarkdown()` | `lib/chat_ui.js` | Minimal markdown → Qt rich text HTML converter |
| `LLMCommunicator` | `pi2llm-main.js` | Wraps `NetworkTransfer`; handles POST, UTF-8 decode, dual response-format parsing |
| `unicodeEscape()` | `pi2llm-main.js` | Escapes chars > U+007E after `JSON.stringify()` for safe HTTP POST |

## LLM Request Flow

```
User clicks "Analyze"
  → ImageProfile.extract()          builds the DTO
  → chatHistory.push(systemPrompt)
  → chatHistory.push(imageProfile JSON)
  → if vision enabled + checkbox:
      ImagePreparer.prepare()       clone → resize → JPEG → base64
      mutate last chatHistory entry to multipart [text, image_url]
      LLMCommunicator.sendMessage() POST
      onSuccess: restore chatHistory entry to plain object
  → else:
      LLMCommunicator.sendMessage() POST text-only

Subsequent user messages:
  → chatHistory.push(userText)
  → sendTextRequest() always (vision only on first analyze)
```

## LLM Provider Detection and Dispatch

Detection is URL-based inside `LLMCommunicator.sendMessage()`. The `isAnthropicUrl()` helper checks for `api.anthropic.com` in the URL string.

**Anthropic path** (when `isAnthropicUrl()` is true):
- Headers: `x-api-key: <key>` + `anthropic-version: 2023-06-01` (mandatory)
- Payload: `adaptPayloadForAnthropic()` moves `{role:"system"}` from `messages[]` to a top-level `"system"` field
- Model fallback: `claude-3-5-sonnet-20241022` if no model is configured
- Response: `responseObject.content[0].text`
- Error: `responseObject.error.{type, message}`

**All other providers** (OpenAI-compatible path):
- Headers: `Authorization: Bearer <key>` (omitted if key is empty or `"no-key"`)
- Payload: passed through unchanged
- Response tried in order:
  1. `responseObject.choices[0].message.content` — OpenAI, LM Studio, Ollama, Gemini, OpenRouter
  2. `responseObject.result.response` — Cloudflare AI Gateway
  3. `responseObject[0].error.{message,code,status}` — generic error array

To add support for a new provider: add a detector function alongside `isAnthropicUrl()`, add a branch in `sendMessage()` for headers and payload, add a response-format branch in the parser block.

## `cloneView()` Known Issues

- The cloned window is grayscale-forced (`false` for color parameter) regardless of source — known simplification.

## Design Patterns

- **DTO (Data Transfer Object):** `ImageProfile` serializes all PI-internal types to plain JS objects via `toJSON()`, called automatically by `JSON.stringify()`.
- **Prototype-based OOP:** All classes use `function Foo() {}` + `Foo.prototype = new Bar` — no ES6 `class` syntax (PJSR compatibility).
- **Callback pattern:** `LLMCommunicator.sendMessage(payload, onComplete, onError)` — synchronous call, callbacks invoked inline before returning.
- **Guard flag:** `ImageProfile._isExtracted` prevents redundant extraction if `.extract()` is called more than once.
- **processEvents():** Called before blocking network operations to allow the UI to repaint.

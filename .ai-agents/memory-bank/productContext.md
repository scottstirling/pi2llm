# Product Context

## Why this project exists

PixInsight is a professional astrophotography processing suite with a steep learning curve. Users routinely face decisions about which processing step to apply next, often leaving the application to consult forums or generic AI chatbots — neither of which knows the specific image being worked on.

## Problems it solves

- **Context switching:** Users stay inside PixInsight instead of copy-pasting data to external tools.
- **Lack of specificity:** Generic LLMs give generic advice. By passing FITS metadata, plate-solve coordinates, processing history, and an optional image thumbnail, the LLM gives advice targeted to the actual image state.
- **Documentation burden:** The assistant can generate AstroBin-style descriptions of finished images based on the real processing history extracted from the file.

## User Experience Goals

- Zero friction first run: a welcome dialog opens the configuration UI automatically on first launch.
- Minimal opt-in for expensive operations: vision image upload is disabled by default and requires two confirmations (global setting + per-image checkbox).
- Non-destructive: all image cloning for vision analysis leaves the user's original view untouched.
- No console pollution: `console.clear()` is intentionally never called so previous session output is preserved.
- Keyboard-friendly: `Ctrl+Enter` submits the chat input.

## Supported LLM Providers

| Type | Examples |
|------|----------|
| Local | LM Studio (`127.0.0.1:1234`), Ollama (`127.0.0.1:11434`), llama.cpp (`127.0.0.1:8080`) |
| Cloud | OpenAI, Google Gemini (via OpenAI-compatible endpoint), Anthropic, OpenRouter |
| Router | Cloudflare AI Gateway (uses `result.response` shape, not `choices`) |

#!/bin/bash
# Smoke test for the Anthropic Messages API.
#
# Usage:
#   export ANTHROPIC_API_KEY="sk-ant-..."
#   bash tests/test-anthropic.sh
#
# What this verifies:
#   - x-api-key auth header is accepted
#   - anthropic-version header is present and correct
#   - system prompt is a top-level field, not inside messages[]
#   - response shape: content[0].text
#
# Differences from OpenAI-compatible providers:
#   - Auth:    x-api-key: <key>          (NOT Authorization: Bearer <key>)
#   - Header:  anthropic-version: 2023-06-01  (mandatory, request rejected without it)
#   - System:  top-level "system" field      (NOT {role:"system"} inside messages[])
#   - Model:   must be set explicitly        (no server-side default)
#   - Response: content[0].text             (NOT choices[0].message.content)
#
# API reference: https://docs.anthropic.com/en/api/messages

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY environment variable is not set."
    echo "Set it with: export ANTHROPIC_API_KEY=\"sk-ant-...\""
    exit 1
fi

API_URL="https://api.anthropic.com/v1/messages"
MODEL="claude-3-5-haiku-20241022"   # cheapest model for smoke testing

echo "Testing Anthropic API..."
echo "  URL:   $API_URL"
echo "  Model: $MODEL"
echo "---"

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d "{
    \"model\": \"$MODEL\",
    \"max_tokens\": 64,
    \"system\": \"You are a helpful astrophotography assistant.\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"In one sentence, what is the Orion Nebula?\"
      }
    ]
  }" | python3 -m json.tool 2>/dev/null || cat

echo
echo "---"
echo "Expected response shape:"
echo '  { "content": [ { "type": "text", "text": "..." } ], ... }'
echo "pi2llm extracts: response.content[0].text"

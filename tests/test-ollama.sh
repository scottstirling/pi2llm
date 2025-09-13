#!/bin/bash
# install ollama per instructions.
# run:
#      pull llama3.2
# To pull down a sample model to test.

echo "Listing models deployed on ollama .."
curl http://localhost:11434/v1/models

echo "Calling ollama non-streaming /v1/chat/completions .."
curl -v http://localhost:11434/v1/chat/completions -d '{
  "model": "llama3.2",
  "messages": [
    { "role": "user", "content": "why is the sky blue?" }
  ]
}'

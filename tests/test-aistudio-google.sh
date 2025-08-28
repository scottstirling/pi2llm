#!/bin/bash

# Project scottstirling
# Export your Google AI authentication token / key like:
#
# export AISTUDIO_GOOGLE_AUTH_TOKEN="your actual token from Google AI Studio"

MODEL="gemini-2.0-flash"

curl "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer ${AISTUDIO_GOOGLE_AUTH_TOKEN}" \
-d "{ \"model\": \"${MODEL}\", \"messages\": [
        {\"role\": \"user\", \"content\": \"Describe the Orion Nebula\"}
    ]}"

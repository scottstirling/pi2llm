#!/bin/bash

curl "http://127.0.0.1:1234/v1/chat/completions" \
-H "Content-Type: application/json" \
-d "{ \"messages\": [
        {\"role\": \"user\", \"content\": \"Describe the Orion Nebula\"}
    ]}"

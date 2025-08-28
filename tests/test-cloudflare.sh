#!/bin/bash

# setup a hello-world AI gateway in Cloudflare under your account
#
# In a shell environment, export CF_GATEWAY_AUTH_TOKEN="your actual token value"

API_GATEWAY="hello-world"
MODEL_PATH="@cf/meta/llama-3.1-8b-instruct"

curl https://gateway.ai.cloudflare.com/v1/216ce4a33bf84927aaadb753ad09e90b/${API_GATEWAY}/workers-ai/${MODEL_PATH} \
 --header "Authorization: Bearer ${CF_GATEWAY_AUTH_TOKEN}" \
 --header "Content-Type: application/json" \
 --data '{"prompt": "What is Cloudflare?"}'


#!/bin/bash

# Export OPEN_API_KEY to your environment or set one here uncommented.
# OPENAI_API_KEY=12345

# --- Configuration ---
# IMPORTANT: Replace "YOUR_OPENAI_API_KEY" with your actual OpenAI API key.
# It is recommended to use an environment variable for your API key for better security.
# For example: OPENAI_API_KEY=$(cat /path/to/your/key)
# Or export OPENAI_API_KEY="your_key" in your .bashrc or .zshrc
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: The OPENAI_API_KEY environment variable is not set."
    echo "Please set it to your OpenAI API key."
    exit 1
fi


# The OpenAI API endpoint for chat completions. [14]
API_URL="http://127.0.0.1:4321/v1/chat/completions"
#API_URL="https://api.openai.com/v1/chat/completions"

# --- Nonce Generation ---
# Generate a random 32-byte string, base64 encoded, to act as a nonce. [16]
NONCE=$(openssl rand -base64 32)
echo "Generated Nonce: $NONCE"
echo "---------------------------------"

# --- POST Data ---
# Create the JSON payload for the request.
# We are including the nonce in the 'user' field for demonstration,
# although it doesn't have a special meaning to the OpenAI API itself.
# You could also add it as a custom metadata field if the API supported it.
read -r -d '' POST_DATA << EOM
{
  "messages":[{
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello! This is a test request. Please provide a short, friendly greeting."
    }
  ],
  "temperature": 0.7,
  "nonce_for_tracking": "$NONCE"
}
EOM

  # "model": "gpt-3.5-turbo",

echo "POST Data:"
echo "$POST_DATA"
echo "---------------------------------"

# --- cURL Request ---
# -v: Verbose output, which includes request and response headers. [3, 5]
# -X POST: Specifies the HTTP POST method.
# -H: Adds request headers for Content-Type and Authorization. [2, 11]
# -d: The data to be sent in the POST request.
# The output will show:
#   > Request headers
#   < Response headers
#   * Additional connection details
#   The final JSON response body from the API.
curl -v -X POST "$API_URL" \
-H "Content-Type: application/x-www-form-urlencoded" \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-d "$POST_DATA"
#-H "Content-Type: application/json" \

echo # Add a newline for cleaner terminal output

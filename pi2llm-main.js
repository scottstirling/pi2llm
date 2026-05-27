// =============================================================================
// pi2llm: LLM Assistant integration for PixInsight
// Copyright (c) 2025 Scott Stirling, StirlingAstrophoto, scott@stirlingastrophoto.com
//
// Released under the MIT License.
// See the LICENSE file for details.
// =============================================================================

#define VERSION "2.6.0"
#define TITLE "LLMAssistant"

#feature-id  LLMAssistant : Utilities > LLMAssistant
#feature-info "An LLM-powered assistant for PixInsight workflows."
#feature-icon ":/icons/analyze.png"

#include "./lib/configuration.js"
#include "./lib/extractors.js"
#include "./lib/image_profile.js"
#include "./lib/chat_ui.js"

/*
 * LLMCommunicator: Handles the network communication with the LLM and wraps
 * PixInsight's NetworkTransfer object.
 */
function LLMCommunicator(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;
}

/**
 * unicodeEscape(jsonString) needs to be run *after* JSON.stringify() to escape
 * Unicode characters.
 */
function unicodeEscape(jsonString) {
    return jsonString.replace(/[\u007F-\uFFFF]/g, function(chr) {
        return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
    });
}

/**
 * Returns true when the configured URL targets the Anthropic Messages API.
 * Detection is based on the hostname so it catches both direct API access
 * (api.anthropic.com) and any proxy that preserves that subdomain.
 *
 * Anthropic diverges from the OpenAI-compatible convention in three ways:
 *   1. Auth header:   x-api-key: <key>  (not Authorization: Bearer)
 *   2. Required:      anthropic-version: 2023-06-01
 *   3. System prompt: top-level "system" field (not a role inside messages[])
 *   4. Response path: content[0].text  (not choices[0].message.content)
 *
 * @param {string} url
 * @returns {boolean}
 */
function isAnthropicUrl(url) {
    return url && url.indexOf("api.anthropic.com") !== -1;
}

/**
 * Converts a single OpenAI-style content block to its Anthropic equivalent.
 *
 * OpenAI vision block:
 *   { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,<data>", "detail": "high" } }
 *
 * Anthropic vision block:
 *   { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "<data>" } }
 *
 * Text blocks ({ "type": "text", "text": "..." }) are returned unchanged.
 * Any unrecognised block type is also returned unchanged.
 *
 * @param {object} block  A single content block from an OpenAI messages[] entry.
 * @returns {object}      The equivalent Anthropic content block.
 */
function adaptContentBlockForAnthropic(block) {
    if (block.type !== "image_url" || !block.image_url) {
        return block; // text blocks and anything else pass through unchanged
    }

    // The data URI looks like: "data:image/jpeg;base64,<base64string>"
    // Parse out the media_type and the raw base64 data.
    let dataUri   = block.image_url.url || "";
    let mediaType = "image/jpeg"; // safe default
    let rawData   = dataUri;

    let commaIdx = dataUri.indexOf(",");
    if (commaIdx !== -1) {
        // "data:image/jpeg;base64" → "image/jpeg"
        let header = dataUri.substring(0, commaIdx);        // "data:image/jpeg;base64"
        let semicolonIdx = header.indexOf(";");
        if (semicolonIdx !== -1) {
            mediaType = header.substring(5, semicolonIdx);  // strip leading "data:"
        }
        rawData = dataUri.substring(commaIdx + 1);          // everything after the comma
    }

    return {
        "type": "image",
        "source": {
            "type":       "base64",
            "media_type": mediaType,
            "data":       rawData
        }
    };
}

/**
 * Adapts a standard OpenAI-style payload to the Anthropic Messages API shape.
 *
 * Changes made (original payload is never mutated — new objects are built):
 *   - Pulls {role:"system"} messages out of messages[] and moves their
 *     content to the top-level "system" field. Anthropic rejects a system
 *     role inside the messages array.
 *   - Converts any OpenAI-style image_url content blocks inside messages[]
 *     to the Anthropic "image" / "source" / "base64" block format.
 *   - Returns only user/assistant turns in messages[].
 *   - Keeps model, max_tokens, temperature unchanged.
 *   - Drops "stream" (already false; Anthropic ignores unknown fields but
 *     this keeps the payload clean).
 *
 * @param {object} payload  OpenAI-style payload built by chat_ui.js
 * @returns {object}        Anthropic-compatible payload
 */
function adaptPayloadForAnthropic(payload) {
    let systemContent    = "";
    let filteredMessages = [];

    for (let i = 0; i < payload.messages.length; ++i) {
        let msg = payload.messages[i];

        if (msg.role === "system") {
            // Concatenate in case multiple system messages exist (defensive).
            if (systemContent.length > 0) systemContent += "\n";
            systemContent += (typeof msg.content === "string")
                ? msg.content
                : JSON.stringify(msg.content);
            continue;
        }

        // Convert content blocks for non-system messages.
        // content can be a plain string (text-only turns) or an array of blocks
        // (vision turns, where chat_ui.js builds [{type:"text",...},{type:"image_url",...}]).
        let adaptedContent;
        if (typeof msg.content === "string") {
            adaptedContent = msg.content; // plain string — pass through unchanged
        } else if (Array.isArray(msg.content)) {
            adaptedContent = [];
            for (let j = 0; j < msg.content.length; ++j) {
                adaptedContent.push(adaptContentBlockForAnthropic(msg.content[j]));
            }
        } else {
            adaptedContent = msg.content; // unexpected shape — pass through unchanged
        }

        filteredMessages.push({ role: msg.role, content: adaptedContent });
    }

    let adapted = {
        model:      payload.model || "claude-3-5-sonnet-20241022",
        max_tokens: payload.max_tokens,
        messages:   filteredMessages
    };

    if (systemContent.length > 0) {
        adapted.system = systemContent;
    }

    // temperature is optional for Anthropic but valid; include it when present.
    if (typeof payload.temperature === "number") {
        adapted.temperature = payload.temperature;
    }

    return adapted;
}

LLMCommunicator.prototype.sendMessage = function (payload, onComplete, onError) {

    // DEBUG
    // console.writeln("   ======== payload ==========   ");
    // const debugPayload = JSON.stringify(payload, null, 2);
    // console.writeln("payload JSON.stringified and formatted: " + debugPayload.substring(0,4096)  );
    // console.writeln("payload JSON.stringified then unicodeEscaped and formatted: " +  unicodeEscape(JSON.stringify(payload, null, 2) ) );
    // console.writeln("   ======== payload ==========   ");

    let isAnthropic = isAnthropicUrl(this.url);

    // Normalise the URL: strip any trailing slash before use.
    // Anthropic returns HTTP 307 for /v1/messages/ (with slash) and
    // NetworkTransfer does NOT follow redirects, leaving an empty response
    // body that causes JSON.parse to fail.
    let effectiveUrl = this.url.replace(/\/+$/, "");
    if (effectiveUrl !== this.url) {
        console.writeln("Info: trailing slash removed from URL: " + effectiveUrl);
    }

    // Guard: catch the common misconfiguration of using the Anthropic base URL
    // instead of the Messages endpoint. api.anthropic.com/v1 returns 403
    // "Request not allowed" because that path does not accept POST requests.
    // The correct endpoint is /v1/messages.
    if (isAnthropic && effectiveUrl.indexOf("/v1/messages") === -1) {
        let hint = "Anthropic URL appears incorrect.\n\n" +
                   "Configured: " + this.url + "\n" +
                   "Required:   https://api.anthropic.com/v1/messages\n\n" +
                   "Please update the LLM URL in Settings.";
        console.criticalln(hint);
        if (onError) onError(hint);
        return;
    }

    // Anthropic requires a different payload shape; adapt before serialising.
    let effectivePayload = isAnthropic ? adaptPayloadForAnthropic(payload) : payload;

    // Stringify the payload, escape quotes, trim newlines.
    let jsonData = JSON.stringify(effectivePayload);

    // NOTE: Crucial: escape Unicode chars after stringify
    jsonData = unicodeEscape(jsonData);

    let headers = new Array();
    headers.push("Content-Type: application/json; charset=utf-8");
    headers.push("Accept: application/json");

    if (isAnthropic) {
        // Anthropic auth: x-api-key header (not Authorization: Bearer).
        // anthropic-version is mandatory — requests are rejected without it.
        if (this.apiKey && this.apiKey.length > 0 && this.apiKey !== "no-key") {
            headers.push("x-api-key: " + this.apiKey);
        }
        headers.push("anthropic-version: 2023-06-01");
        console.writeln("Info: using Anthropic API headers (x-api-key + anthropic-version).");
    } else {
        // OpenAI style "Authorization: Bearer <key>" header
        if (this.apiKey && this.apiKey.length > 0 && this.apiKey !== "no-key") {
            headers.push("Authorization: Bearer " + this.apiKey);
        }
    }

    let transfer = new NetworkTransfer;

    if ( effectiveUrl.indexOf( "https" ) != -1 ) {
        transfer.setSSL();
    }
    // NOTE: setURL(string) *must* be called prior to setCustomHTTPHeaders(array) because
    // setURL(string) also *resets the headers*.
    transfer.setURL(effectiveUrl);
    transfer.setConnectionTimeout(60); // unit is seconds
    transfer.setCustomHTTPHeaders(headers);

    transfer.onDownloadDataAvailable = function (data) {
        console.writeln("Info: receiving data ...")
        // console.writeln(data); // DEBUG "raw" JSON response
        this.response.add(data);
        return true;
    };

    transfer.response = new ByteArray(); // raw byte array response data receiver

    console.writeln("Sending data to LLM at: " + effectiveUrl);

    if (transfer.post(jsonData)) {
        console.writeln("Successfully received data from LLM. HTTP Status: " + transfer.responseCode);

        //let responseString = transfer.response.toString(); // NOTE: this will work for ASCII but any Unicode characters will render incorrectly
        let responseString = transfer.response.utf8ToString(); // NOTE: decode raw byte array response from UTF-8 encoding to String (before parsing to JSON)

        let messageContent = "Error: unexpected data or formatting in LLM response."; // set default log message as error

        try {
            // DEBUG
            console.writeln("response string: " + responseString);

            let responseObject = JSON.parse(responseString); // now parse (decode) the decoded UTF-8 byte array String to a Javascript object

            // Response format variations tried in order:
            // 1. Anthropic Messages API: {"content":[{"type":"text","text":"..."}], ...}
            if (isAnthropic) {
                if (responseObject.content && responseObject.content.length > 0 &&
                    responseObject.content[0].type === "text") {
                    messageContent = responseObject.content[0].text;
                } else if (responseObject.error) {
                    // Anthropic error shape: {"type":"error","error":{"type":"...","message":"..."}}
                    messageContent = "AI Error: " + responseObject.error.message +
                                     " (type: " + responseObject.error.type + ")";
                }
            // 2. OpenAI-compatible: choices[0].message.content
            } else if (responseObject.choices && responseObject.choices.length > 0 &&
                       responseObject.choices[0].message) {
                messageContent = responseObject.choices[0].message.content;
            // 3. Cloudflare AI Gateway: {"result":{"response":"..."}}
            } else if (responseObject && responseObject.result) {
                messageContent = responseObject.result.response;
            // 4. Generic error array: [{"error":{"code":..., "message":..., "status":...}}]
            } else if (responseObject && transfer.responseCode > 200) {
                let errorObject = responseObject[0];
                var error = errorObject.error;
                var errorMsg = error.message
                var errorCode = error.code;
                var errorStatus = error.status;

                messageContent = "AI Error: " + errorMsg + ", code: " + errorCode + ", status: " + errorStatus;
            }
            if (onComplete) {
                onComplete(messageContent);
            }
        } catch (e) {
            let errorMsg = "Error parsing LLM JSON response: " + e.message;
            messageContent = errorMsg;
            console.criticalln(errorMsg);

            if (onError) {
                onError(errorMsg);
            }
        }
    } else {
        let errorMsg = "NetworkTransfer POST failed. HTTP Status: " + transfer.responseCode + "\nError Info: " + transfer.errorInformation;
        console.criticalln(errorMsg);
        if (onError) {
            onError(errorMsg);
        }
    }

    transfer.closeConnection();
};

// common api response errors:
// 1. wrong / non-existent model name (OpenAI/Google):
    // [{"error":{"code":404,"message":"models/foo is not found for API version v1main, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}}]
// 2. no model name supplied (OpenAI/Google):
    // [{"error":{"code":400,"message":"model is not specified","status":"INVALID_ARGUMENT"}}]
// 3. Anthropic wrong/missing model:
    // {"type":"error","error":{"type":"invalid_request_error","message":"model: field required"}}
// 4. Anthropic missing anthropic-version header:
    // {"type":"error","error":{"type":"invalid_request_error","message":"anthropic-version: field required"}}


function pi2llmMain() {
    console.show();

    // don't clear the console and lose all previous messages
    // console.clear();
    console.writeln("--- LLM Assistant Initialized ---");

    let config = new Configuration();
    config.load();

    // The  "First Run" check remains.
    if (config.isFirstRun()) {
        new MessageBox(
            "Welcome to LLM Assistant!\n\nThe configuration dialog will open for initial configuration.",
            TITLE, StdIcon_Information, StdButton_Ok
        ).execute();

        if (config.launchDialog()) {
            config.setHasBeenConfigured();
        } else {
            return; // Exit if user cancels first-time setup.
        }
    }

    // Launch the main chat UI.
    let chatDialog = new pi2llmChatDialog(config);
    chatDialog.execute();

    console.writeln("--- LLM  Assistant Closed ---");
}

pi2llmMain();

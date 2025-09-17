// =============================================================================
// pi2llm: LLM Assistant integration for PixInsight
// Copyright (c) 2025 Scott Stirling, StirlingAstrophoto, scott@stirlingastrophoto.com
//
// Released under the MIT License.
// See the LICENSE file for details.
// =============================================================================

#define VERSION "2.5.0"
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

LLMCommunicator.prototype.sendMessage = function (payload, onComplete, onError) {

    // DEBUG
    // console.writeln("   ======== payload ==========   ");
    // const debugPayload = JSON.stringify(payload, null, 2);
    // console.writeln("payload JSON.stringified and formatted: " + debugPayload.substring(0,4096)  );
    // console.writeln("payload JSON.stringified then unicodeEscaped and formatted: " +  unicodeEscape(JSON.stringify(payload, null, 2) ) );
    // console.writeln("   ======== payload ==========   ");

    // Stringify the payload, escape quotes, trim newlines.
    let jsonData = JSON.stringify(payload);


    // NOTE: Crucial: escape Unicode chars after stringify
    jsonData = unicodeEscape(jsonData);


    let headers = new Array();
    headers.push("Content-Type: application/json; charset=utf-8");
    headers.push("Accept: application/json");

    // OpenAI style "Authorization: Bearer <key>" header
    if (this.apiKey && this.apiKey.length > 0 && this.apiKey !== "no-key") {
        headers.push("Authorization: Bearer " + this.apiKey);
    }

    let transfer = new NetworkTransfer;

    if ( this.url.indexOf( "https" ) != -1 ) {
        transfer.setSSL();
    }
    // NOTE: setURL(string) *must* be called prior to setCustomHTTPHeaders(array) because
    // setURL(string) also *resets the headers*.
    transfer.setURL(this.url);
    transfer.setConnectionTimeout(60); // unit is seconds
    transfer.setCustomHTTPHeaders(headers);

    transfer.onDownloadDataAvailable = function (data) {
        console.writeln("Info: receiving data ...")
        // console.writeln(data); // DEBUG "raw" JSON response
        this.response.add(data);
        return true;
    };

    transfer.response = new ByteArray(); // raw byte array response data receiver

    console.writeln("Sending data to LLM at: " + this.url);

    if (transfer.post(jsonData)) {
        console.writeln("Successfully received data from LLM. HTTP Status: " + transfer.responseCode);

        //let responseString = transfer.response.toString(); // NOTE: this will work for ASCII but any Unicode characters will render incorrectly
        let responseString = transfer.response.utf8ToString(); // NOTE: decode raw byte array response from UTF-8 encoding to String (before parsing to JSON)

        let messageContent = "Error: unexpected data or formatting in LLM response."; // set default log message as error

        try {
            // DEBUG
            console.writeln("response string: " + responseString);

            let responseObject = JSON.parse(responseString); // now parse (decode) the decoded UTF-8 byte array String to a Javascript object

            // Two main attempts to handle LLM response format variations
            // 1. first try to handle as openAI-compatible JSON format such as from openAI, llamacpp, LMStudio
            if (responseObject.choices && responseObject.choices.length > 0 && responseObject.choices[0].message) { // address JSON items returned from the LLM
                messageContent = responseObject.choices[0].message.content;
            } else if (responseObject && responseObject.result) {
                // 2. if we have a responseObject but failed to find "choices" in JSON,
                // then try to handle as Cloudflare AI Gateway's simpler format: {"result":{"response":"foo bar baz" ...
                messageContent = responseObject.result.response;
            } else if (responseObject && transfer.responseCode > 200) { // response contains an error message
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
// 1. wrong / non-existent model name:
    // [{"error":{"code":404,"message":"models/foo is not found for API version v1main, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}}]
// 2. no model name supplied:
    // [{"error":{"code":400,"message":"model is not specified","status":"INVALID_ARGUMENT"}}]


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

// =============================================================================
// pi2llm: LLM Assistant integration for PixInsight
// Copyright (C) 2025 StirlingAstrophoto
// =============================================================================

#define VERSION "1.0.0"
#define TITLE "LLM Assistant"

#feature-id  pi2llm : StirlingAstrophoto > pi2llm
#feature-info "An LLM-powered assistant for PixInsight workflows."
#feature-icon ":/icons/analyze.png"

#include "./lib/configuration.js"
#include "./lib/extractors.js"
#include "./lib/workspace_provider.js"
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
 * Unicode characters, due to limitations of JSON.strinigify() in SpiderMonkey 2014
 * Javascript engine in PixInsight.
 */
function unicodeEscape(json) {
    return json.replace(/[\u007F-\uFFFF]/g, function(chr) {
        return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
    });
}


LLMCommunicator.prototype.sendMessage = function (payload, onComplete, onError) {

    // TOOD: fix issues with Unicode characters sent back to server, such as: µ and ° and ' etc.

    // Try escaping Unicode chars (usually in the chat history) after JSON.stringify
    // DEBUG
    console.writeln("   ======== jsonData ==========   ");
    console.writeln("jsonData: " +  JSON.stringify(payload, null, 2));
    console.writeln("jsonData escaped: " +  unicodeEscape(JSON.stringify(payload, null, 2) ) );
    console.writeln("   ======== jsonData ==========   ");

    // Stringify the payload, without any extra newlines or spaces.
    let jsonData = JSON.stringify(payload);

    // Try escaping unicode chars after stringify
    jsonData = unicodeEscape(jsonData);


    let headers = [
        "Content-Type: application/json; charset=utf-8",
        "Accept: application/json"
    ];

    if (this.apiKey && this.apiKey.length > 0 && this.apiKey !== "no-key") {
        headers.push("Authorization: Bearer " + this.apiKey);
    }

    let transfer = new NetworkTransfer;
    transfer.setCustomHTTPHeaders(headers);
    transfer.setURL(this.url);
    transfer.setConnectionTimeout(60); // unit is seconds

    transfer.response = new ByteArray(); // raw byte array receiver

    transfer.onDownloadDataAvailable = function (data) {
        console.writeln("Info: receiving data ...")
        this.response.add(data);
    };

    console.writeln("Sending data to LLM at: " + this.url);

    if (!transfer.post(jsonData)) {  // don't ask me why but transfer.post() returns false
        console.writeln("Successfully received data from LLM. HTTP Status: " + transfer.responseCode);

        //let responseString = transfer.response.toString(); // NOTE: this will work for ASCII but any Unicode characters will render incorrectly
        let responseString = transfer.response.utf8ToString(); // NOTE: decode raw byte array response from UTF-8 encoding to String (before parsing to JSON)

        try {

            let responseObject = JSON.parse(responseString); // now parse the decoded UTF-8 -> String to a Javascript object

            let messageContent = "Error: No valid choice found in LLM response."; // set default log message as error
            if (responseObject.choices && responseObject.choices.length > 0 && responseObject.choices[0].message) { // address JSON items returned from the LLM
                messageContent = responseObject.choices[0].message.content;
            }
            if (onComplete) {
                onComplete(messageContent);
            }
        } catch (e) {
            let errorMsg = "Error parsing LLM JSON response: " + e.message;
            console.criticalln(errorMsg);
            if (onError) {
                onError(errorMsg);
            }
        }
    } else {
        let errorMsg = "Network upload failed. HTTP Status: " + transfer.responseCode + "\nError Info: " + transfer.errorInformation;
        console.criticalln(errorMsg);
        if (onError) {
            onError(errorMsg);
        }
    }

    transfer.closeConnection();
};

// =============================================================================
// Main Execution Logic
// =============================================================================
function pi2llmMain() {
    console.show();

    // don't clear the console and lose all previous messages
    // console.clear();
    console.writeln("--- pi2llm  Assistant Initialized ---");

    let config = new Configuration();
    config.load();

    // The robust "First Run" check remains.
    if (config.isFirstRun()) {
        new MessageBox(
            "Welcome to the pi2llm Assistant!\n\nAs this is your first time, the configuration dialog will now open.",
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

    console.writeln("--- pi2llm  Assistant Closed ---");
}

pi2llmMain();

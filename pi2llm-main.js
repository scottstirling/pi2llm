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
 * LLMCommunicator: Handles the network communication with the LLM.
 * CORRECTED to use the proper NetworkTransfer constructor.
 */
function LLMCommunicator(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;
}

LLMCommunicator.prototype.sendMessage = function(payload, onComplete, onError) {

    // formats the json with newlines and escape chars
    // let jsonData = JSON.stringify(payload, null, 2);

    // Stringify the final payload compactly, without any extra newlines or spaces.
    let jsonData = JSON.stringify(payload);
    //jsonData = new ByteArray(jsonData).toURLEncoded();

    let headers = [
        "Content-Type: application/json;charset=UTF-8;",
        "Accept: application/json"
    ];

    if (this.apiKey && this.apiKey.length > 0 && this.apiKey !== "no-key") {
        headers.push("Authorization: Bearer " + this.apiKey);
    }

    let transfer = new NetworkTransfer;
    transfer.setCustomHTTPHeaders(headers);
    transfer.setURL(this.url);

    console.writeln("Sending data to LLM at: " + this.url);

    transfer.response = new ByteArray();

    transfer.onDownloadDataAvailable = function( data ) {
        this.response.add(data);
    };

    if (!transfer.post(jsonData)) {
        console.writeln("Successfully received data from LLM. HTTP Status: " + transfer.responseCode);

        //let responseString = transfer.response.toString();
        let responseString = transfer.response.utf8ToString();

        try {
            let responseObject = JSON.parse(responseString);
            let messageContent = "Error: No valid choice found in LLM response.";
            if (responseObject.choices && responseObject.choices.length > 0 && responseObject.choices[0].message) {
                messageContent = responseObject.choices[0].message.content;
            }
            if (onComplete) onComplete(messageContent);
        } catch (e) {
            let errorMsg = "Error parsing LLM JSON response: " + e.message;
            console.criticalln(errorMsg);
            if (onError) onError(errorMsg);
        }
    } else {
        let errorMsg = "Network upload failed. HTTP Status: " + transfer.responseCode + "\nError Info: " + transfer.errorInformation;
        console.criticalln(errorMsg);
        if (onError) onError(errorMsg);
    }
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

    // Launch the main chat UI. That's it.
    // No more checks for open images. The UI handles that now.
    let chatDialog = new pi2llmChatDialog(config);
    chatDialog.execute();

    console.writeln("--- pi2llm  Assistant Closed ---");
}

pi2llmMain();

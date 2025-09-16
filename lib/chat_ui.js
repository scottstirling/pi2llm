// /lib/chat_ui.js

// This file defines the main interactive chat dialog for the LLM Assistant.

#include <pjsr/ButtonCodes.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/FontFamily.jsh>
#include <pjsr/PenStyle.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/DataType.jsh>      // For DataType constants (DataType_String, etc.)
#include <pjsr/Sizer.jsh>         // For Sizer, VerticalSizer, HorizontalSizer, GridSizer
#include <pjsr/FrameStyle.jsh>    // For FrameStyle constants
#include <pjsr/TextAlign.jsh>     // For TextAlign constants
#include <pjsr/StdButton.jsh>     // For standard button constants like StdButton_Ok

// Point to the raw HTML file or a GitHub Pages site.
#define DOC_URL "https://scottstirling.github.io/pi2llm/docs/scripts/LLMAssistant/LLMAssistant.html"

function pi2llmChatDialog(config) {
    this.__base__ = Dialog;
    this.__base__();
    this.restyle();

    this.config = config;
    this.chatHistory = [];

    // === UI ELEMENTS ===

    // -- Top Selection Panel --
    this.viewList = new ViewList(this);
    this.viewList.getAll(); // Populate with all current views
    this.viewList.toolTip = "<p>Select the primary image you want to analyze.</p>";
    this.viewList.onViewSelected = function() {
        // Enable the analyze button only if a valid view is selected.
        this.analyzeButton.enabled = !this.viewList.currentView.isNull;
    }.bind(this);

    // ** v3 VISION CHECKBOX in the main UI **
    this.sendImageCheckBox = new CheckBox(this);
    this.sendImageCheckBox.text = "Send Image with Analysis";
    this.sendImageCheckBox.toolTip = "<p>Prepares and sends a compressed version of the selected image with your request.</p>";
    // Visibility is controlled by the persistent config setting.
    this.sendImageCheckBox.visible = this.config.enableVision;
    this.sendImageCheckBox.checked = true; // Default to checked if visible

    this.analyzeButton = new PushButton(this);
    this.analyzeButton.text = "Analyze Selected Image";
    this.analyzeButton.icon = this.scaledResource(":/icons/analyze.png");
    this.analyzeButton.enabled = !this.viewList.currentView.isNull; // Initially disabled if no view is selected
    this.analyzeButton.toolTip = "<p>Perform an analysis on the selected image, and start the chat.</p>";
    this.analyzeButton.onClick = function() {
        this.runInitialAnalysis();
    }.bind(this);

    let topSizer = new HorizontalSizer;
    topSizer.spacing = 6;
    topSizer.add(this.viewList, 100);
    topSizer.add(this.sendImageCheckBox); // Add the checkbox
    topSizer.add(this.analyzeButton);

    // -- Main Chat History Box --
    this.historyBox = new TextBox(this);
    this.historyBox.readOnly = true;
    this.historyBox.useRichText = true;
    this.historyBox.text = "<br><span style='color:#888;'><i>Select an image from the dropdown and click 'Analyze' to begin, or type a prompt in the chat and hit Ctrl+Enter to send.</i></span>";

    // -- User Input Panel --
    //  TextBox object supports multi-line input and word wrapping by default
    this.inputBox = new TextBox(this);
    this.inputBox.setScaledMinHeight(80);  // v2
    this.inputBox.enabled = true; // v2 enabled by default
    this.inputBox.focused = true;
    this.inputBox.tooltip = "<p>Ctrl + Enter to send.</p>";

    this.sendButton = new PushButton(this);
    this.sendButton.text = "Send";
    this.sendButton.icon = this.scaledResource(":/icons/arrow-right.png");
    this.sendButton.enabled = true; // v2 enabled by default
    this.sendButton.tooltip = "<p>Send user input to LLM.</p>";
    this.sendButton.onClick = function() { this.submitUserInput(); }.bind(this);

    /**
     * This is the global key press handler for the entire dialog.
     */
    this.onKeyPress = function(key, modifiers) {
        // DEBUG
        // console.writeln("key == " + key);
        // console.writeln("modifiers == " + modifiers)

        // check for the Ctrl+Enter combination.
        if (key === 13 && modifiers === 2) {

            // We also check that the user is actually typing in the input box.
            if (this.inputBox.focused && this.sendButton.enabled) {
                console.writeln("Ctrl+Enter detected, sending message.");

                // Trigger the same action as clicking the Send button.
                this.submitUserInput();

                // Tell the system we have handled this event completely.
                key.accepted = true;
            }
        }
    };

    let inputSizer = new HorizontalSizer;
    inputSizer.spacing = 6;
    inputSizer.add(this.inputBox, 100);
    inputSizer.add(this.sendButton);

    // -- Bottom Button Panel --
    // "NEW CHAT" BUTTON
    this.newChatButton = new PushButton(this);
    this.newChatButton.text = "New Chat";
    this.newChatButton.icon = this.scaledResource(":/icons/document-new.png");
    this.newChatButton.toolTip = "<p>Clears the current conversation and allows you to select a new image to analyze.</p>";
    this.newChatButton.focused = false;
    this.newChatButton.defaultButton = false;
    this.newChatButton.onClick = function() { this.resetChat(); }.bind(this);

    this.settingsButton = new PushButton(this);
    this.settingsButton.text = "Settings";
    this.settingsButton.icon = this.scaledResource(":/icons/settings.png");
    this.settingsButton.onClick = function() {
        let configDialog = new ConfigDialog(this.config);
        configDialog.execute();
    }.bind(this);

    this.exportButton = new PushButton(this);
    this.exportButton.text = "Export History";
    this.exportButton.icon = this.scaledResource(":/icons/save.png");
    this.exportButton.enabled = false;
    this.exportButton.toolTip = "<p>Save the current chat conversation to a text file.</p>";
    this.exportButton.onClick = function() { this.exportChatHistory(); }.bind(this);

    this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.onClick = function() { this.ok(); }.bind(this);

    // ** HELP BUTTON **
    this.helpButton = new ToolButton(this);
    this.helpButton.icon = this.scaledResource(":/icons/document-lanscape.png");
    this.helpButton.toolTip = "<p>Open the online documentation for the LLLM Assistant.</p>";
    this.helpButton.onClick = function() {
        // built-in PixInsight function to open a URL
        // in the user's default web browser.
        Dialog.openDocumentation(DOC_URL);
    }.bind(this);

    let bottomButtonsSizer = new HorizontalSizer;
    bottomButtonsSizer.spacing = 6;
    bottomButtonsSizer.add(this.helpButton); // Add the help button to the far left
    bottomButtonsSizer.add(this.settingsButton);
    bottomButtonsSizer.add(this.newChatButton);
    bottomButtonsSizer.addStretch();
    bottomButtonsSizer.add(this.exportButton);
    bottomButtonsSizer.add(this.closeButton);

    // === DIALOG LAYOUT ===
    this.sizer = new VerticalSizer;
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(topSizer);
    this.sizer.add(this.historyBox, 100);
    this.sizer.add(inputSizer);
    this.sizer.add(bottomButtonsSizer);

    this.windowTitle = "LLM Assistant";
    this.setMinWidth(1024);
    this.setMinHeight(768);
    this.adjustToContents(); // This ensures it initially fits the content.

    // === METHODS ===

    // ** Chat RESET / NEW
    this.resetChat = function() {
        console.writeln("--- Chat session and history reset by user. ---");
        // Reset state
        this.chatHistory = [];

        // Reset UI components
        this.historyBox.text = "<br><span style='color:#888;'><i>Select an image from the dropdown and click 'Analyze' to begin, or type a prompt in the chat and hit Ctrl+Enter to send.</i></span>";

        this.inputBox.enabled = true; // v2
        this.inputBox.clear();
        this.inputBox.focused = true;
        this.sendButton.enabled = true; // v2
        this.newChatButton.focused = false; // v2
        this.newChatButton.defaultButton = false; // v2
        this.exportButton.enabled = false;

        // Re-enable the analysis controls and refresh the image list
        this.viewList.getAll();
        this.viewList.enabled = true;
        this.analyzeButton.enabled = !this.viewList.currentView.isNull;
    };

    // Exports chat history to a txt file
    this.exportChatHistory = function() {
        if (this.chatHistory.length === 0) {
            new MessageBox("There is no chat history to export.", "LLM Assistant").execute();
            return;
        }

        let saveDialog = new SaveFileDialog();
        saveDialog.caption = "Export Chat History";
        saveDialog.filters = [ ["Text files", "*.txt"], ["JSON files", "*.json"], ["All files", "*.*"] ];

        // suggest a default filename if we have a target image
        let targetViewId = this.viewList.currentView.id;
        if (targetViewId) {
            // A simple way to get the directory of the target image, if it has one.
            let targetWindow = ImageWindow.windowById(targetViewId.replace(/:/g, ''));
            if (!targetWindow.isNull && targetWindow.filePath) {
                let dir = File.extractDirectory(targetWindow.filePath);
                let baseName = File.extractName(targetWindow.filePath);
                saveDialog.initialPath = dir + "/" + baseName + "_chat_log.txt";
            }
        } else {
            // Provide a generic fallback
            saveDialog.initialPath = "./LLM-Assistant_chat_log.txt";
        }

        if (saveDialog.execute()) {
            let filePath = saveDialog.fileName;
            let fileContent = "";

            // Check if the user wants to save as JSON or TXT
            if (File.extractExtension(filePath).toLowerCase() === ".json") {
                // Save as formatted JSON
                fileContent = JSON.stringify(this.chatHistory, null, 2);
            } else {
                // Save as human-readable text
                fileContent = "LLM Assistant Chat Log\n";
                fileContent += "Date: " + new Date().toUTCString() + "\n";
                fileContent += "========================================\n\n";

                for (let i = 0; i < this.chatHistory.length; ++i) {
                    let entry = this.chatHistory[i];
                    let role = entry.role.toUpperCase();
                    let content = entry.content;

                    // TODO: consider dumping the JSON object to the log too
                    // Don't dump the initial JSON object into the text log.
                    // Instead, put a placeholder. The raw data is still in the chatHistory.
                    if (role === 'USER' && typeof content === 'object') {
                        content = "[Initial image analysis data was sent to the LLM.]";
                    }

                    fileContent += "### " + role + " ###\n\n";
                    fileContent += content + "\n\n";
                    fileContent += "----------------------------------------\n\n";
                }
            }

            try {
                File.writeTextFile(filePath, fileContent);
                new MessageBox("Chat history exported to:\n" + filePath, "LLM Assistant").execute();
            } catch (e) {
                new MessageBox("Error exporting chat history: " + e.message, "LLM Assistant", StdIcon_Error).execute();
            }
        }
    };


    // Appends a message to the UI chat history box.
    this.addMessageToUI = function(role, text) {

    // 1. Determine the display name and color.
    let displayName = role;
    let color = "#000000";
    switch (role) {
        case "user":
            displayName = "User";
            color = "#0000AA"; // A blue for the user
            break;
        case "assistant":
            displayName = "LLM Assistant"; // Assistant display name
            color = "#000000"; // Black for the assistant
            break;
        case "system":
            displayName = "System";
            color = "#555555"; // Grey for system messages
            break;
        case "error":
            displayName = "Error";
            color = "#AA0000"; // Red for errors
            break;
        default:
            displayName = role;
            color = "#333333";
            break;
    }

        // 2. Format the text content.
        let formattedContent = formatSimpleMarkdown(text);

        // 3. Assemble the final HTML block
        let newhtml = "<br><span style=\"color: " + color + ";\"><b>" + displayName + ":  </b></span>" + formattedContent;

        this.historyBox.text += newhtml;
    };

    // This is called by the "Analyze" button, not automatically.
    this.runInitialAnalysis = function() {
        // Get the window object from the user's selection in the ViewList.
        let selectedView = this.viewList.currentView;
        if (selectedView.isNull) {
            new MessageBox("Please select a valid image from the dropdown.", "LLM Assistant").execute();
            return;
        }
        let selectedWindow = selectedView.window;

        // To ensure history is read correctly, activate the window.
        selectedWindow.bringToFront();

        // 2. Disable UI controls and show a status message.
        this.viewList.enabled = false;
        this.analyzeButton.enabled = false;
        this.sendImageCheckBox.enabled = false;
        this.historyBox.text = "<br><span style='color:#888;'><i>Extracting profile for " + selectedView.id + " ...</i></span>";

        // Let the UI update
        processEvents();

        // Create a new ImageProfile instance.
        let imageProfile = new ImageProfile(selectedWindow);
        imageProfile.extract(); // Run the full analysis

        // Reset chat history and add the system prompt and the text-based profile
        this.chatHistory = [];
        this.chatHistory.push({ role: "system", content: this.config.systemPrompt });
        this.chatHistory.push({ role: "user", content: JSON.stringify(imageProfile) }); // v2

        // v3
        this.historyBox.clear();
        //this.addMessageToUI("system", imageProfile.toJSON());

        // NOTE: v3 changes this message role from system to assistant so as not to confuse with the system prompt
        this.addMessageToUI("assistant", "Sending image profile data for analysis: " + JSON.stringify(imageProfile)); // v3

        // ** v3 LOGIC: Decide which request function to call **
        if (this.config.enableVision && this.sendImageCheckBox.checked) {
            this.sendVisionRequest(selectedView);
        } else {
            this.sendTextRequest();
        }
    };

    /**
     * submitUserInput() function
     */
    this.submitUserInput = function() {
        let userInput = this.inputBox.text.trim();
        if (!userInput) return;
        this.addMessageToUI("user", userInput);
        this.chatHistory.push({ role: "user", content: userInput });
        this.inputBox.clear();
        this.inputBox.enabled = true;
        this.inputBox.focused = true;

        // Subsequent messages always use the simple text request path.
        this.sendTextRequest();    };

    /**
     * sendTextRequest() function
     */
    this.sendTextRequest = function() {
        this.sendButton.enabled = false;
        this.inputBox.enabled = false;

        // Ensure the system prompt is the first message in the chat session history,
        // but only add it if it's not already there.
        if (this.chatHistory.length > 0 && this.chatHistory[0].role !== 'system') {
            this.chatHistory.unshift({ role: "system", content: this.config.systemPrompt });
        }

        let payload;

        if (this.config.model && this.config.model.trim() != "") {
            payload = {
                messages: this.chatHistory,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                model: this.config.model,
                stream: false
            };
        } else {
            payload = {
                messages: this.chatHistory,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stream: false
            };
        }

        let communicator = new LLMCommunicator(this.config.url, this.config.apiKey);
        communicator.sendMessage(
            payload,
            this.onSuccess.bind(this),
            this.onError.bind(this)
        );
    };


    /**
     * Handles the special vision request, which includes preparing and
     * sending the image data along with the text prompt.
     * @param {View} view The view to prepare and send.
     */
    this.sendVisionRequest = function(view) {
        this.sendButton.enabled = false;
        this.inputBox.enabled = false;
        this.historyBox.text += "<p style='color:#888;'><i>Preparing and encoding image for vision model... This may take a moment.</i></p>";
        processEvents();

        // Use our new, in-memory ImagePreparer
        let imagePreparer = new ImagePreparer(view);
        let base64ImageString = imagePreparer.prepare(this.config.visionMaxDimension);

        if (!base64ImageString) {
            this.onError("Failed to prepare the image for the vision model. Check the console for details.");
            return;
        }

        // We need to modify the LAST message in our history to match the vision format.
        let lastMessage = this.chatHistory[this.chatHistory.length - 1];
        let textContent = lastMessage.content; // This is our ImageProfile DTO

        // Reformat the content into the required array structure
        lastMessage.content = [
            {
                "type": "text",
                "text": JSON.stringify(textContent) // Send the DTO as a JSON string
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": base64ImageString,
                    "detail": "high" // We can make this configurable later
                }
            }
        ];

        let payload;

        if (this.config.model && this.config.model.trim() != "") {
            payload = {
                messages: this.chatHistory,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                model: this.config.model,
                stream: false
            };
        } else {
            payload = {
                messages: this.chatHistory,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stream: false
            };
        }

        let communicator = new LLMCommunicator(this.config.url, this.config.apiKey);
        communicator.sendMessage(payload,
            this.onSuccess.bind(this),
            this.onError.bind(this)
        );
    };

    // --- Shared Callbacks ---
    // Create shared success/error handlers to avoid duplicating code.

    // Success Callback
    this.onSuccess = function(response) {
        // When a vision request is made, the LLM will see both text and image,
        // but the text part (our DTO) is now inside an array. We should restore
        // the simpler object format in our history for the next turn.
        let lastMessage = this.chatHistory[this.chatHistory.length - 1];
        if (Array.isArray(lastMessage.content)) {
            lastMessage.content = JSON.parse(lastMessage.content[0].text);
        }
                this.chatHistory.push({ role: "assistant", content: response });
                this.addMessageToUI("assistant", response);
                this.sendButton.enabled = true;
                // this.sendButton.defaultButton = true;
                this.newChatButton.focused = false;
                this.exportButton.enabled = true;
                this.inputBox.enabled = true;
                this.inputBox.focused = true;
    };

    // Error Callback
    this.onError = function(error) {
                this.addMessageToUI("error", error);
                this.sendButton.enabled = true;
                this.inputBox.enabled = true;
                this.exportButton.enabled = true;
                this.inputBox.focused = true;
    };
}

pi2llmChatDialog.prototype = new Dialog;

/**
 * very basic markdown parser and HTML transformer
 */
function formatSimpleMarkdown(text) {
    if (!text) return "";
    let lines = text.split('\n');
    let html = "";
    for (let i = 0; i < lines.length; ++i) {
        let line = lines[i].trim();
        if (line.length === 0) continue;

        // **Bold** -> <b>Bold</b>
        line = line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // *Italic* -> <i>Italic</i>
        line = line.replace(/\*(.*?)\*/g, '<i>$1</i>');

        // ##### Heading -> <h5>Heading</h5>
        if (line.startsWith('##### ')) {
            html += '<h5>' + line.substring(6) + '</h5>';
            continue;
        }

        // #### Heading -> <h4>Heading</h4>
        if (line.startsWith('#### ')) {
            html += '<h4>' + line.substring(5) + '</h4>';
            continue;
        }

        // ### Heading -> <h3>Heading</h3>
        if (line.startsWith('### ')) {
            html += '<h3>' + line.substring(4) + '</h3>';
            continue;
        }

       // ## Heading -> <h2>Heading</h2>
        if (line.startsWith('## ')) {
            html += '<h2>' + line.substring(3) + '</h2>';
            continue;
        }

       // ## Heading -> <h1>Heading</h1>
        if (line.startsWith('# ')) {
            html += '<h1>' + line.substring(2) + '</h1>';
            continue;
        }

        // * List item -> <ul><li>List item</li></ul>
        if (line.startsWith('* ')) {
            // This is a simplified list renderer. It doesn't handle nested lists.
            if (i === 0 || !lines[i-1].trim().startsWith('* ')) {
                html += '<ul>'; // Start list
            }
            html += '<li>' + line.substring(2) + '</li>';
            if (i === lines.length - 1 || !lines[i+1].trim().startsWith('* ')) {
                html += '</ul>'; // End list
            }
            continue;
        }

        line = line.replace(/!\[(.*?)\]\((.*?)\)/gim, (match, alt, url) => {
                    return "<img alt=\"" + alt  + "\" src=\"" + url + "\">";
                 })
                .replace(/\[(.*?)\]\((.*?)\)/gim, (match, text, url) => {
                    return "<a href=\"" + url  + "\">" + text + "</a>";
                 });

        // For all other lines, wrap them in a paragraph tag.
        html += '<p>' + line + '</p>';
    }

    return html;
}


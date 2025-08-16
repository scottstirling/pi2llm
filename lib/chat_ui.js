// /lib/chat_ui.js

// This file defines the main interactive chat dialog for the pi2llm assistant.

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

    this.analyzeButton = new PushButton(this);
    this.analyzeButton.text = "Analyze Selected Image";
    this.analyzeButton.icon = this.scaledResource(":/icons/analyze.png");
    this.analyzeButton.enabled = !this.viewList.currentView.isNull; // Initially disabled if no view is selected
    this.analyzeButton.toolTip = "<p>Perform a full workspace analysis, focusing on the selected image, and start the chat.</p>";
    this.analyzeButton.onClick = function() {
        this.runInitialAnalysis();
    }.bind(this);

    let topSizer = new HorizontalSizer;
    topSizer.spacing = 6;
    topSizer.add(this.viewList, 100); // Stretch factor
    topSizer.add(this.analyzeButton);

    // -- Main Chat History Box --
    this.historyBox = new TextBox(this);
    this.historyBox.readOnly = true;
    this.historyBox.useRichText = true;
    this.historyBox.text = "<p style='color:#888;'><i>Select an image from the dropdown and click 'Analyze' to begin.</i></p>";

    // -- User Input Panel --
    this.inputBox = new Edit(this);
    this.inputBox.setScaledMinHeight(40);
    this.inputBox.enabled = false; // Disabled until analysis is done

    this.sendButton = new PushButton(this);
    this.sendButton.text = "Send";
    this.sendButton.icon = this.scaledResource(":/icons/arrow-right.png");
    this.sendButton.enabled = false; // Disabled until analysis is done
    this.sendButton.onClick = function() { this.submitUserInput(); }.bind(this);

    this.inputBox.onReturnPressed = function() { if(this.sendButton.enabled) this.sendButton.onClick(); }.bind(this);

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

    let bottomButtonsSizer = new HorizontalSizer;
    bottomButtonsSizer.spacing = 6;
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

    this.windowTitle = "pi2llm Assistant";
    this.setMinWidth(800);
    this.setMinHeight(600);
    this.adjustToContents(); // This ensures it initially fits the content.

    // === METHODS ===

    // ** Chat RESET / NEW
    this.resetChat = function() {
        console.writeln("--- Chat session and history reset by user. ---");
        // Reset state
        this.chatHistory = [];

        // Reset UI components
        this.historyBox.text = "<p style='color:#888;'><i>Select an image from the dropdown and click 'Analyze' to begin.</i></p>";
        this.inputBox.enabled = false;
        this.inputBox.clear();
        this.sendButton.enabled = false;
        this.exportButton.enabled = false;

        // Re-enable the analysis controls and refresh the image list
        this.viewList.getAll();
        this.viewList.enabled = true;
        this.analyzeButton.enabled = !this.viewList.currentView.isNull;
    };

    // Exports chat history to a txt file
    this.exportChatHistory = function() {
        if (this.chatHistory.length === 0) {
            new MessageBox("There is no chat history to export.", "pi2llm").execute();
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
            saveDialog.initialPath = "./pi2llm_chat_log.txt";
        }

        if (saveDialog.execute()) {
            let filePath = saveDialog.fileName;
            let fileContent = "";

            // Check if the user wants to save as JSON or TXT
            if (File.extractExtension(filePath).toLowerCase() === ".json") {
                // Save as raw JSON
                fileContent = JSON.stringify(this.chatHistory, null, 2);
            } else {
                // Save as human-readable text
                fileContent = "pi2llm Assistant Chat Log\n";
                fileContent += "Date: " + new Date().toUTCString() + "\n";
                fileContent += "========================================\n\n";

                for (let i = 0; i < this.chatHistory.length; ++i) {
                    let entry = this.chatHistory[i];
                    let role = entry.role.toUpperCase();
                    let content = entry.content;

                    // Don't dump the huge initial JSON object into the text log.
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
                new MessageBox("Chat history exported successfully to:\n" + filePath, "pi2llm").execute();
            } catch (e) {
                new MessageBox("Error exporting chat history: " + e.message, "pi2llm", StdIcon_Error).execute();
            }
        }
    };


    // Appends a message to the UI chat history box.
    this.addMessageToUI = function(role, text) {

    /** NEW stuff **/
    // 1. Determine the display name and color.
    let displayName;
    let color;
    switch (role) {
        case "user":
            displayName = "User";
            color = "#0000AA"; // A blue for the user
            break;
        case "assistant":
            displayName = "pi2llm"; // Assistant display name
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
    let formattedContent;
    formattedContent = formatSimpleMarkdown(text);

    /**
    if (role === 'assistant') {
        formattedContent = formatSimpleMarkdown(text);
    } else if (role === 'system' && typeof text === 'object') {
        let escapedText = JSON.stringify(text)
                             .replace(/&/g, "&amp;")
                             .replace(/</g, "&lt;")
                             .replace(/>/g, "&gt;");
        formattedContent = "<pre style=\"font-size:10px;\">" + escapedText + "</pre>"; // Use <pre> for code-like text
    } else {
        // For plain user text and simple system messages
        let escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        formattedContent = escapedText.replace(/\n/g, "<br/>");
    }
    **/

    // 3. Assemble the final HTML block
    // We add a <p> tag at the start for a newline and a <div> wrapper for structure.
    let html = "<p><div style=\"margin-bottom: 10px;\">" +
               "<span style=\"color: " + color + ";\"><b>" + displayName + ":</b></span>" +
               "<div style=\"padding-left: 15px;\">" + formattedContent + "</div>" +
               "</div></p>";

        this.historyBox.text += html;
    };

    // This is now called by the "Analyze" button, not automatically.
    this.runInitialAnalysis = function() {
        // Disable analysis controls to prevent re-running
        this.viewList.enabled = false;
        this.analyzeButton.enabled = false;
        this.historyBox.clear();
        this.historyBox.text = "<p style='color:#888;'><i>Performing full workspace analysis... Please wait.</i></p>";

        // Let the UI update before doing heavy work
        processEvents();

        // Get the full workspace DTO
        let workspaceProvider = new WorkspaceDataProvider(this.config);
        let workspaceDTO = workspaceProvider.createDTO();

        // Overwrite the activeViewId with the user's explicit selection.
        workspaceDTO.activeViewId = this.viewList.currentView.id;

        // Reset and build the chat history
        this.chatHistory = [];
        this.chatHistory.push({ role: "system", content: this.config.systemPrompt });
        this.chatHistory.push({ role: "user", content: JSON.stringify(workspaceDTO) });

        this.historyBox.clear();

        this.addMessageToUI("system", "Analysis complete. Sent data for " + workspaceDTO.openImages.length +
                     " images to LLM, with a focus on " + workspaceDTO.activeViewId + ".");
        this.sendRequest();
    };

    this.submitUserInput = function() {
        let userInput = this.inputBox.text.trim();
        if (!userInput) return;
        this.addMessageToUI("user", userInput);
        this.chatHistory.push({ role: "user", content: userInput });
        this.inputBox.clear();
        this.sendRequest();
    };

    this.sendRequest = function() {
        this.sendButton.enabled = false;
        this.inputBox.enabled = false;

        let payload = {
            messages: this.chatHistory,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            stream: false
        };

        let communicator = new LLMCommunicator(this.config.url, this.config.apiKey);
        communicator.sendMessage(
            payload,
            // Success Callback
            function(response) {
                this.chatHistory.push({ role: "assistant", content: response });
                this.addMessageToUI("assistant", response);
                this.sendButton.enabled = true;
                this.inputBox.enabled = true;
                this.exportButton.enabled = true;
                this.inputBox.focused = true;
            }.bind(this),
            // Error Callback
            function(error) {
                this.addMessageToUI("error", error);
                this.sendButton.enabled = true;
                this.inputBox.enabled = true;
                this.exportButton.enabled = true;
                this.inputBox.focused = true;
            }.bind(this)
        );
    };
}

pi2llmChatDialog.prototype = new Dialog;

/**
 * markdown parser and HTML transformer
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

        // ### Heading -> <h3>Heading</h3>
        if (line.startsWith('### ')) {
            html += '<h3>' + line.substring(4) + '</h3>';
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

        // For all other lines, wrap them in a paragraph tag.
        html += '<p>' + line + '</p>';
    }

    return html;
}


// /lib/configuration.js
// This file contains all logic for configuration management and the UI dialog.

#include <pjsr/ColorSpace.jsh>
#include <pjsr/FontFamily.jsh>
#include <pjsr/PenStyle.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/DataType.jsh>      // For DataType constants (DataType_String, etc.)
#include <pjsr/Sizer.jsh>         // For Sizer, VerticalSizer, HorizontalSizer
#include <pjsr/FrameStyle.jsh>    // For FrameStyle constants
#include <pjsr/TextAlign.jsh>     // For TextAlign constants
#include <pjsr/StdButton.jsh>     // For standard button constants like StdButton_Ok

// Define unique keys for persistent storage to avoid conflicts with other scripts.
#define SETTINGS_PREFIX "pi2llm/"
#define SETTINGS_URL SETTINGS_PREFIX + "url"
#define SETTINGS_APIKEY SETTINGS_PREFIX + "apiKey"
#define SETTINGS_MODEL SETTINGS_PREFIX + "model"
#define SETTINGS_PROMPT SETTINGS_PREFIX + "systemPrompt"
#define SETTINGS_TEMP SETTINGS_PREFIX + "temperature"
#define SETTINGS_TOKENS SETTINGS_PREFIX + "maxTokens"
#define SETTINGS_VISION_ENABLED SETTINGS_PREFIX + "visionEnabled" // v3
#define SETTINGS_VISION_MAX_DIM SETTINGS_PREFIX + "visionMaxDim" // v3

/**
 * A helper function to validate a URL string.
 * @param {string} url The URL string to validate.
 * @returns {boolean} True if the URL is considered valid, false otherwise.
 */
function isValidURL(url) {
    if (!url || url.trim().length === 0) {
        return false;
    }
    // URL must start with http:// or https://,
    // followed by at least one character.
    let pattern = new RegExp('^https?:\/\/.+', 'i');
    return pattern.test(url.trim());
}

function ConfigDialog(config) {
    this.__base__ = Dialog;
    this.__base__();
    this.restyle();
    this.config = config;

    this.helpLabel = new Label(this);
    this.helpLabel.frameStyle = FrameStyle_Box;
    this.helpLabel.margin = 4;
    this.helpLabel.wordWrapping = true;
    this.helpLabel.useRichText = true;
    this.helpLabel.text = "<b>LLM Assistant Configuration</b><br/>" + "Configure a connection to an LLM API endpoint.";

    // == Define All UI Items =======================================================
    this.urlLabel = new Label(this);
    this.urlLabel.text = "LLM URL:";
    this.urlLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.apiKeyLabel = new Label(this);
    this.apiKeyLabel.text = "API Key:";
    this.apiKeyLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.modelLabel = new Label(this);
    this.modelLabel.text = "Model:";
    this.modelLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.tempLabel = new Label(this);
    this.tempLabel.text = "Temperature:";
    this.tempLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.tokensLabel = new Label(this);
    this.tokensLabel.text = "Max Tokens:";
    this.tokensLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.urlEdit = new Edit(this);
    this.urlEdit.text = this.config.url;
    this.urlEdit.toolTip = "<p>Enter the full URL for a supported LLM chat endpoint.</p>";

    this.apiKeyEdit = new Edit(this);
    this.apiKeyEdit.text = this.config.apiKey;
    this.apiKeyEdit.passwordMode = true;
    this.apiKeyEdit.toolTip = "<p>Enter API token to plug into <b>Authorization: Bearer</b> header for LLM authentication, if required by your endpoint.</p>";

    this.modelEdit = new Edit(this);
    this.modelEdit.text = this.config.model;
    this.modelEdit.toolTip = "<p>If required by the API endpoint, specify a model.</p>";

    this.tempSpinBox = new NumericControl(this);
    this.tempSpinBox.real = true;
    this.tempSpinBox.setRange(0.0, 2.0);
    this.tempSpinBox.setPrecision(2);
    this.tempSpinBox.setValue(this.config.temperature);
    this.tempSpinBox.toolTip = "<p>The sampling temperature for the LLM. Range: 0.0 to 2.0 (0.8 default). Higher values make the output more random.</p>";

    this.tokensSpinBox = new NumericControl(this);
    this.tokensSpinBox.real = false;
    this.tokensSpinBox.setRange(50, 16000);
    this.tokensSpinBox.setValue(this.config.maxTokens);
    this.tokensSpinBox.toolTip = "<p>The maximum number of tokens to generate in a single response. Range: 50 to 16000.</p>";

    // ** v3 VISION SETTINGS UI ELEMENTS **
    this.visionEnabledCheckBox = new CheckBox(this);
    this.visionEnabledCheckBox.text = "Enable Visual Analysis";
    this.visionEnabledCheckBox.toolTip = "<p>Allows the assistant to send a compressed version of your image for analysis.<br/>This must be checked to enable the 'Send Image' option in the main chat window.</p>";
    this.visionEnabledCheckBox.checked = this.config.enableVision;

    this.visionWarningLabel = new Label(this);
    this.visionWarningLabel.useRichText = true;
    this.visionWarningLabel.wordWrapping = true;
    this.visionWarningLabel.styleSheet = "QLabel { color: #8B0000; font-style: italic; }"; // Dark red, italic
    this.visionWarningLabel.text = "<b>Warning:</b> Enabling this will send a compressed (JPG) version of the selected image to the LLM endpoint. Only enable this if you trust the LLM provider.";

    this.visionMaxDimLabel = new Label(this);
    this.visionMaxDimLabel.text = "Vision max pixels:";
    this.visionMaxDimLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.visionMaxDimSpinBox = new NumericControl(this);
    this.visionMaxDimSpinBox.real = false;
    this.visionMaxDimSpinBox.setRange(512, 2048);
    this.visionMaxDimSpinBox.setValue(this.config.visionMaxDimension);
    this.visionMaxDimSpinBox.toolTip = "<p>The maximum width or height for images sent to the LLM.<br/>Larger images will be scaled down. 2048 is the best value for high-quality models.</p>";

    // configuration profile elements
    this.loadButton = new PushButton(this);
    this.loadButton.text = "Load Profile...";
    this.loadButton.toolTip = "<p>Load a saved configuration profile from a JSON file.</p>";
    this.loadButton.onClick = function() { this.loadProfile(); }.bind(this);

    this.saveButton = new PushButton(this);
    this.saveButton.text = "Save Profile...";
    this.saveButton.toolTip = "<p>Save the current settings to a JSON configuration profile file.</p>";
    this.saveButton.onClick = function() { this.saveProfile(); }.bind(this);

    // == Top Section Layout (Revised for Alignment) ============================

    // To make all input fields line up perfectly, we give all labels the same fixed width.
    let allLabels = [this.urlLabel, this.apiKeyLabel, this.modelLabel, this.tempLabel, this.tokensLabel, this.visionMaxDimLabel];
    let maxLabelWidth = 0;
    for (var i = 0; i < allLabels.length; ++i) {
        let width = allLabels[i].font.width(allLabels[i].text + "  "); // Add padding
        if (width > maxLabelWidth) {
            maxLabelWidth = width;
        }
    }
    for (var i = 0; i < allLabels.length; ++i) {
        allLabels[i].setFixedWidth(maxLabelWidth);
    }

    // A VerticalSizer will now hold each row.
    let topSectionSizer = new VerticalSizer;
    topSectionSizer.spacing = 4; // Spacing between rows

    // Create a HorizontalSizer for each label-input pair.
    let urlSizer = new HorizontalSizer;
    urlSizer.spacing = 6;
    urlSizer.add(this.urlLabel);
    urlSizer.add(this.urlEdit, 100);
    topSectionSizer.add(urlSizer);

    let apiKeySizer = new HorizontalSizer;
    apiKeySizer.spacing = 6;
    apiKeySizer.add(this.apiKeyLabel);
    apiKeySizer.add(this.apiKeyEdit, 100);
    topSectionSizer.add(apiKeySizer);

    let modelSizer = new HorizontalSizer;
    modelSizer.spacing = 6;
    modelSizer.add(this.modelLabel);
    modelSizer.add(this.modelEdit, 100);
    topSectionSizer.add(modelSizer);

    let tempSizer = new HorizontalSizer;
    tempSizer.spacing = 6;
    tempSizer.add(this.tempLabel);
    tempSizer.add(this.tempSpinBox, 100);
    topSectionSizer.add(tempSizer);

    let tokensSizer = new HorizontalSizer;
    tokensSizer.spacing = 6;
    tokensSizer.add(this.tokensLabel);
    tokensSizer.add(this.tokensSpinBox, 100);
    topSectionSizer.add(tokensSizer);

    // == Prompt Area ==========================================================
    this.promptLabel = new Label(this);
    this.promptLabel.text = "System Prompt:";
    this.promptLabel.textAlignment = TextAlign_Left | TextAlign_VertCenter;

    this.promptEdit = new TextBox(this);
    this.promptEdit.text = this.config.systemPrompt;
    this.promptEdit.readOnly = false;
    this.promptEdit.wordWrapping = true;
    this.promptEdit.setMinHeight(300);

    // == Buttons Layout =======================================================
    this.resetButton = new PushButton(this);
    this.resetButton.text = "Reset to Defaults";
    this.resetButton.toolTip = "<p>Removes saved settings and restores the original defaults.</p>";
    this.resetButton.onClick = function() {
        let mb = new MessageBox(
            "Are you sure you want to reset all settings to their default values?",
            "Confirm Reset",
            StdIcon_Warning,
            StdButton_Yes, StdButton_No
        );
        if (mb.execute() == StdButton_Yes) {
            this.onReset();
        }
    }.bind(this);

    this.okButton = new PushButton(this);
    this.okButton.text = "OK";
    this.okButton.icon = this.scaledResource(":/icons/ok.png");
    this.okButton.onClick = function() {
        this.onOK();
        // this.ok();  "final" OK is after validation in onOK() now
    }.bind(this);

    this.cancelButton = new PushButton(this);
    this.cancelButton.text = "Cancel";
    this.cancelButton.icon = this.scaledResource(":/icons/cancel.png");
    this.cancelButton.onClick = function() { this.cancel(); }.bind(this);

    // Add the load and save buttons to the left, and keep OK/Cancel on the right.
    let buttonsSizer = new HorizontalSizer;
    buttonsSizer.spacing = 6;
    buttonsSizer.add(this.loadButton);
    buttonsSizer.add(this.saveButton);
    buttonsSizer.add(this.resetButton);
    buttonsSizer.addStretch();
    buttonsSizer.add(this.okButton);
    buttonsSizer.add(this.cancelButton);


    // == Main Layout ==========================================================
    this.sizer = new VerticalSizer;
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(this.helpLabel);
    this.sizer.addSpacing(4); // v3 (was set to 8)
    this.sizer.add(topSectionSizer);
    this.sizer.addSpacing(8); // Add some space before the vision settings

    // v3
    this.sizer.add(this.visionEnabledCheckBox);
    this.sizer.add(this.visionWarningLabel);

    this.sizer.add(this.visionMaxDimLabel);
    this.sizer.add(this.visionMaxDimSpinBox, 100);
    this.sizer.addStretch();

    this.sizer.add(this.promptLabel);
    this.sizer.add(this.promptEdit, 100);
    this.sizer.addSpacing(4);
    this.sizer.add(buttonsSizer);

    this.windowTitle = "LLM Assistant Configuration";
    this.adjustToContents();
    this.setMinWidth(800);
    this.setMinHeight(600);
    this.setVariableSize();

    // == Event Handling =======================================================
    this.onOK = function() {

        let urlToTest = this.urlEdit.text;

        if (!isValidURL(urlToTest)) {
            // If validation fails, show an error message and REJECT the dialog.
            const urlErrorMsg = "The LLM URL appears to be invalid. Please ensure it is a complete URL starting with http:\/\/ or https:\/\/";
            let msg = new MessageBox(urlErrorMsg,
                "Invalid URL",
                StdIcon_Error, StdButton_Ok
            );
            msg.execute();
            // By calling this.reject(), we prevent the dialog from closing and the
            // bad settings from being saved. The user can then correct the input.
            // Note: We don't call this.reject() itself, but we can't accept.
            // A better way is to simply not call this.ok().
            return; // Stop the function here.
        }

        this.config.url = this.urlEdit.text;
        this.config.apiKey = this.apiKeyEdit.text;
        this.config.model = this.modelEdit.text;
        this.config.systemPrompt = this.promptEdit.text;
        this.config.temperature = this.tempSpinBox.value;
        this.config.maxTokens = this.tokensSpinBox.value;
        this.config.enableVision = this.visionEnabledCheckBox.checked;
        this.config.visionMaxDimension = this.visionMaxDimSpinBox.value;
        this.config.save();
        this.ok(); // final OK after input validation
    }

    this.onReset = function() {
        console.writeln("Resetting LLM Assistant settings to default.");
        Settings.remove(SETTINGS_URL);
        Settings.remove(SETTINGS_APIKEY);
        Settings.remove(SETTINGS_MODEL);
        Settings.remove(SETTINGS_PROMPT);
        Settings.remove(SETTINGS_TEMP);
        Settings.remove(SETTINGS_TOKENS);
        Settings.remove(SETTINGS_VISION_ENABLED);
        Settings.remove(SETTINGS_VISION_MAX_DIM);
        let defaultConfig = new Configuration();
        Settings.remove(defaultConfig.hasBeenConfiguredKey);

        this.config = new Configuration();

        this.urlEdit.text = this.config.url;
        this.apiKeyEdit.text = this.config.apiKey;
        this.modelEdit.text = this.config.model;
        this.promptEdit.text = this.config.systemPrompt;
        this.tempSpinBox.setValue(this.config.temperature);
        this.tokensSpinBox.setValue(this.config.maxTokens);
        this.visionMaxDimSpinBox.setValue(this.config.visionMaxDimension);
        this.visionEnabledCheckBox.checked = this.config.enableVision;
    };


     // Method to repopulate the dialog's UI fields from the config object.
    this.updateUIFromConfig = function() {
        this.urlEdit.text = this.config.url;
        this.apiKeyEdit.text = this.config.apiKey;
        this.promptEdit.text = this.config.systemPrompt;
        this.tempSpinBox.setValue(this.config.temperature);
        this.tokensSpinBox.setValue(this.config.maxTokens);
        this.visionEnabledCheckBox.checked = this.config.enableVision;
        this.visionMaxDimSpinBox.setValue(this.config.visionMaxDimension);
    };

    this.loadProfile = function() {
        let openDialog = new OpenFileDialog;
        openDialog.caption = "Load LLM Assistant Settings Profile";
        openDialog.filters = [ ["LLM Assistant Profiles", "*.pi2llm.json"], ["All Files", "*.*"] ];

        if (openDialog.execute()) {
            try {
                let filePath = openDialog.fileName;
                let fileContent = File.readTextFile(filePath);
                let loadedConfig = JSON.parse(fileContent);

                // Update the config object with the loaded data
                this.config.url = loadedConfig.url || this.config.url;
                this.config.apiKey = loadedConfig.apiKey || this.config.apiKey;
                // ... (and so on for all other properties)
                this.config.enableVision = loadedConfig.enableVision || false;

                console.writeln("Successfully loaded profile from: ", filePath);
                // Refresh the UI to show the new settings
                this.updateUIFromConfig();

            } catch (e) {
                new MessageBox("Failed to load or parse the profile file: " + e.message, "Load Error", StdIcon_Error).execute();
            }
        }
    };

    this.saveProfile = function() {
        let saveDialog = new SaveFileDialog;
        saveDialog.caption = "Save LLM Assistant Settings Profile";
        saveDialog.filters = [ ["LLM Assistant Profiles", "*.pi2llm.json"], ["All Files", "*.*"] ];
        saveDialog.initialPath = "llm-config-01.pi2llm.json";

        if (saveDialog.execute()) {
            try {
                // Create a clean object with the current UI settings
                let profileToSave = {
                    url: this.urlEdit.text,
                    apiKey: this.apiKeyEdit.text,
                    systemPrompt: this.promptEdit.text,
                    temperature: this.tempSpinBox.value,
                    maxTokens: this.tokensSpinBox.value,
                    enableVision: this.visionEnabledCheckBox.checked,
                    visionMaxDimension: this.visionMaxDimSpinBox.value
                };

                let fileContent = JSON.stringify(profileToSave, null, 2); // Pretty-print for readability
                File.writeTextFile(saveDialog.fileName, fileContent);
                console.writeln("Successfully saved profile to: ", saveDialog.fileName);

            } catch (e) {
                new MessageBox("Failed to save the profile file: " + e.message, "Save Error", StdIcon_Error).execute();
            }
        }
    };
}



ConfigDialog.prototype = new Dialog;

/*
 * Configuration: Manages loading, saving, and launching the config UI.
 */
function Configuration() {
    // --- Default values ---
    this.hasBeenConfiguredKey = "pi2llm/hasBeenConfigured";

    // default URL to local openai-compatible api such as local llamacpp-server, ollama, LMStudio, etc
    this.url = "http://127.0.0.1:1234/v1/chat/completions"

    this.apiKey = "no-key";

    this.model = ""

    this.enableVision = false; // The main opt-in for VLLM data exchange

    this.visionMaxDimension = 2048; // configurable maximum image dimensions for sending to VLLM.

    this.systemPrompt = "You are LLM Assistant, an expert in PixInsight and astrophotography image processing. \
      Your goal is to provide helpful, data-driven advice to the user. You will receive user prompts in one of three formats: \
       1. Simple Chat Message: A plain text question. Answer it to the best of your ability as a PixInsight expert.\
       2. Image Profile (JSON only): The user has analyzed an image, and the prompt will contain a detailed JSON object.\
       Use this data to inform your response. The key fields are: image: Basic properties such as dimensions and color space.\
       astrometry: Detailed plate solution data, if available. sensor: Pixel size, if available. processingHistory: (two parts):\
          i. liveSessionHistory: An ordered list of processes applied during the current interactive session.\
         ii. fileHistory: A list of history records from the image file, showing what was done in previous sessions.\
       fitsKeywords: A list of FITS header keywords (metadata), values and comments from the image.\
       3.  Image Profile with Visual Data (JSON + Image): The prompt will be multi-modal, containing both the JSON profile \
       AND an accompanying image. This is the richest context. You MUST use both when available, but prioritize the visual \
       information in the image as the ultimate source of truth.\
       Crucial Directives:\
       - Image as Ground Truth: Treat the image as the primary source of information. Visual analysis of the image's \
       content (colors, details, artifacts, gradients, etc.) should override conflicting data from filenames, metadata, \
       or processing history. For example, if the filename indicates \"starless\" but stars are visible in the image, use \
       the presence of stars in your analysis.\
       - Acknowledge Resolution Limits: Be aware that the images you see might be downsized versions of the original. Factor \
       this into your analysis and acknowledge the potential loss of fine detail when making assessments.\
       - Processing History Awareness: Be aware of information contained in the history metadata, but note that the processing \
       history may be incomplete. Look for visual indicators of processing that are not reflected in the metadata.\
       - Detailed Visual Analysis: Provide a thorough description of what you observe in the image, including: \
         - Identification of prominent objects (nebulae, galaxies, etc.).\
         - Assessment of color balance, including any potential issues or imbalances.\
         - Identification of artifacts (halos, ringing, over-smoothing, etc.).\
         - Evaluation of background gradients and uniformity.  Assessment of overall image sharpness and detail.\
      - Data-Driven Justification: When making recommendations, explicitly reference the specific visual observations \
      from the image that support your suggestions.\
      - Markdown Formatting: Format all responses using simple Markdown (headings, bold, italics, lists, emojis ok).\
     By following these guidelines, you will provide the most insightful and accurate recommendations possible."

    // LLM metadata
    this.temperature = 0.8;

    this.maxTokens = 8000;

    this.load = function() {
        let value;
        value = Settings.read(SETTINGS_URL, DataType_String);
        if (Settings.lastReadOK) this.url = value;
        value = Settings.read(SETTINGS_APIKEY, DataType_String);
        if (Settings.lastReadOK) this.apiKey = value;
        value = Settings.read(SETTINGS_MODEL, DataType_String);
        if (Settings.lastReadOK) this.model = value;
        value = Settings.read(SETTINGS_PROMPT, DataType_String);
        if (Settings.lastReadOK) this.systemPrompt = value;
        value = Settings.read(SETTINGS_TEMP, DataType_Double);
        if (Settings.lastReadOK) this.temperature = value;
        value = Settings.read(SETTINGS_TOKENS, DataType_Int32);
        if (Settings.lastReadOK) this.maxTokens = value;
        value = Settings.read(SETTINGS_VISION_ENABLED, DataType_Boolean);
        if (Settings.lastReadOK) this.enableVision = value;
        value = Settings.read(SETTINGS_VISION_MAX_DIM, DataType_Int32);
        if (Settings.lastReadOK) this.visionMaxDimension = value;
    };

    this.save = function() {
        Settings.write(SETTINGS_URL, DataType_String, this.url);
        Settings.write(SETTINGS_APIKEY, DataType_String, this.apiKey);
        Settings.write(SETTINGS_MODEL, DataType_String, this.model);
        Settings.write(SETTINGS_PROMPT, DataType_String, this.systemPrompt);
        Settings.write(SETTINGS_TEMP, DataType_Double, this.temperature);
        Settings.write(SETTINGS_TOKENS, DataType_Int32, this.maxTokens);
        Settings.write(SETTINGS_VISION_ENABLED, DataType_Boolean, this.enableVision);
        Settings.write(SETTINGS_VISION_MAX_DIM, DataType_Int32, this.visionMaxDimension);
    };

    this.launchDialog = function() {
        let dialog = new ConfigDialog(this);
        if (dialog.execute()) {
            this.save();
            return true;
        }
        return false;
    };

    this.isFirstRun = function() {
        Settings.read(this.hasBeenConfiguredKey, DataType_Boolean);
        return !Settings.lastReadOK;
    };

    this.setHasBeenConfigured = function() {
        Settings.write(this.hasBeenConfiguredKey, DataType_Boolean, true);
    };
}

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
    this.helpLabel.text = "<b>LLM Assistant Configuration</b><br/>" + "Configure the connection to your LLM API endpoint.";

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
    this.urlEdit.toolTip = "<p>Enter the full URL for your LLM's OpenAI-compatible chat endpoint.</p>";

    this.apiKeyEdit = new Edit(this);
    this.apiKeyEdit.text = this.config.apiKey;
    this.apiKeyEdit.passwordMode = true;
    this.apiKeyEdit.toolTip = "<p>Enter API token to plug into <b>Authorization: Bearer</b> header for LLM authentication, if required by your endpoint.</p>";

    this.modelEdit = new Edit(this);
    this.modelEdit.text = this.config.model;
    this.modelEdit.toolTip = "<p>If required by your API endpoint, specify a model.</p>";

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

    // == Top Section Layout (Revised for Alignment) ============================

    // To make all input fields line up perfectly, we give all labels the same fixed width.
    let allLabels = [this.urlLabel, this.apiKeyLabel, this.modelLabel, this.tempLabel, this.tokensLabel];
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

    // == Buttons ==============================================================
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
        this.ok();
    }.bind(this);

    this.cancelButton = new PushButton(this);
    this.cancelButton.text = "Cancel";
    this.cancelButton.icon = this.scaledResource(":/icons/cancel.png");
    this.cancelButton.onClick = function() { this.cancel(); }.bind(this);

    let buttonsSizer = new HorizontalSizer;
    buttonsSizer.spacing = 6;
    buttonsSizer.add(this.resetButton);
    buttonsSizer.addStretch();
    buttonsSizer.add(this.okButton);
    buttonsSizer.add(this.cancelButton);


    // == Main Layout ==========================================================
    this.sizer = new VerticalSizer;
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(this.helpLabel);
    this.sizer.addSpacing(8);
    this.sizer.add(topSectionSizer);
    this.sizer.addSpacing(8);
    this.sizer.add(this.promptLabel);
    this.sizer.add(this.promptEdit, 100);
    this.sizer.addSpacing(4);
    this.sizer.add(buttonsSizer);

    this.windowTitle = "LLM Assistant Configuration";
    this.adjustToContents();
    this.setMinWidth(800);
    this.setMinHeight(500);
    this.setVariableSize();

    // == Event Handling =======================================================
    this.onOK = function() {
        this.config.url = this.urlEdit.text;
        this.config.apiKey = this.apiKeyEdit.text;
        this.config.model = this.modelEdit.text;
        this.config.systemPrompt = this.promptEdit.text;
        this.config.temperature = this.tempSpinBox.value;
        this.config.maxTokens = this.tokensSpinBox.value;
        this.config.save();
    }

    this.onReset = function() {
        console.writeln("Resetting LLM Assistant settings to default.");
        Settings.remove(SETTINGS_URL);
        Settings.remove(SETTINGS_APIKEY);
        Settings.remove(SETTINGS_MODEL);
        Settings.remove(SETTINGS_PROMPT);
        Settings.remove(SETTINGS_TEMP);
        Settings.remove(SETTINGS_TOKENS);
        let defaultConfig = new Configuration();
        Settings.remove(defaultConfig.hasBeenConfiguredKey);

        this.config = new Configuration();

        this.urlEdit.text = this.config.url;
        this.apiKeyEdit.text = this.config.apiKey;
        this.modelEdit.text = this.config.model;
        this.promptEdit.text = this.config.systemPrompt;
        this.tempSpinBox.setValue(this.config.temperature);
        this.tokensSpinBox.setValue(this.config.maxTokens);
    };
}

ConfigDialog.prototype = new Dialog;

/*
 * Configuration: Manages loading, saving, and launching the config UI.
 */
function Configuration() {
    // --- Default values ---
    this.hasBeenConfiguredKey = "pi2llm/hasBeenConfigured";

    // URL to remote openai-compatible api or local llamacpp-server, ollama, LMStudio, etc
    // http://127.0.0.1:4321/v1/chat/completions
    this.url = "http://127.0.0.1:8010/llm/chat";

    this.apiKey = "no-key";

    this.model = ""

    this.systemPrompt = "You are LLM Assistant, an expert PixInsight, astrophotography and image processing assistant. \
      Your goal is to advise the user on astrophotography, astronomy and PixInsight techniques and tools for image processing. \
      The user may chat informally or may submit formalized image data details for context and advice on next processing step(s). \
      Format your responses using simple Markdown (bold, italics, headings, and lists). When available, analyze data \
      extracted from and about the image and structured in JSON as follows. \
      DATA STRUCTURE: \
        - environment: Information about the user's PixInsight version and OS. \
        - image: Basic properties such as dimensions and color space. \
        - astrometry: Detailed plate solution data, if available. \
        - sensor: Pixel size, if available. \
        - processingHistory: two parts: \
          1. liveSessionHistory: An ordered list of processes applied during the current interactive session. \
          2. fileHistory: A list of HISTORY records from the image file, showing what was done in previous sessions. \
        - fitsKeywords: A list of FITS header keywords (metadata), values and comments from the image. \
       YOUR TASKS: \
       1. Analyze the image processing history to appreciate the image status and if applicable suggest logical processing next step(s). \
       2. Use astrometry data to identify the astronomical objects of interest in the image and its processingHistory to summarize how the image was created. \
       3. Justify recommendations by referencing provided data. \
       4. Offer assistance with PixInsight processing, astronomy, astrophotography and other topics as the user requests.";

    // LLM metadata
    this.temperature = 0.8;

    // TODO: figure out how to set min and max for the UI slider for maxTokens
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
    };

    this.save = function() {
        Settings.write(SETTINGS_URL, DataType_String, this.url);
        Settings.write(SETTINGS_APIKEY, DataType_String, this.apiKey);
        Settings.write(SETTINGS_MODEL, DataType_String, this.model);
        Settings.write(SETTINGS_PROMPT, DataType_String, this.systemPrompt);
        Settings.write(SETTINGS_TEMP, DataType_Double, this.temperature);
        Settings.write(SETTINGS_TOKENS, DataType_Int32, this.maxTokens);
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

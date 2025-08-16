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
#include <pjsr/Sizer.jsh>         // For Sizer, VerticalSizer, HorizontalSizer, GridSizer
#include <pjsr/FrameStyle.jsh>    // For FrameStyle constants
#include <pjsr/TextAlign.jsh>     // For TextAlign constants
#include <pjsr/StdButton.jsh>     // For standard button constants like StdButton_Ok

// Define unique keys for persistent storage to avoid conflicts with other scripts.
#define SETTINGS_PREFIX "pi2llm/"
#define SETTINGS_URL SETTINGS_PREFIX + "url"
#define SETTINGS_APIKEY SETTINGS_PREFIX + "apiKey"
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
    this.helpLabel.text = "<b>pi2llm  Assistant Configuration</b><br/>" + "Configure the connection to your local Large Language Model (LLM).";
    this.urlLabel = new Label(this);
    this.urlLabel.text = "LLM URL:";
    this.urlLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    this.urlEdit = new Edit(this);
    this.urlEdit.text = this.config.url;
    this.apiKeyLabel = new Label(this);
    this.apiKeyLabel.text = "API Key:";
    this.apiKeyLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    this.apiKeyEdit = new Edit(this);
    this.apiKeyEdit.text = this.config.apiKey;
    this.apiKeyEdit.passwordMode = true;
    this.promptLabel = new Label(this);
    this.promptLabel.text = "System Prompt:";
    this.promptLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    this.promptEdit = new TextBox(this);
    this.promptEdit.text = this.config.systemPrompt;
    this.promptEdit.readOnly = false;
    this.promptEdit.wordWrapping = true;
    this.promptEdit.setFixedHeight(120);
    this.tempLabel = new Label(this);
    this.tempLabel.text = "Temperature:";
    this.tempLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    this.tempSpinBox = new NumericControl(this);
    this.tempSpinBox.real = true;
    this.tempSpinBox.setRange(0.0, 2.0);
    this.tempSpinBox.setPrecision(2);
    this.tempSpinBox.setValue(this.config.temperature);
    this.tokensLabel = new Label(this);
    this.tokensLabel.text = "Max Tokens:";
    this.tokensLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    this.tokensSpinBox = new NumericControl(this);
    this.tokensSpinBox.real = false;
    this.tokensSpinBox.setRange(50, 8000);
    this.tokensSpinBox.setValue(this.config.maxTokens);

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
    let labelsSizer = new VerticalSizer;
    labelsSizer.spacing = 8;
    labelsSizer.add(this.urlLabel);
    labelsSizer.add(this.apiKeyLabel);
    labelsSizer.add(this.promptLabel);
    labelsSizer.add(this.tempLabel);
    labelsSizer.add(this.tokensLabel);

    let inputsSizer = new VerticalSizer;
    inputsSizer.spacing = 4;
    inputsSizer.add(this.urlEdit);
    inputsSizer.add(this.apiKeyEdit);
    inputsSizer.add(this.promptEdit);
    inputsSizer.add(this.tempSpinBox);
    inputsSizer.add(this.tokensSpinBox);

    let formSizer = new HorizontalSizer;
    formSizer.spacing = 6;
    formSizer.add(labelsSizer);
    formSizer.add(inputsSizer, 100);
    let buttonsSizer = new HorizontalSizer;
    buttonsSizer.spacing = 6;
    buttonsSizer.addStretch();
    buttonsSizer.add(this.okButton);
    buttonsSizer.add(this.cancelButton);
    this.sizer = new VerticalSizer;
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(this.helpLabel);
    this.sizer.addSpacing(4);
    this.sizer.add(formSizer);
    this.sizer.addStretch();
    this.sizer.add(buttonsSizer);
    this.windowTitle = "pi2llm Configuration";
    this.adjustToContents();
    this.setMinWidth(600);
    this.onOK = function() {
        this.config.url = this.urlEdit.text;
        this.config.apiKey = this.apiKeyEdit.text;
        this.config.systemPrompt = this.promptEdit.text;
        this.config.temperature = this.tempSpinBox.value;
        this.config.maxTokens = this.tokensSpinBox.value;

        this.config.save();
    }
}

ConfigDialog.prototype = new Dialog;


/*
 * Configuration: Manages loading, saving, and launching the config UI.
 */
function Configuration() {
    // --- Default values ---
    this.hasBeenConfiguredKey = "pi2llm/hasBeenConfigured";

    // LMStudio
    // http://127.0.0.1:4321/v1/chat/completions

    this.url = "http://127.0.0.1:8010/llm/chat";
    this.apiKey = "no-key";
    this.systemPrompt = "You are pi2llm,  an expert PixInsight and astrophotography image processing assistant. \
    Analyze the following JSON data from the user's PixInsight workspace. \
    It includes a list of all `openImages` and `processIcons`. \
    The `activeViewId` indicates the user's primary image of interest.  \
    Look at the relationships between image names (e.g., '_clone', '_starless', '_mask', _L, _R, _G, _B) to infer the user's workflow. \
    Provide concise, expert recommendations that may involve multiple images, such as combining star/starless pairs or applying masks. \
    Data may include: `acquisition` (camera, exposure, gain/ISO), `quality` (FWHM, eccentricity), `statistics` (noise estimates), and more. \
    If astrometric data is present, use it to deduce the probable astronomical contents of interest in the image and how the type of target relates to processing advice. \
    Use this data to justify your recommendations. \
    Provide a concise, expert recommendation for the *next one or two* processing steps.\
    Justify your recommendation by directly referencing the provided data, especially the acquisition and quality metrics. \
    **Please format your response using simple Markdown (bold, italics, headings, and lists).** \
    Be aware that JPG or PNG files will have minimal `metadata`, but may still have `astrometry` data if they have been plate-solved in the session.";

    this.temperature = 0.8;
    this.maxTokens = 1234;

    this.load = function() {
        let value;
        value = Settings.read(SETTINGS_URL, DataType_String);
        if (Settings.lastReadOK) this.url = value;
        value = Settings.read(SETTINGS_APIKEY, DataType_String);
        if (Settings.lastReadOK) this.apiKey = value;
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

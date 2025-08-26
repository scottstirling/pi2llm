# PXI2LLM for PixInsight: Your AI-Powered Astrophotography Assistant

![PXI2LLM Assistant Banner](https://placehold.co/800x200/171C2C/FFFFFF/png?text=PXI2LLM+for+PixInsight)

**PXI2LLM for PixInsight** is a powerful script that integrates a local Large Language Model (LLM) directly into your PixInsight workspace. It acts as an intelligent assistant, aware of your image's specific data, to provide expert advice on your next processing steps, help you understand your data, and even generate descriptions for your finished work.

Stop guessing and start getting data-driven recommendations tailored to *your* image, right inside PixInsight.

---

## Features

*   **Context-Aware Analysis:** PXI2LLM doesn't give generic advice. It analyzes a complete profile of your selected image, including:
    *   **Live Processing History:** Understands the steps you've *just* taken in the current session.
    *   **Astrometric Data:** Knows what object you're imaging and at what image scale.
    *   **Image Properties:** Dimensions, color space, file path, and more.
    *   **FITS Header:** A complete dump of all keyword data.
*   **Interactive Chat UI:** A persistent, dockable-style dialog where you can have a full conversation with the assistant.
*   **Expert Recommendations:** Asks the LLM to suggest the next logical processing steps based on your image's current state.
*   **Image Description Generation:** Select a finished image and ask PXI2LLM to write a detailed description of the astronomical target and the processing workflow used to create it.
*   **Highly Configurable:** Easily configure your local LLM endpoint through a clean user interface.

*(Here would be a great place for a screenshot of the main chat UI, showing the image selection dropdown, the chat history, and the input box.)*

`[Screenshot of the PXI2LLM Assistant main dialog in action]`

---

## Requirements

1.  **PixInsight:** Version 1.8.9 or later is recommended.
2.  **A Local LLM Server:** You must have a local LLM running that provides an OpenAI-compatible API endpoint. A popular and highly effective tool for this is [LM Studio](https://lmstudio.ai/). PXI2LLM is tested and works well with it.
3.  **An LLM Model:** A capable chat or instruction-tuned model. Models like Llama 3, Mixtral, and variants of Mistral 7B are excellent choices.

---

## Installation

1.  **Download the Script:** Download the `main` branch of this repository as a `.zip` file and extract it to a memorable location.
2.  **Open PixInsight.**
3.  Go to the main menu and select `Script > Feature Scripts...`.
4.  In the Feature Scripts dialog, click the **"Add"** button.
5.  Navigate to the location where you extracted the repository and select the **`gemini`** folder (the folder that contains `gemini.js` and the `lib` sub-folder).
6.  Click **"Select Directory"**. You should see "PXI2LLM Assistant" and "Configure PXI2LLM Assistant" appear in the list.
7.  Click **"Done"**.
8.  **Restart PixInsight.** This is a mandatory step for the new menu items to appear correctly.

After restarting, you will find the assistant under the `Script > StirlingAstrophoto` menu.

---

## First-Time Configuration

Before you can use the assistant, you must tell it how to connect to your local LLM.

1.  Go to `Script > StirlingAstrophoto > Configure PXI2LLM Assistant`.
2.  The configuration dialog will open.

    *(A screenshot of the configuration dialog would be perfect here, highlighting the URL field.)*

    `[Screenshot of the Configuration Dialog]`

3.  **LLM URL:** This is the most important field. Enter the full URL of your local LLM's chat completions endpoint.
    *   For **LM Studio**, this is typically `http://127.0.0.1:1234/v1/chat/completions`.
4.  **API Key:** Most local servers do not require an API key. You can usually leave this as the default "no-key".
5.  **System Prompt:** A powerful default prompt is provided. You can customize this later if you become a power user.
6.  **Temperature / Max Tokens:** These control the "creativity" and length of the LLM's responses. The defaults are a good starting point.
7.  Click **"OK"** to save your settings.

You only need to do this once.

---

## How to Use PXI2LLM

Using the assistant is a simple, interactive process.

1.  **Open one or more images** in your PixInsight workspace. For best results, use images that have been plate-solved.
2.  Go to `Script > StirlingAstrophoto > PXI2LLM Assistant` to launch the main tool.
3.  The chat window will appear.
4.  **Select Your Target Image:** Use the dropdown menu at the top of the window to choose the primary image you want to work on.
5.  **Analyze:** Click the **"Analyze Selected Image"** button. The script will perform a complete analysis and send the data to the LLM.
6.  **Chat!** The first response from the LLM will appear. You can now have a conversation:
    *   Ask for recommendations: `"What should I do next?"`
    *   Ask for clarification: `"Explain what DynamicBackgroundExtraction does."`
    *   Ask for a description: `"Please write a description for this image of M31."`

### Key Features of the Chat Window

*   **New Chat:** Resets the conversation and allows you to select a new image, starting a fresh analysis.
*   **Settings:** Opens the configuration dialog at any time to tweak your settings.
*   **Export History:** Saves the current conversation to a `.txt` or `.json` file, perfect for keeping logs with your project data.

---

## Feedback and Contributions

This is a new tool, and we welcome your feedback! If you encounter bugs, have ideas for new features, or would like to contribute, please [open an issue](https://github.com/your-username/your-repo/issues) on our GitHub repository.

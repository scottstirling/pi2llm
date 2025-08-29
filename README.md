# LLM Assistant (for PixInsight): AI-Powered Astrophotography Copilot

![LLM Assistant Banner](https://placehold.co/800x200/171C2C/FFFFFF/png?text=LLM+Assistant+(for+PixInsight))

**LLM Assistant for PixInsight** is a powerful script that integrates a local or cloud-based Large Language Model (LLM) directly into your PixInsight workspace. It acts as an intelligent copilot, aware of your image's specific data, to provide expert advice on your next processing steps, help you understand your data, and even generate descriptions for your finished work.

Stop guessing and start getting data-driven recommendations tailored to *your* image, right inside PixInsight.

---

## Features

*   **Context-Aware Analysis:** The assistant doesn't give generic advice. It analyzes a complete profile of your selected image, including:
    *   **Live Processing History:** Understands the steps you've *just* taken in the current session.
    *   **Astrometric Data:** Knows what object you're imaging and at what image scale.
    *   **Image Properties:** Dimensions, color space, file path, and more.
    *   **FITS Header:** A complete dump of all keyword data.
*   **Interactive Chat UI:** A persistent, dockable-style dialog where you can have a full conversation with the assistant.
*   **Expert Recommendations:** Asks the LLM to suggest the next logical processing steps based on your image's current state.
*   **Image Description Generation:** Select a finished image and ask the assistant to write a detailed description of the astronomical target and the processing workflow used to create it.
*   **Highly Configurable:** Easily configure your connection to any OpenAI-compatible API through a clean user interface.

*(Here would be a great place for a screenshot of the main chat UI, showing the image selection dropdown, the chat history, and the input box.)*

`[Screenshot of the LLM Assistant main dialog in action]`

---

## Requirements

1.  **PixInsight:** Version 1.8.9 or later is recommended.
2.  **An LLM Server (Local or Cloud):** You must have access to an LLM that provides an OpenAI-compatible API endpoint. This is a flexible requirement that can be met in several ways:
    *   **Local Servers (Recommended for privacy and no cost):**
        *   [LM Studio](https://lmstudio.ai/): An easy-to-use desktop app for running local models.
        *   [llama.cpp](https://github.com/ggerganov/llama.cpp): A high-performance engine with an OpenAI-compatible server option for more advanced users.
    *   **Cloud Services (For powerful, cutting-edge models):**
        *   **Cloudflare AI Gateway:** A fantastic service to connect to models from Meta (Llama 3), Google, and more.
        *   **Google AI Platform / Vertex AI:** Use Google's latest models like Gemini via their OpenAI-compatible endpoint.
        *   Any other service that offers an OpenAI-compatible API.
3.  **An LLM Model:** A capable chat or instruction-tuned model. Models like Llama 3, Mixtral, Qwen, Gemini, and variants of Mistral 7B are excellent choices.

---

## Installation

1.  **Download the Script:** Download the `main` branch of this repository as a `.zip` file and extract it to a memorable location.
2.  **Open PixInsight.**
3.  Go to the main menu and select `Script > Feature Scripts...`.
4.  In the Feature Scripts dialog, click the **"Add"** button.
5.  Navigate to the location where you extracted the repository and select the **`pi2llm`** folder (the folder that contains `pi2llm-main.js` and the `lib` sub-folder).
6.  Click **"Select Directory"**. You should see "LLM Assistant" and "Configure LLM Assistant" appear in the list.
7.  Click **"Done"**.
8.  **Restart PixInsight.** This is a mandatory step for the new menu items to appear correctly.

After restarting, you will find the assistant under the `Script > LLM Assistant` menu.

---

## First-Time Configuration

Before using the assistant, tell it how to connect to your LLM's endpoint.

1.  Go to `Script > LLM Assistant > Configure LLM Assistant`.
2.  The configuration dialog will open.

    *(A screenshot of the configuration dialog would be perfect here, highlighting the URL, API Key, and Model fields.)*

    `[Screenshot of the Configuration Dialog]`

3.  **LLM URL:** This is the most important field. Enter the full URL of your LLM's chat completions endpoint.
    *   For **LM Studio**, this is typically `http://127.0.0.1:1234/v1/chat/completions`.
    *   For a **Cloudflare AI Gateway**, it will look like `https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_NAME/openai`.
4.  **API Key:** For local servers, you can usually leave this as the default "no-key". For cloud services, enter the API token required for authentication.
5.  **Model:** This field is often required by cloud services to specify which model you want to use.
    *   For a **Cloudflare AI Gateway**, this might be `@cf/meta/llama-3-8b-instruct`.
    *   For **Google AI**, this might be `gemini-1.5-pro-preview-0409`.
    *   For local servers like `llama.cpp` where you only load one model, this field can often be left blank.
6.  **System Prompt:** A default system prompt is provided and can be customized to change the assistant's behavior.
7.  **Temperature / Max Tokens:** These control the "creativity" and length of the LLM's responses. The defaults are a good starting point.
8.  Click **"OK"** to save the script settings.

---

## How to Use the LLM Assistant

Using the assistant is a simple, interactive process.

1.  **Open one or more images** in your PixInsight workspace. For best results, use images that have been plate-solved.
2.  Go to `Script > LLM Assistant > LLM Assistant` to launch the main tool.
3.  The chat window will appear.
4.  **Select a Target Image:** Use the dropdown menu at the top left of the window to choose the primary image you want to work on.
5.  **Analyze:** Click the **"Analyze Selected Image"** button. The script will gather details about the image and send them to the LLM.
6.  **Chat!** The first response from the LLM will appear. You can now have a conversation:
    *   Ask for recommendations: `"What should I do next?"`
    *   Ask for clarification: `"Explain what DynamicBackgroundExtraction does."`
    *   Ask for a description: `"Please write a description for this image of M31 for AstroBin."`

### Key Features of the Chat Window

*   **New Chat:** Resets the conversation and allows you to select a new image.
*   **Settings:** Opens the configuration dialog at any time.
*   **Export History:** Saves the current conversation to a `.txt` or `.json` file.

---

## Feedback and Contributions

This is a new tool, and we welcome your feedback! If you encounter bugs, have ideas for new features, or would like to contribute, please [open an issue](https://github.com/scottstirling/pi2llm/issues) on our GitHub repository.


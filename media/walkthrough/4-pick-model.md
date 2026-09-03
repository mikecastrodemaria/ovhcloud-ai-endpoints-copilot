## Use the models in Copilot Chat

1. Open **Copilot Chat**.
2. Click the current model name at the bottom of the chat box.
3. Choose **Manage Models...**, then **OVHcloud AI Endpoints**.
4. Tick the models you want to see in the picker.
5. Select one and send a message.

Tips:

- Context window and max output are reported as 32k / 8k by default. Adjust per model in the `ovhAiEndpoints.modelOverrides` setting.
- Non-chat models (embeddings, whisper, image generation) are hidden automatically. Edit `ovhAiEndpoints.hideModelPatterns` to change that.

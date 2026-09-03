# OVHcloud AI Endpoints for Copilot Chat

Use the models hosted on [OVHcloud AI Endpoints](https://endpoints.ai.cloud.ovh.net/) (Llama, Mistral, Qwen, DeepSeek, gpt-oss, ...) directly inside GitHub Copilot Chat in VS Code and GitHub Codespaces. European, sovereign AI inference for your editor.

Published by **EUSovereignAI**. This is a community extension, **not** affiliated with or endorsed by OVHcloud.
It is the VS Code companion of [OVHcloudAIEndpointsTester](https://github.com/mikecastrodemaria/OVHcloudAIEndpointsTester).

## Features

- Adds an **OVHcloud AI Endpoints** provider to the Copilot Chat model picker.
- Models are discovered automatically from the `/v1/models` endpoint.
- Streaming responses, tool calling (agent mode) and image input for vision models.
- Your API token is stored in VS Code secret storage, never in settings files.
- Works with any OpenAI-compatible router by changing `ovhAiEndpoints.baseUrl`.

## Setup

An interactive version of this guide is available in VS Code: Command Palette > **OVHcloud AI Endpoints: Open setup guide** (or Help > Get Started > *Set up OVHcloud AI Endpoints for Copilot Chat*). The extension also shows a notification the first time it runs without a token.

### 1. Get an OVHcloud AI Endpoints token

1. Open the [OVHcloud control panel](https://www.ovh.com/manager/#/public-cloud/).
2. Select your Public Cloud project.
3. In the left menu, go to **AI & Machine Learning > AI Endpoints**, then the **API keys** tab.
4. Create a key and copy it. Anonymous access exists but is limited to 2 requests/minute and is not supported here.

### 2. Store the token in VS Code

The token is **not** a setting. It lives in VS Code secret storage (macOS Keychain, Windows Credential Manager, libsecret on Linux), so it never ends up in `settings.json`, in your dotfiles, or in a git repository.

Any of these three ways works:

- Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) > **OVHcloud AI Endpoints: Set API token**, paste the key, press Enter.
- Copilot Chat > click the model name > **Manage Models...** > **OVHcloud AI Endpoints**. If no token is stored, the same input box opens.
- Command Palette > **OVHcloud AI Endpoints: Manage API token** for a small menu (set, test, clear, settings, guide).

To replace the token, run **Set API token** again. To remove it, run **Clear API token**.

### 3. Check the connection

Command Palette > **OVHcloud AI Endpoints: Test connection and list models**. You should see the list of models your token gives access to. Errors (wrong token, rate limit, wrong base URL) are shown in a notification and logged in the **OVHcloud AI Endpoints** output channel (View > Output).

### 4. Pick a model in Copilot Chat

Copilot Chat > click the model name > **Manage Models...** > **OVHcloud AI Endpoints**, tick the models you want. They now appear in the model picker like any other model, with streaming, tool calling (agent mode) and image input for vision models.

## Settings

| Setting | Default | Description |
|---|---|---|
| `ovhAiEndpoints.baseUrl` | `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1` | OpenAI-compatible base URL |
| `ovhAiEndpoints.defaultMaxInputTokens` | `32768` | Context window used when the API does not report one |
| `ovhAiEndpoints.defaultMaxOutputTokens` | `8192` | Max output tokens used when the API does not report one |
| `ovhAiEndpoints.modelOverrides` | `{}` | Per-model overrides (name, token limits, capabilities, hidden) |
| `ovhAiEndpoints.hideModelPatterns` | embeddings, whisper, ... | Substrings used to hide non-chat models |

## Commands

- **OVHcloud AI Endpoints: Set API token**
- **OVHcloud AI Endpoints: Clear API token**
- **OVHcloud AI Endpoints: Test connection and list models**

## Requirements

- VS Code 1.104 or newer.
- GitHub Copilot Chat extension.
- An OVHcloud AI Endpoints access token (anonymous access is rate limited and not supported here).

## License

MIT

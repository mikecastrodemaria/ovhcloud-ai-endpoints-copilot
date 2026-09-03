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

1. Get an access token from the OVHcloud control panel (Public Cloud > AI Endpoints > API keys).
2. In VS Code, run **OVHcloud AI Endpoints: Set API token** from the Command Palette, or open the Copilot Chat model picker, choose **Manage Models...**, then **OVHcloud AI Endpoints**.
3. Pick a model in the Copilot Chat model picker.

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

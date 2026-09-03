## Where does the token go?

**Not in settings.** The token is stored in VS Code secret storage:

- macOS: Keychain
- Windows: Credential Manager
- Linux: libsecret / GNOME Keyring

So it never lands in `settings.json`, in your dotfiles, or in a git repository.

Three ways to enter it:

- Command Palette > **OVHcloud AI Endpoints: Set API token**
- Copilot Chat > model name > **Manage Models...** > **OVHcloud AI Endpoints**
- Command Palette > **OVHcloud AI Endpoints: Manage API token**

To replace it later, run **Set API token** again. To remove it, run **Clear API token**.

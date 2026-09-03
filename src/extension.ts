import * as vscode from 'vscode';
import { OpenAiCompatibleClient } from './client';
import { OvhChatModelProvider, VENDOR } from './provider';

const WALKTHROUGH_ID = 'eusovereignai.ovhcloud-ai-endpoints-copilot#ovhAiEndpoints.gettingStarted';
const FIRST_RUN_KEY = 'ovhAiEndpoints.firstRunNoticeShown';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new OvhChatModelProvider(context);

  void showFirstRunNotice(context, provider);

  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider(VENDOR, provider),

    vscode.commands.registerCommand('ovhAiEndpoints.openGuide', () =>
      vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH_ID, false),
    ),

    vscode.commands.registerCommand('ovhAiEndpoints.manage', async () => {
      const hasToken = Boolean(await provider.getToken());
      const items: vscode.QuickPickItem[] = [
        {
          label: '$(key) Set API token',
          description: hasToken ? 'replace the stored token' : 'no token stored yet',
          detail: 'Stored in VS Code secret storage, not in settings.json',
        },
        { label: '$(plug) Test connection and list models' },
        { label: '$(book) Open setup guide' },
        { label: '$(gear) Open settings' },
      ];
      if (hasToken) {
        items.push({ label: '$(trash) Clear API token' });
      }
      const pick = await vscode.window.showQuickPick(items, { title: 'OVHcloud AI Endpoints' });
      if (!pick) {
        return;
      }
      if (pick.label.includes('Set API token')) {
        await vscode.commands.executeCommand('ovhAiEndpoints.setToken');
      } else if (pick.label.includes('Test connection')) {
        await vscode.commands.executeCommand('ovhAiEndpoints.testConnection');
      } else if (pick.label.includes('Open setup guide')) {
        await vscode.commands.executeCommand('ovhAiEndpoints.openGuide');
      } else if (pick.label.includes('Open settings')) {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'ovhAiEndpoints');
      } else if (pick.label.includes('Clear API token')) {
        await vscode.commands.executeCommand('ovhAiEndpoints.clearToken');
      }
    }),

    vscode.commands.registerCommand('ovhAiEndpoints.setToken', async () => {
      const token = await provider.promptForToken();
      if (token) {
        void vscode.window.showInformationMessage(
          'OVHcloud AI Endpoints token saved. Open the Copilot Chat model picker to select a model.',
        );
      }
    }),

    vscode.commands.registerCommand('ovhAiEndpoints.clearToken', async () => {
      await provider.clearToken();
      void vscode.window.showInformationMessage('OVHcloud AI Endpoints token removed.');
    }),

    vscode.commands.registerCommand('ovhAiEndpoints.testConnection', async () => {
      let token = await provider.getToken();
      if (!token) {
        token = await provider.promptForToken();
      }
      if (!token) {
        return;
      }
      const client = new OpenAiCompatibleClient(provider.baseUrl, token);
      try {
        const models = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Contacting OVHcloud AI Endpoints...' },
          () => client.listModels(),
        );
        const picked = await vscode.window.showQuickPick(
          models.map(m => ({ label: m.id, description: m.owned_by })),
          { title: `${models.length} model(s) available at ${provider.baseUrl}` },
        );
        if (picked) {
          await vscode.env.clipboard.writeText(picked.label);
          void vscode.window.showInformationMessage(`Copied "${picked.label}" to the clipboard.`);
        }
      } catch (err) {
        void vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
      }
    }),
  );
}

/**
 * Once per installation: if no token is stored, tell the user where to put it.
 */
async function showFirstRunNotice(
  context: vscode.ExtensionContext,
  provider: OvhChatModelProvider,
): Promise<void> {
  if (context.globalState.get<boolean>(FIRST_RUN_KEY)) {
    return;
  }
  if (await provider.getToken()) {
    await context.globalState.update(FIRST_RUN_KEY, true);
    return;
  }
  await context.globalState.update(FIRST_RUN_KEY, true);
  const setToken = 'Set API token';
  const guide = 'Open setup guide';
  const choice = await vscode.window.showInformationMessage(
    'OVHcloud AI Endpoints: add your API token to use OVHcloud models in Copilot Chat. The token is stored securely, not in settings.',
    setToken,
    guide,
  );
  if (choice === setToken) {
    await vscode.commands.executeCommand('ovhAiEndpoints.setToken');
  } else if (choice === guide) {
    await vscode.commands.executeCommand('ovhAiEndpoints.openGuide');
  }
}

export function deactivate(): void {
  /* nothing to clean up */
}

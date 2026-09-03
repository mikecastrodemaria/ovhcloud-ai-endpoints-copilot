import * as vscode from 'vscode';
import { OpenAiCompatibleClient } from './client';
import { OvhChatModelProvider, VENDOR } from './provider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new OvhChatModelProvider(context);

  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider(VENDOR, provider),

    vscode.commands.registerCommand('ovhAiEndpoints.manage', async () => {
      const hasToken = Boolean(await provider.getToken());
      const items: vscode.QuickPickItem[] = [
        { label: '$(key) Set API token', description: hasToken ? 'replace the stored token' : undefined },
        { label: '$(plug) Test connection and list models' },
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

export function deactivate(): void {
  /* nothing to clean up */
}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { OpenJscadPanel } from './openjscad-panel';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('openjscad.showPreviewToSide', (params) => {
    if (!params || params.scheme !== 'file') {
      vscode.window.showErrorMessage('No file or directory selected');
      return;
    }
    OpenJscadPanel.createOrShow(context.extensionUri, vscode.Uri.file(params.fsPath));
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

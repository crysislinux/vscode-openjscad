import * as vscode from 'vscode';
import { OpenJscadDir } from './types';
import { DataWatcher } from './data-watcher';

/**
 * Manages OpenJscad webview panels
 */
export class OpenJscadPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: OpenJscadPanel | undefined;

	public static readonly viewType = 'openjscad';

	private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;

  private _fileUri: vscode.Uri;
  private _dataWatcher: DataWatcher;
  private _disposables: vscode.Disposable[] = [];

  static getTitle(fileUri: vscode.Uri): string {
    const fileOrDirName = fileUri.path.split('/').pop()!;
    return `OpenJscad (${fileOrDirName})`;
  }

	public static createOrShow(extensionUri: vscode.Uri, fileUri: vscode.Uri) {
		const column = vscode.ViewColumn.Beside;

		// If we already have a panel, show it.
		if (OpenJscadPanel.currentPanel) {
      OpenJscadPanel.currentPanel._setUri(fileUri);
			OpenJscadPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			OpenJscadPanel.viewType,
			OpenJscadPanel.getTitle(fileUri),
			column,
			{
        enableScripts: true,
        retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			}
		);

		OpenJscadPanel.currentPanel = new OpenJscadPanel(panel, extensionUri, fileUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fileUri: vscode.Uri) {
		OpenJscadPanel.currentPanel = new OpenJscadPanel(panel, extensionUri, fileUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fileUri: vscode.Uri) {
		this._panel = panel;
    this._extensionUri = extensionUri;
    this._fileUri = fileUri;
    this._dataWatcher = new DataWatcher();

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'ready':
						this._dataWatcher.watch(this._fileUri, (data) => this.setData(data));
						return;
				}
			},
			null,
			this._disposables
		);
  }

	public setData(data: OpenJscadDir[]) {
		// set source data in OpenJscad viewer
		this._panel.webview.postMessage({ command: 'setData', data });
	}

	public dispose() {
		OpenJscadPanel.currentPanel = undefined;

		// Clean up our resources
    this._panel.dispose();
    this._dataWatcher.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
  }

  private _setUri(uri: vscode.Uri) {
    if (this._fileUri.path === uri.path) {
      return;
    }
    this._fileUri = uri;
    this._panel.title = OpenJscadPanel.getTitle(this._fileUri);
    if (this._dataWatcher) {
      this._dataWatcher.watch(this._fileUri, (data) => this.setData(data));
    }
  }

	private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
    const viewerScript = vscode.Uri.joinPath(this._extensionUri, 'media', 'openjscad-web-sdk.js');
		const mainScript = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

    // And the uri we use to load this script in the webview
		const viewerUri = webview.asWebviewUri(viewerScript);
    const scriptUri = webview.asWebviewUri(mainScript);
    const title = OpenJscadPanel.getTitle(this._fileUri);

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${title}</title>
				<style>
					.container {
						width: 100%;
						height: 100%;
						position: absolute;
						top: 0px;
						left: 0px;
						right: 0px;
						bottom: 0px;
					}
				</style>
			</head>
			<body>
				<div class="container"></div>
				<script src="${viewerUri}"></script>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

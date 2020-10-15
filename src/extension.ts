// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let panel: vscode.WebviewPanel;

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('openjscad.showPreviewToSide', (params) => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Preview in slid');
		panel = vscode.window.createWebviewPanel(
			'openjscad', 'OpenJscad Preview',
			vscode.ViewColumn.Beside,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
			}
		  );

		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'ready':
						console.log('ready')
						reloadFiles(params.fsPath);
						const d = listenChanges(params.fsPath);
						context.subscriptions.push(...d);
						return;
				}
			},
			null,
			context.subscriptions,
		);
		  
		const viewerScript = vscode.Uri.joinPath(context.extensionUri, 'media', 'viewer.js');
		const scriptPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js');
		// And the uri we use to load this script in the webview
		const viewerUri = panel.webview.asWebviewUri(viewerScript);
		const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
		panel.webview.html = createHtml(viewerUri, scriptUri);
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}


function createHtml(viewerUri: vscode.Uri, scriptUri: vscode.Uri) {
	return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">	
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>OpenJscad Preview</title>
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

function listenChanges(path: string) {
	console.log('watch', `${path}/**/.js`);
	const watcher = vscode.workspace.createFileSystemWatcher(`${path}/**/*.js`);

	const d1 = watcher.onDidChange(() => {
		reloadFiles(path);
	});
	const d2 = watcher.onDidCreate(() => {
		reloadFiles(path);
	});
	return [d1, d2];
}

async function reloadFiles(path: string) {	
	const files = [];
	let directories = [path];
	while (directories.length > 0) {
		const nextDirectories = [];
		for (let dir of directories) {
			const currentPath = dir;
			const uri = vscode.Uri.file(dir);
			const fileAndDirectories = await vscode.workspace.fs.readDirectory(uri);
			for (let fileOrDirectorie of fileAndDirectories) {
				const [name, type] = fileOrDirectorie;
				if (type === vscode.FileType.Directory) {
					nextDirectories.push(currentPath + '/' + name);
				} else if (type === vscode.FileType.File) {
					const fullPath = currentPath + '/' + name;
					const source = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
					files.push({ name: fullPath.replace(path + '/', ''), source: source.toString() });
				}
			}
		}
		directories = nextDirectories;
	}

	const structure = createStructuredSource(files);
	console.log('files', files);
	console.log('structure', structure);
	panel.webview.postMessage({ command: 'update', source: structure});
}

function createStructuredSource(files: { name: string, source: string }[]) {
	if (!files) {
	  return;
	}
  
	const structure = [{
	  fullPath: '/root',
	  name: 'root',
	  children: [],
	}];
  
	files.forEach(f => {
	  const { name, source } = f;
	  const slices = ['/root', ...name.split('/')];
	  let mountPoint = structure;
	  let fullPath = '';
	  slices.forEach((s) => {
		fullPath = [fullPath, s].filter(p => !!p).join('/');
		let nextMountPoint: any = mountPoint.find(p => p.fullPath === fullPath);
		if (!nextMountPoint) {
		  nextMountPoint = { fullPath, name: s };
		  mountPoint.push(nextMountPoint);
		}
		if (/\.js$/.test(s)) {
		  Object.assign(nextMountPoint, { ext: 'js', source });
		  // the loop should end here;
		} else {
		  if (!nextMountPoint.children) {
			nextMountPoint.children = [];
		  }
		  mountPoint = nextMountPoint.children;
		}
	  });
	});
  
	return structure;
  };
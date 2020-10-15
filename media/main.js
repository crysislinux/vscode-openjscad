// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const viewer = new OpenJscad.OpenJscadViewer();
  viewer.attachTo(document.querySelector('.container'));
  vscode.postMessage({
    command: 'ready',
  });

  // Handle messages sent from the extension to the webview
  window.addEventListener('message', event => {
    const message = event.data; // The json data that the extension sent
    switch (message.command) {
      case 'update':
        viewer.update(message.source);
        break;
    }
  });
}());

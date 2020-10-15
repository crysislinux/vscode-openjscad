# Vscode OpenJscad

This is an extension to integrate OpenJscad with Vscode. It's mainly used for preview. 

## Features

1. Preview a single .js/.jscad file (could not has any external dependencies)
2. Preview a directory (should be a valid jscad project)
3. Watch file changes and update the preview automatically

## Demo

![demo](demo.gif)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

This is for OpenJscad v2, so you our design should use v2 syntax.

## Known Issues

1. Vscode recyles the webview when it goes to background(not visible) for better performance, so when the preview panel is visible again, the preview is reloaded. State is not persisted ATM, so states such as camera will be reset.

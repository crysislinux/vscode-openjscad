import * as vscode from 'vscode';
import { OpenJscadDir } from './types';

export class DataWatcher {
  private _disposables: vscode.Disposable[] = [];
  private _watcher: vscode.FileSystemWatcher | undefined;
  private _uri: vscode.Uri | undefined;
  private _fileType: vscode.FileType.File | vscode.FileType.Directory | undefined;
  private _pending = false;

  public async watch(uri: vscode.Uri, cb: (data: OpenJscadDir[]) => void, options: { emitInitial: boolean } = { emitInitial: true }) {
    if (this._pending) {
      vscode.window.showWarningMessage('Data watcher is busy, please try again later');
      return;
    }

    this._pending = true;
    this.dispose();
    const stat = await vscode.workspace.fs.stat(uri);
    let glob: vscode.GlobPattern;
    if ((stat.type & vscode.FileType.File) === vscode.FileType.File) {
      glob = uri.path;
      this._fileType = vscode.FileType.File;
    } else if ((stat.type & vscode.FileType.Directory) === vscode.FileType.Directory) {
      glob = `${uri.path}/**/*.js`;
      this._fileType = vscode.FileType.Directory;
    } else {
      vscode.window.showErrorMessage(`Unknown file type: ${uri.fsPath}`);
      this._pending = false;
      return;
    }
    this._uri = uri;
    const watcher = vscode.workspace.createFileSystemWatcher(glob!);
    const emitData = async () => {
      const data = await this.scanFilesAndCreateData();
      if (data) {
        cb(data);
      }
    };
    const d1 = watcher.onDidChange(emitData);
    const d2 = watcher.onDidCreate(emitData);

    this._watcher = watcher;
    this._disposables = [d1, d2];

    if (options.emitInitial) {
      emitData();
    }
    this._pending = false;
  }

  private async scanFilesAndCreateData() {
    if (!this._uri) {
      return;
    }
    const uri = this._uri;

    if (this._fileType === vscode.FileType.File) {
      const source = await vscode.workspace.fs.readFile(uri);
      const files = [{ name: 'index.js', source: source.toString() }];
      return createStructuredSource(files);
    }

    const files = [];
    let directories = [uri];
    while (directories.length > 0) {
      const nextDirectories = [];
      for (let dir of directories) {
        const fileAndDirectories = await vscode.workspace.fs.readDirectory(dir);
        for (let fileOrDirectorie of fileAndDirectories) {
          const [name, type] = fileOrDirectorie;
          if (type === vscode.FileType.Directory) {
            nextDirectories.push(vscode.Uri.joinPath(dir, name));
          } else if (type === vscode.FileType.File) {
            const fullPath = dir.path + '/' + name;
            const source = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, name));
            files.push({ name: fullPath.replace(uri.path + '/', ''), source: source.toString() });
          }
        }
      }
      directories = nextDirectories;
    }

    return createStructuredSource(files);
  }

  public dispose() {
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
    }
    if (this._watcher) {
      this._watcher.dispose();
      this._watcher = undefined;
    }
    this._uri = undefined;
    this._fileType = undefined;
	}
}

function createStructuredSource(files: { name: string, source: string }[]): OpenJscadDir[] {
	if (!files) {
	  return [];
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

export interface OpenJscadFile {
  ext: string;
  fullPath: string;
  name: string;
  source: string;
}

export interface OpenJscadDir {
  fullPath: string;
  name: string;
  children: (OpenJscadFile | OpenJscadDir)[];
}

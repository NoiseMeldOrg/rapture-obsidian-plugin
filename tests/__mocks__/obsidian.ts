/**
 * Mock for Obsidian API
 * Provides test doubles for Obsidian types and functions
 */

export class Notice {
  message: string;
  constructor(message: string) {
    this.message = message;
  }
}

export class Plugin {
  app: App;
  manifest: { id: string };

  async loadData(): Promise<any> {
    return {};
  }

  async saveData(data: any): Promise<void> {}

  addSettingTab(tab: PluginSettingTab): void {}

  registerObsidianProtocolHandler(
    action: string,
    handler: (params: ObsidianProtocolData) => void
  ): void {}

  addCommand(command: {
    id: string;
    name: string;
    callback: () => void;
  }): void {}

  registerInterval(id: number): void {}
}

export class PluginSettingTab {
  app: App;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.containerEl = document.createElement('div');
  }

  display(): void {}
  hide(): void {}
}

export interface ObsidianProtocolData {
  [key: string]: string;
}

export class App {
  vault: Vault;
  workspace: Workspace;

  constructor() {
    this.vault = new Vault();
    this.workspace = new Workspace();
  }
}

export class Vault {
  private files: Map<string, TFile> = new Map();
  private folders: Map<string, TFolder> = new Map();

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    return this.files.get(path) || this.folders.get(path) || null;
  }

  async create(path: string, content: string): Promise<TFile> {
    const file = new TFile(path);
    this.files.set(path, file);
    return file;
  }

  async createFolder(path: string): Promise<void> {
    const folder = new TFolder(path);
    this.folders.set(path, folder);
  }

  // Test helper methods
  _setFile(path: string, file: TFile): void {
    this.files.set(path, file);
  }

  _setFolder(path: string, folder: TFolder): void {
    this.folders.set(path, folder);
  }

  _clear(): void {
    this.files.clear();
    this.folders.clear();
  }
}

export class Workspace {
  private layoutReadyCallbacks: (() => void)[] = [];

  onLayoutReady(callback: () => void): void {
    this.layoutReadyCallbacks.push(callback);
  }

  // Test helper to trigger layout ready
  _triggerLayoutReady(): void {
    this.layoutReadyCallbacks.forEach(cb => cb());
  }
}

export class TFile {
  path: string;
  name: string;
  extension: string;

  constructor(path: string) {
    this.path = path;
    const parts = path.split('/');
    this.name = parts[parts.length - 1];
    const extParts = this.name.split('.');
    this.extension = extParts.length > 1 ? extParts[extParts.length - 1] : '';
  }
}

export class TFolder {
  path: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    const parts = path.split('/');
    this.name = parts[parts.length - 1];
  }
}

export class Setting {
  private el: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.el = document.createElement('div');
    containerEl.appendChild(this.el);
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addButton(cb: (button: ButtonComponent) => void): this {
    cb(new ButtonComponent(this.el));
    return this;
  }

  addText(cb: (text: TextComponent) => void): this {
    cb(new TextComponent(this.el));
    return this;
  }

  addToggle(cb: (toggle: ToggleComponent) => void): this {
    cb(new ToggleComponent(this.el));
    return this;
  }

  addDropdown(cb: (dropdown: DropdownComponent) => void): this {
    cb(new DropdownComponent(this.el));
    return this;
  }
}

export class ButtonComponent {
  private el: HTMLElement;
  private text: string = '';
  private disabled: boolean = false;

  constructor(containerEl: HTMLElement) {
    this.el = document.createElement('button');
    containerEl.appendChild(this.el);
  }

  setButtonText(text: string): this {
    this.text = text;
    return this;
  }

  setCta(): this {
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    return this;
  }

  onClick(callback: () => void): this {
    this.el.addEventListener('click', callback);
    return this;
  }
}

export class TextComponent {
  private el: HTMLElement;
  private value: string = '';

  constructor(containerEl: HTMLElement) {
    this.el = document.createElement('input');
    containerEl.appendChild(this.el);
  }

  setPlaceholder(placeholder: string): this {
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  getValue(): string {
    return this.value;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

export class ToggleComponent {
  private el: HTMLElement;
  private value: boolean = false;

  constructor(containerEl: HTMLElement) {
    this.el = document.createElement('div');
    containerEl.appendChild(this.el);
  }

  setValue(value: boolean): this {
    this.value = value;
    return this;
  }

  getValue(): boolean {
    return this.value;
  }

  onChange(callback: (value: boolean) => void): this {
    return this;
  }
}

export class DropdownComponent {
  private el: HTMLElement;
  private value: string = '';

  constructor(containerEl: HTMLElement) {
    this.el = document.createElement('select');
    containerEl.appendChild(this.el);
  }

  addOption(value: string, display: string): this {
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  getValue(): string {
    return this.value;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

// HTTP request mock
export interface RequestUrlResponse {
  status: number;
  json: any;
  text: string;
}

export interface RequestUrlParam {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

// This will be mocked in tests
export async function requestUrl(param: RequestUrlParam): Promise<RequestUrlResponse> {
  throw new Error('requestUrl must be mocked in tests');
}

export function normalizePath(path: string): string {
  // Simple path normalization
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

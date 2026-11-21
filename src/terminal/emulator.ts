import serializeAddon from "@xterm/addon-serialize";
import unicode11Addon from "@xterm/addon-unicode11";
import xtermHeadless from "@xterm/headless";

const { Terminal } = xtermHeadless;
const { SerializeAddon } = serializeAddon;
const { Unicode11Addon } = unicode11Addon;

export type XtermTerminal = InstanceType<typeof Terminal>;

export class Emulator {
  readonly term: XtermTerminal;
  private readonly serializer: InstanceType<typeof SerializeAddon>;
  private hidden = false;
  private sgr = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(cols: number, rows: number, scrollback: number) {
    this.term = new Terminal({ cols, rows, scrollback, allowProposedApi: true });
    this.serializer = new SerializeAddon();
    this.term.loadAddon(this.serializer);
    this.term.loadAddon(new Unicode11Addon());
    this.term.unicode.activeVersion = "11";
    const track = (on: boolean) => (params: (number | number[])[]) => {
      if (params.includes(25)) this.hidden = !on;
      if (params.includes(1006)) this.sgr = on;
      return false;
    };
    this.term.parser.registerCsiHandler({ prefix: "?", final: "h" }, track(true));
    this.term.parser.registerCsiHandler({ prefix: "?", final: "l" }, track(false));
    this.term.parser.registerEscHandler({ final: "c" }, () => {
      this.hidden = false;
      this.sgr = false;
      return false;
    });
  }

  write(data: string): Promise<void> {
    this.queue = this.queue.then(
      () => new Promise<void>((resolve) => this.term.write(data, () => resolve())),
    );
    return this.queue;
  }

  drained(): Promise<void> {
    return this.queue;
  }

  resize(cols: number, rows: number): void {
    this.term.resize(cols, rows);
  }

  get cols(): number {
    return this.term.cols;
  }

  get rows(): number {
    return this.term.rows;
  }

  get cursorVisible(): boolean {
    return !this.hidden;
  }

  get altScreen(): boolean {
    return this.term.buffer.active.type === "alternate";
  }

  get applicationCursorKeys(): boolean {
    return this.term.modes.applicationCursorKeysMode;
  }

  get mouseModes(): { tracking: boolean; sgr: boolean } {
    return { tracking: this.term.modes.mouseTrackingMode !== "none", sgr: this.sgr };
  }

  get bracketedPaste(): boolean {
    return this.term.modes.bracketedPasteMode;
  }

  serialize(): string {
    return this.serializer.serialize();
  }

  dispose(): void {
    this.term.dispose();
  }
}

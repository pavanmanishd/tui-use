import serializeAddon from "@xterm/addon-serialize";
import xtermHeadless from "@xterm/headless";

const { Terminal } = xtermHeadless;
const { SerializeAddon } = serializeAddon;

export type XtermTerminal = InstanceType<typeof Terminal>;

export class Emulator {
  readonly term: XtermTerminal;
  private readonly serializer: InstanceType<typeof SerializeAddon>;
  private hidden = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(cols: number, rows: number, scrollback: number) {
    this.term = new Terminal({ cols, rows, scrollback, allowProposedApi: true });
    this.serializer = new SerializeAddon();
    this.term.loadAddon(this.serializer);
    const track = (visible: boolean) => (params: (number | number[])[]) => {
      if (params.includes(25)) this.hidden = !visible;
      return false;
    };
    this.term.parser.registerCsiHandler({ prefix: "?", final: "h" }, track(true));
    this.term.parser.registerCsiHandler({ prefix: "?", final: "l" }, track(false));
    this.term.parser.registerEscHandler({ final: "c" }, () => {
      this.hidden = false;
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

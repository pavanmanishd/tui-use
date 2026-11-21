import { copyFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { must } from "./docker.js";

export const IMAGES = { shell: "tui-bench-base", "tui-use": "tui-bench-tui-use" } as const;

export async function buildImages(root: string): Promise<void> {
  const images = join(root, "bench", "images");
  console.log("building tui-bench-base");
  await must(["docker", "build", "-t", IMAGES.shell, join(images, "base")]);
  const tarball = readdirSync(root).find((f) => /^pavanmanishd-tui-use-.*\.tgz$/.test(f));
  if (!tarball) throw new Error("run npm pack in the repository root first");
  const target = join(images, "with-tui-use", "tui-use.tgz");
  copyFileSync(join(root, tarball), target);
  try {
    console.log("building tui-bench-tui-use");
    await must(["docker", "build", "-t", IMAGES["tui-use"], join(images, "with-tui-use")]);
  } finally {
    rmSync(target, { force: true });
  }
}

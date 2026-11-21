import { copyFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { must } from "./docker.js";

export const IMAGES = { shell: "tui-bench-base", "tui-use": "tui-bench-tui-use" } as const;

export async function buildImages(root: string): Promise<void> {
  const images = join(root, "bench", "images");
  console.log("building tui-bench-base");
  await must(["docker", "build", "-t", IMAGES.shell, join(images, "base")]);
  const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const tarball = `pavanmanishd-tui-use-${version}.tgz`;
  if (!existsSync(join(root, tarball)))
    throw new Error(`run npm pack in the repository root first (${tarball} not found)`);
  const target = join(images, "with-tui-use", "tui-use.tgz");
  copyFileSync(join(root, tarball), target);
  try {
    console.log("building tui-bench-tui-use");
    await must(["docker", "build", "-t", IMAGES["tui-use"], join(images, "with-tui-use")]);
  } finally {
    rmSync(target, { force: true });
  }
}

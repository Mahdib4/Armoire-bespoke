// Transcodes the raw .mov section videos into web-optimized, cross-browser MP4
// (H.264, faststart, muted) plus a poster JPG, using the bundled ffmpeg-static
// binary. Existing .mp4 (hero, mid) are copied by organize-media.mjs.
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(__dirname, "..", "..");
const OUT = path.resolve(__dirname, "..", "public", "media", "videos");
const POSTERS = path.join(OUT, "posters");

const JOBS = [
  ["VIDEO/Blazer.mov", "blazer"],
  ["VIDEO/jacket.mov", "jacket"],
  ["VIDEO/shirt n tie.mov", "shirt"],
  ["VIDEO/mix small.mov", "mix"],
];

const exists = (p) => fs.access(p).then(() => true).catch(() => false);

function run(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "ignore"] });
    ff.on("error", reject);
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("ffmpeg exit " + code))
    );
  });
}

async function main() {
  await fs.mkdir(POSTERS, { recursive: true });
  const force = process.env.FORCE === "1";
  for (const [src, name] of JOBS) {
    const input = path.join(RAW, src);
    if (!(await exists(input))) {
      console.warn("skip (missing):", src);
      continue;
    }
    const mp4 = path.join(OUT, `${name}.mp4`);
    const poster = path.join(POSTERS, `${name}.jpg`);

    if (!force && (await exists(mp4))) {
      console.log("exists, skipping:", name + ".mp4");
    } else {
      console.log("transcoding:", src, "->", name + ".mp4");
      await run([
        "-y", "-i", input,
        "-vf", "scale=-2:1080",
        "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-crf", "26", "-preset", "veryfast",
        "-movflags", "+faststart",
        "-an",
        mp4,
      ]);
    }
    if (force || !(await exists(poster))) {
      await run(["-y", "-ss", "1", "-i", input, "-frames:v", "1", "-q:v", "3", poster]);
    }
  }
  console.log("Video transcode complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const execa = require("execa");
const Konva = require("./konvaNode");
const { videoWidth, videoHeight } = require("./consts");

const frameLength = 6;
const overlayPattern = `frame-%0${frameLength}d.png`;

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function clearOverlayFrames(dir) {
  const entries = await fs.promises.readdir(dir).catch(() => []);
  const deletions = entries
    .filter((file) => file.startsWith("frame-") && file.endsWith(".png"))
    .map((file) => fs.promises.unlink(path.join(dir, file)));
  await Promise.all(deletions);
}

async function getVideoDurationSeconds(videoPath) {
  const { stdout } = await execa("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ]);
  const parsed = parseFloat(stdout);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  throw new Error(`Unable to determine video duration for ${videoPath}`);
}

function loadKonvaImage(url) {
  return new Promise((res) => {
    Konva.Image.fromURL(url, res);
  });
}

function loadImageAsset(fileName) {
  return loadKonvaImage(path.join(__dirname, "../assets", fileName));
}

function makeAnimation(callback, { startFrame, duration }) {
  return (frame) => {
    const thisFrame = frame - startFrame;
    if (thisFrame > 0 && thisFrame <= duration) {
      callback(thisFrame / duration);
    }
  };
}

function combineAnimations(...animations) {
  return (frame) => {
    for (const animation of animations) {
      if (animation) {
        animation(frame);
      }
    }
  };
}

async function saveFrame({ stage, outputDir, frame }) {
  const data = stage.toDataURL();

  // remove the data header
  const base64Data = data.substring("data:image/png;base64,".length);

  const fileName = path.join(
    outputDir,
    overlayPattern.replace(
      `%0${frameLength}d`,
      String(frame + 1).padStart(frameLength, "0")
    )
  );

  await fs.promises.writeFile(fileName, base64Data, "base64");
}

async function createVideo({ fps, overlayDir, backgroundVideo, output }) {
  await execa(
    "ffmpeg",
    [
      "-y",
      "-i",
      backgroundVideo,
      "-framerate",
      String(fps),
      "-i",
      overlayPattern,
      "-filter_complex",
      `[0:v]scale=${videoWidth}:${videoHeight}:force_original_aspect_ratio=increase,crop=${videoWidth}:${videoHeight},setsar=1[v0];[v0][1:v]overlay=0:0`,
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      output,
    ],
    { cwd: overlayDir }
  );
}

module.exports = {
  saveFrame,
  createVideo,
  loadKonvaImage,
  loadImageAsset,
  makeAnimation,
  combineAnimations,
  ensureDir,
  clearOverlayFrames,
  getVideoDurationSeconds,
  overlayPattern,
};

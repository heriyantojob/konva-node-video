const path = require("path");
const Konva = require("./konvaNode");

const { videoWidth, videoHeight, videoFps } = require("./consts");
const {
  saveFrame,
  createVideo,
  loadImageAsset,
  makeAnimation,
  combineAnimations,
  ensureDir,
  clearOverlayFrames,
  getVideoDurationSeconds,
} = require("./video.utils");

function renderBackground(layer) {
  // Background is provided by the source video; keep function for API symmetry.
  return null;
}

function renderText(layer) {
  const hello = new Konva.Text({
    align: "center",
    x: -videoWidth,
    width: videoWidth,
    y: 150,
    fontSize: 200,
    fontStyle: "bold",
    fill: "#1E3740",
    text: "Hello",
  });
  const from = new Konva.Text({
    align: "center",
    x: videoWidth,
    width: videoWidth,
    y: 350,
    fontSize: 150,
    fill: "#1E3740",
    text: "from",
  });
  const konva = new Konva.Text({
    align: "center",
    x: 0,
    width: videoWidth,
    y: 500,
    fontSize: 300,
    fontStyle: "bold",
    fill: "#129A74",
    text: "Konva",
    opacity: 0,
  });

  layer.add(hello, from, konva);

  return combineAnimations(
    makeAnimation((d) => hello.x((d - 1) * videoWidth), {
      startFrame: 0,
      duration: 2 * videoFps,
    }),
    makeAnimation((d) => from.x((1 - d) * videoWidth), {
      startFrame: 1 * videoFps,
      duration: 2 * videoFps,
    }),
    makeAnimation((d) => konva.opacity(d), {
      startFrame: 2.5 * videoFps,
      duration: 1 * videoFps,
    })
  );
}

async function renderLogo(layer) {
  const image = await loadImageAsset("leanylabs.png");
  const aspect = image.width() / image.height();
  image.width(aspect * 100);
  image.height(100);
  image.y(videoHeight - 100 - 50);
  image.x(videoWidth - image.width() - 75);
  image.cache();
  image.opacity(0);

  layer.add(image);

  return makeAnimation((d) => image.opacity(d), {
    startFrame: 3 * videoFps,
    duration: 1 * videoFps,
  });
}

async function renderVideo({ outputDir, output }) {
  const backgroundVideo = path.join(__dirname, "../assets/video.mp4");

  const stage = new Konva.Stage({
    width: videoWidth,
    height: videoHeight,
  });
  const start = Date.now();
  await ensureDir(outputDir);
  await clearOverlayFrames(outputDir);

  let frames = 5 * videoFps;
  try {
    const durationSec = await getVideoDurationSeconds(backgroundVideo);
    frames = Math.max(1, Math.ceil(durationSec * videoFps));
  } catch (err) {
    console.warn("Falling back to default frame count:", err.message);
  }
  try {
    const layer = new Konva.Layer();
    stage.add(layer);

    const animate = combineAnimations(
      renderBackground(layer),
      renderText(layer),
      await renderLogo(layer)
    );

    console.log("generating frames...");
    for (let frame = 0; frame < frames; ++frame) {
      animate(frame);

      layer.draw();

      await saveFrame({ stage, outputDir, frame });

      if ((frame + 1) % videoFps === 0) {
        console.log(`rendered ${(frame + 1) / videoFps} second(s)`);
      }
    }
  } finally {
    stage.destroy();
  }

  console.log("creating video");
  await createVideo({
    fps: videoFps,
    overlayDir: outputDir,
    backgroundVideo,
    output,
  });
  const time = Date.now() - start;
  console.log(`done in ${time} ms. ${(frames * 1000) / (time || 0.01)} FPS`);
}

module.exports = {
  renderVideo,
};

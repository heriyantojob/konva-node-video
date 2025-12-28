const Konva = require("konva");
const { createCanvas, Image } = require("canvas");

// Provide the minimal DOM shims Konva expects when running in Node.
Konva.window = Konva.window || {
  Image,
  devicePixelRatio: 1,
};
Konva.document = Konva.document || {
  createElement: () => {},
  documentElement: {
    addEventListener: () => {},
  },
};

// Ensure animations work without a browser.
global.requestAnimationFrame =
  global.requestAnimationFrame || ((cb) => setImmediate(cb));

// Tell Konva how to create canvas and image elements on the server.
Konva.Util.createCanvasElement = () => {
  const node = createCanvas(0, 0);
  node.style = {};
  return node;
};
Konva.Util.createImageElement = () => {
  const node = new Image();
  node.style = {};
  return node;
};

// No visibility checks in a headless environment.
Konva.Stage.prototype._checkVisibility = () => {};

module.exports = Konva;

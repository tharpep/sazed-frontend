import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const destDir = path.join(root, "public", "vad");

fs.mkdirSync(destDir, { recursive: true });

const filesToCopy = [
  {
    from: path.join(root, "node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx"),
    to: path.join(destDir, "silero_vad_legacy.onnx"),
  },
  {
    from: path.join(root, "node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx"),
    to: path.join(destDir, "silero_vad_v5.onnx"),
  },
  {
    from: path.join(root, "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js"),
    to: path.join(destDir, "vad.worklet.bundle.min.js"),
  },
  {
    from: path.join(root, "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"),
    to: path.join(destDir, "ort-wasm-simd-threaded.wasm"),
  },
  {
    from: path.join(root, "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs"),
    to: path.join(destDir, "ort-wasm-simd-threaded.mjs"),
  },
];

for (const { from, to } of filesToCopy) {
  if (fs.existsSync(from)) {
    if (!fs.existsSync(to) || fs.statSync(from).size !== fs.statSync(to).size) {
      fs.copyFileSync(from, to);
    }
  }
}

const { fromPath } = require("pdf2image");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const sharp = require("sharp");
const fs = require("fs");

const extractText = async (filePath, mimeType) => {
  try {
    if (!fs.existsSync(filePath)) throw new Error("File not found");

    if (mimeType === "application/pdf") {
      const pdfBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(pdfBuffer);

      if (data.text.trim()) return data.text.trim();

      // Convert all pages of PDF to images
      const images = await fromPath(filePath, {
        density: 300, // High resolution for better OCR
        format: "png",
        outdir: "./pdf_pages",
      }).bulk();

      let fullText = "";
      for (const img of images) {
        const text = await processImage(img.path);
        fullText += text + "\n\n";
      }

      return fullText.trim();
    } else {
      return await processImage(filePath);
    }
  } catch (error) {
    console.error("Text extraction error:", error.message);
    throw new Error("Failed to extract text from document.");
  }
};

// Helper function for OCR processing with Gaussian blur
const processImage = async (imagePath) => {
  try {
    let image = sharp(imagePath)
      .greyscale()
      .sharpen()
      .normalize()
      .resize(1500, 1500, { fit: "inside" })
      .toFormat("png");

    const processedBuffer = await image.toBuffer();
    const blurredBuffer = applyGaussianBlur(processedBuffer);

    // Perform OCR on processed image
    const { data: ocrData } = await Tesseract.recognize(blurredBuffer, "eng", {
      psm: 6,
    });

    return ocrData.text.trim() || "No text detected.";
  } catch (error) {
    console.error("Image OCR error:", error.message);
    return "";
  }
};

// Apply Gaussian Blur to enhance OCR accuracy
const applyGaussianBlur = (imageBuffer) => {
  let pixels = new Uint8ClampedArray(imageBuffer);
  let canvas = { width: 1500, height: 1500 };
  blurARGB(pixels, canvas, 2); // Apply slight blur with radius 2
  return pixels;
};

// Gaussian blur functions
let blurRadius;
let blurKernelSize;
let blurKernel;
let blurMult;

function buildBlurKernel(r) {
  let radius = (r * 3.5) | 0;
  radius = radius < 1 ? 1 : radius < 248 ? radius : 248;

  if (blurRadius !== radius) {
    blurRadius = radius;
    blurKernelSize = (1 + blurRadius) << 1;
    blurKernel = new Int32Array(blurKernelSize);
    blurMult = new Array(blurKernelSize);
    for (let l = 0; l < blurKernelSize; l++) {
      blurMult[l] = new Int32Array(256);
    }

    for (let i = 1, radiusi = radius - 1; i < radius; i++) {
      blurKernel[radius + i] = blurKernel[radiusi] = radiusi * radiusi;
      let bm = blurMult[radius + i];
      let bmi = blurMult[radiusi--];
      for (let j = 0; j < 256; j++) {
        bm[j] = bmi[j] = blurKernel[radius + i] * j;
      }
    }
  }
}

function blurARGB(pixels, canvas, radius) {
  const width = canvas.width;
  const height = canvas.height;
  const numPixels = width * height;
  const argb = new Int32Array(numPixels);
  for (let j = 0; j < numPixels; j++) {
    argb[j] = pixels[j];
  }
  let a2 = new Int32Array(numPixels);
  let r2 = new Int32Array(numPixels);
  let g2 = new Int32Array(numPixels);
  let b2 = new Int32Array(numPixels);
  let yi = 0;
  buildBlurKernel(radius);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, ca = 0, cr = 0, cg = 0, cb = 0;
      let read = x - blurRadius;
      let bk0 = read < 0 ? -read : 0;
      read = read < 0 ? 0 : read;
      for (let i = bk0; i < blurKernelSize; i++) {
        if (read >= width) break;
        const c = argb[read + yi];
        let bm = blurMult[i];
        ca += bm[(c & -16777216) >>> 24];
        cr += bm[(c & 16711680) >> 16];
        cg += bm[(c & 65280) >> 8];
        cb += bm[c & 255];
        sum += blurKernel[i];
        read++;
      }
      let ri = yi + x;
      a2[ri] = ca / sum;
      r2[ri] = cr / sum;
      g2[ri] = cg / sum;
      b2[ri] = cb / sum;
    }
    yi += width;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, ca = 0, cr = 0, cg = 0, cb = 0;
      let read = x;
      for (let i = 0; i < blurKernelSize; i++) {
        if (read >= height) break;
        let bm = blurMult[i];
        ca += bm[a2[read]];
        cr += bm[r2[read]];
        cg += bm[g2[read]];
        cb += bm[b2[read]];
        sum += blurKernel[i];
        read += width;
      }
      argb[x + y * width] = ((ca / sum) << 24) | ((cr / sum) << 16) | ((cg / sum) << 8) | (cb / sum);
    }
  }
  for (let j = 0; j < numPixels; j++) {
    pixels[j] = argb[j];
  }
}

module.exports = { extractText };

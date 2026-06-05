// Try to coax a real/!software GL context, and ALSO test: does an SVG upload
// as a WebGL texture produce non-black pixels? This isolates the SVG-texture risk
// independent of the hardware question.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto("http://localhost:3000/showcase", { waitUntil: "load" });

// Direct experiment: load /showcase/hero.svg into an <img>, upload to a GL texture,
// render a fullscreen quad, read back center pixel. If black/transparent => SVG
// texture upload is the failure mode.
const res = await page.evaluate(async () => {
  function tryUpload(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = 256; cv.height = 256;
        const gl = cv.getContext("webgl");
        if (!gl) return resolve({ src, err: "no-gl" });
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        let uploadErr = null;
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        } catch (e) { uploadErr = String(e.message); }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // minimal shader to draw it
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, "attribute vec2 p;varying vec2 u;void main(){u=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}");
        gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, "precision mediump float;varying vec2 u;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,u);}");
        gl.compileShader(fs);
        const pr = gl.createProgram();
        gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(pr, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const px = new Uint8Array(4);
        gl.readPixels(128, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        resolve({ src, natural: [img.naturalWidth, img.naturalHeight], center: Array.from(px), uploadErr, glErr: gl.getError() });
      };
      img.onerror = () => resolve({ src, err: "img-load-failed" });
      img.src = src;
    });
  }
  const svg = await tryUpload("/showcase/hero.svg");
  return { svg };
});
console.log(JSON.stringify(res, null, 2));
await browser.close();

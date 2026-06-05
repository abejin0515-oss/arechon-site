/**
 * Shared "Cinematic Dark" grade applied inside every /motion fragment shader,
 * AFTER the photo is sampled. This is the craft step that kills the raw-<img>
 * look: a subtle cool-shadow / warm-highlight grade, a radial vignette, and
 * animated film grain. All three treatments share it so the comparison isolates
 * the MOTION, not the look.
 *
 * Usage in a fragment shader:
 *   #include is not available in raw three shaders, so we string-concat:
 *     fragmentShader: `... ${GRADE_GLSL} void main(){ ... col = grade(col, vUv, uTime, uVignette); }`
 *
 * Keep it cheap: a few mults + one hash. ~0.1ms of the frame budget.
 */
export const GRADE_GLSL = /* glsl */ `
  // Cheap hash-based grain (no texture fetch).
  float gradeHash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  // vigStrength: 0..1 scales how dark the vignette pulls the edges. Dark
  // subjects (e.g. a flower on black) pass a low value so they don't crush;
  // bright/abstract subjects pass ~1 for full cinematic falloff.
  vec3 grade(vec3 col, vec2 uv, float t, float vigStrength) {
    // --- Tonal grade: lift+gamma toward a cool shadow / warm highlight ---
    // Lift shadows slightly cool, roll highlights slightly warm. Subtle.
    vec3 shadowTint = vec3(0.94, 0.97, 1.04);   // cool
    vec3 highTint   = vec3(1.05, 1.0, 0.95);    // warm
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 tint = mix(shadowTint, highTint, smoothstep(0.25, 0.85, lum));
    col *= tint;

    // Gentle contrast curve (S-curve around 0.5) to add depth to a flat photo.
    col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);

    // Slight desaturation so it reads "graded", not "raw camera".
    float g = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(g), col, 0.86);

    // --- Vignette: pull the eye to the subject, darken the edges (dark aesthetic) ---
    vec2 vc = uv - 0.5;
    float vig = smoothstep(0.95, 0.25, length(vc) * 1.25);
    // floor rises toward 1.0 as vigStrength drops → near-no darkening for dark subjects
    float vigFloor = mix(1.0, 0.62, clamp(vigStrength, 0.0, 1.0));
    col *= mix(vigFloor, 1.0, vig);

    // --- Film grain: animated, luminance-aware (stronger in shadows) ---
    float grain = gradeHash(uv * vec2(1920.0, 1080.0) + fract(t) * 100.0) - 0.5;
    col += grain * 0.035 * (1.2 - lum);

    return col;
  }
`;

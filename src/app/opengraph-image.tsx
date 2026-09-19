import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/lib/site";

export const alt = "Arechon — Claude Code で作ったポートフォリオ / 仙台";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1F2433",
          color: "#FAF8F2",
          fontFamily: "serif",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 96px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 700,
            height: 700,
            background:
              "radial-gradient(circle at 70% 30%, rgba(232, 110, 47, 0.22), transparent 60%)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(250, 248, 242, 0.62)",
          }}
        >
          <div>ARECHON</div>
          <div>SENDAI · JP</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 144,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>作ったのは、</span>
            <span>指示の設計。</span>
          </div>
          <div
            style={{
              fontFamily: "sans-serif",
              fontSize: 30,
              color: "rgba(250, 248, 242, 0.78)",
              maxWidth: 880,
            }}
          >
            Claude Code に指示を出して個人で作ったポートフォリオ。
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "monospace",
            fontSize: 22,
            color: "rgba(250, 248, 242, 0.62)",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div>{SITE_HOST}</div>
          <div style={{ color: "#E86E2F" }}>● BUILT WITH CLAUDE CODE</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

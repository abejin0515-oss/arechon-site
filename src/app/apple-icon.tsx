import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1F2433",
          color: "#FAF8F2",
          fontSize: 132,
          fontWeight: 700,
          fontFamily: "serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "-0.06em",
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}

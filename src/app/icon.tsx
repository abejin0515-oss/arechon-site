import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1F2433",
          color: "#FAF8F2",
          fontSize: 22,
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

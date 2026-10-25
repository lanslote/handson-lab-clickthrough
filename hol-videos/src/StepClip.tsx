import React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, FONT, H, W } from "./theme";

export type Shot = {
  readonly src: string;
  readonly focus: readonly [number, number, number, number];
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly zoom?: number;
};

export type StepClipProps = {
  readonly stepNo: string;
  readonly title: string;
  readonly what: string;
  readonly why: string;
  readonly takeaway: string;
  readonly shots: readonly Shot[];
};

// Left frame (a window onto the 1280x800 screenshot)
const FX = 56;
const FY = 140;
const FW = 580;
const FH = 363;
const S_FIT = FW / W;
const CARD_X = 666;
const CARD_W = 558;
const CARD_H = 270;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Pick the largest font size whose estimated line count fits the card body.
const fitFont = (text: string, boxW: number, maxH: number) => {
  for (const fs of [32, 31, 30, 29, 28, 27, 26]) {
    const perLine = Math.floor(boxW / (fs * 1.04)) * 0.9;
    const lines = Math.ceil(text.length / perLine);
    if (lines * fs * 1.5 <= maxH) return fs;
  }
  return 25;
};

const zoomFor = (focus: readonly [number, number, number, number], override?: number) => {
  const [fx, fy, fw, fh] = focus;
  const z = override ?? clamp(Math.min(FW / (fw * 1.35), FH / (fh * 1.35)), S_FIT, 1.25);
  const tx = clamp(FW / 2 - (fx + fw / 2) * z, FW - W * z, 0);
  const ty = clamp(FH / 2 - (fy + fh / 2) * z, FH - H * z, 0);
  return { z, tx, ty };
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const WHAT_FROM = 30;
const WHY_FROM = 195;
const TAKE_FROM = 360;

const Card: React.FC<{
  readonly label: string;
  readonly text: string;
  readonly top: number;
  readonly from: number;
  readonly tone: string;
}> = ({ label, text, top, from, tone }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const PAD_X = 28;
  const PAD_Y = 22;
  const labelH = 36;
  const bodyW = CARD_W - PAD_X * 2 - 8;
  const bodyH = CARD_H - PAD_Y * 2 - labelH - 12;
  const fs = fitFont(text, bodyW, bodyH);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD_X,
        top,
        width: CARD_W,
        height: CARD_H,
        boxSizing: "border-box",
        padding: `${PAD_Y}px ${PAD_X}px`,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `8px solid ${tone}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)",
        opacity: interpolate(frame, [from, from + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [from, from + fps * 0.6], ["0px 28px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease,
        }),
      }}
    >
      <div style={{ fontSize: 27, height: labelH, fontWeight: 800, color: tone, marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: fs, lineHeight: 1.5, color: C.text, fontWeight: 600, wordBreak: "keep-all" }}>{text}</div>
    </div>
  );
};

const ShotLayer: React.FC<{ readonly shot: Shot; readonly index: number; readonly last: boolean }> = ({
  shot,
  index,
  last,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - shot.from;
  const { z, tx, ty } = zoomFor(shot.focus, shot.zoom);
  const [hx, hy, hw, hh] = shot.focus;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: interpolate(
          frame,
          [shot.from, shot.from + 10, shot.to - 10, shot.to],
          [index === 0 ? 1 : 0, 1, 1, last ? 1 : 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transformOrigin: "0 0",
          scale: interpolate(f, [0, fps * 1.2], [S_FIT, z], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
          translate: interpolate(f, [0, fps * 1.2], ["0px 0px", `${tx}px ${ty}px`], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
        }}
      >
        <CanvasImage src={staticFile(`shots/${shot.src}`)} premountFor={fps} style={{ width: W, height: H }} />
        <div
          style={{
            position: "absolute",
            left: hx - 8,
            top: hy - 8,
            width: hw + 16,
            height: hh + 16,
            boxSizing: "border-box",
            border: `7px solid ${C.accent}`,
            borderRadius: 14,
            background: C.accentSoft,
            opacity: interpolate(f, [fps * 0.9, fps * 1.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            boxShadow: `0 0 0 ${10 + 10 * Math.sin(f / 7)}px ${C.accentGlow}`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 14,
          bottom: 14,
          padding: "6px 16px",
          borderRadius: 999,
          background: C.text,
          color: "#fff",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        {shot.label}
      </div>
    </div>
  );
};

export const StepClip: React.FC<StepClipProps> = ({ stepNo, title, what, why, takeaway, shots }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        fontFamily: FONT,
        color: C.text,
        opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 38,
          display: "flex",
          alignItems: "center",
          gap: 18,
          translate: interpolate(frame, [0, fps * 0.6], ["0px -20px", "0px 0px"], {
            extrapolateRight: "clamp",
            easing: ease,
          }),
        }}
      >
        <div
          style={{
            padding: "6px 20px",
            borderRadius: 999,
            background: C.accent,
            color: "#fff",
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          {stepNo}
        </div>
        <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: FX,
          top: FY,
          width: FW,
          height: FH,
          overflow: "hidden",
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          background: C.surface,
          boxShadow: "0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)",
        }}
      >
        {shots.map((s, i) => (
          <ShotLayer key={s.src} shot={s} index={i} last={i === shots.length - 1} />
        ))}
      </div>

      <Card label="이게 뭐예요?" text={what} top={140} from={WHAT_FROM} tone={C.link} />
      <Card label="왜 하는 거예요?" text={why} top={430} from={WHY_FROM} tone={C.accent} />

      <div
        style={{
          position: "absolute",
          left: 56,
          top: 523,
          width: FW,
          height: 177,
          boxSizing: "border-box",
          padding: "0 36px",
          borderRadius: 20,
          background: C.accent,
          color: "#fff",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          fontSize: 38,
          lineHeight: 1.4,
          fontWeight: 800,
          wordBreak: "keep-all",
          whiteSpace: "pre-line",
          textWrap: "balance",
          opacity: interpolate(frame, [TAKE_FROM, TAKE_FROM + 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [TAKE_FROM, TAKE_FROM + 18], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
        }}
      >
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, opacity: 0.85, marginBottom: 6 }}>한 줄 정리</div>
          {takeaway}
        </div>
      </div>

      <div style={{ position: "absolute", left: 56, bottom: 30, width: W - 112, height: 8, borderRadius: 4, background: C.border }}>
        <div
          style={{
            width: `${(frame / durationInFrames) * 100}%`,
            height: "100%",
            borderRadius: 4,
            background: C.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

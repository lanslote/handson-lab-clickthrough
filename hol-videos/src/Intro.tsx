import React from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Series,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, FONT, H, W } from "./theme";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Scene: React.FC<{ readonly len: number; readonly children: React.ReactNode }> = ({ len, children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        fontFamily: FONT,
        color: C.text,
        opacity: interpolate(frame, [0, 8, len - 8, len], [0, 1, 1, 0], clampOpts),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ readonly text: string; readonly from: number; readonly left: number; readonly top: number }> = ({
  text,
  from,
  left,
  top,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        padding: "8px 22px",
        borderRadius: 999,
        background: C.accent,
        color: "#fff",
        fontSize: 30,
        fontWeight: 800,
        opacity: interpolate(frame, [from, from + 12], [0, 1], clampOpts),
        translate: interpolate(frame, [from, from + 18], ["0px 14px", "0px 0px"], { ...clampOpts, easing: ease }),
      }}
    >
      {text}
    </div>
  );
};

const Caption: React.FC<{ readonly text: string; readonly from: number; readonly to: number; readonly top: number }> = ({
  text,
  from,
  to,
  top,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: W,
        top,
        textAlign: "center",
        fontSize: 40,
        fontWeight: 800,
        color: C.text,
        opacity: interpolate(frame, [from, from + 12, to - 10, to], [0, 1, 1, 0], clampOpts),
      }}
    >
      {text}
    </div>
  );
};

const BrowserFrame: React.FC<{
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly glow: number;
  readonly children: React.ReactNode;
}> = ({ left, top, width, height, glow, children }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      overflow: "hidden",
      borderRadius: 18,
      background: C.surface,
      border: `${glow > 0 ? 5 : 1}px solid ${glow > 0 ? C.accent : C.border}`,
      boxSizing: "border-box",
      boxShadow: glow > 0 ? `0 0 0 ${glow}px ${C.accentGlow}` : "0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)",
    }}
  >
    {children}
  </div>
);

const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene len={90}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div
          style={{
            padding: "8px 26px",
            borderRadius: 999,
            background: C.accentSoft,
            color: C.accent,
            fontSize: 30,
            fontWeight: 800,
            opacity: interpolate(frame, [4, 16], [0, 1], clampOpts),
          }}
        >
          사용 방법 · 약 40초
        </div>
        <div
          style={{
            fontSize: 98,
            fontWeight: 800,
            letterSpacing: -2,
            opacity: interpolate(frame, [10, 24], [0, 1], clampOpts),
            scale: interpolate(frame, [10, 34], [0.92, 1], { ...clampOpts, easing: ease }),
          }}
        >
          핸즈온 클릭스루 랩
        </div>
        <div
          style={{
            fontSize: 42,
            color: C.muted,
            opacity: interpolate(frame, [28, 44], [0, 1], clampOpts),
          }}
        >
          실제 Copilot Studio 화면으로 따라 하는 실습
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

const GuidePanel: React.FC = () => (
  <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, height: "100%", boxSizing: "border-box", background: "#fcfbf8" }}>
    <div style={{ fontSize: 20, color: C.muted, whiteSpace: "nowrap" }}>Step 3 / 19</div>
    <div style={{ fontSize: 30, fontWeight: 800, whiteSpace: "nowrap" }}>에이전트 이름 바꾸기</div>
    <div style={{ height: 14, borderRadius: 7, background: C.border, width: "92%" }} />
    <div style={{ height: 14, borderRadius: 7, background: C.border, width: "70%" }} />
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: "12px 16px", fontSize: 22, fontFamily: "Consolas, monospace", whiteSpace: "nowrap", overflow: "hidden" }}>
      Contoso IT Concierge
    </div>
    <div style={{ background: C.accentSoft, borderRadius: 10, padding: "12px 16px", fontSize: 24, fontWeight: 700, whiteSpace: "nowrap" }}>▶ 이름 입력란에 입력</div>
    <div style={{ flex: 1 }} />
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, fontSize: 22, whiteSpace: "nowrap" }}>💡 힌트</div>
      <div style={{ flex: 1, textAlign: "center", padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, fontSize: 22, whiteSpace: "nowrap" }}>🔒 대신 해주기</div>
    </div>
  </div>
);

const LayoutScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowLeft = frame >= 20 && frame < 100 ? 8 + 8 * Math.sin(frame / 6) : 0;
  const glowRight = frame >= 100 && frame < 190 ? 8 + 8 * Math.sin(frame / 6) : 0;
  return (
    <Scene len={210}>
      <Pill text="① 실제 화면" from={14} left={60} top={92} />
      <Pill text="② 가이드 패널" from={96} left={820} top={92} />
      <BrowserFrame left={60} top={150} width={730} height={500} glow={glowLeft}>
        <div style={{ height: 40, background: C.soft, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#b8b8b8" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#b8b8b8" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#b8b8b8" }} />
          <div style={{ flex: 1, height: 24, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, fontSize: 16, color: C.muted, display: "flex", alignItems: "center", padding: "0 14px" }}>
            copilotstudio.microsoft.com/…
          </div>
        </div>
        <CanvasImage src={staticFile("shots/s02-name.png")} premountFor={fps} style={{ width: 730, height: 456, display: "block" }} />
      </BrowserFrame>
      <BrowserFrame left={820} top={150} width={400} height={500} glow={glowRight}>
        <GuidePanel />
      </BrowserFrame>
      <Caption text="왼쪽 화면과 오른쪽 가이드를 함께 보며 진행해요" from={130} to={204} top={700} />
    </Scene>
  );
};

const Cursor: React.FC<{ readonly style: React.CSSProperties }> = ({ style }) => (
  <svg width={46} height={46} viewBox="0 0 24 24" style={{ position: "absolute", ...style }}>
    <path d="M3 2l7 18 2.5-7.5L20 10z" fill="#242424" stroke="#ffffff" strokeWidth={1.5} strokeLinejoin="round" />
  </svg>
);

const FollowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const crossfade = interpolate(frame, [100, 118], [0, 1], clampOpts);
  const ripple = interpolate(frame, [92, 112], [0, 1], clampOpts);
  return (
    <Scene len={210}>
      <div
        style={{
          position: "absolute",
          left: 128,
          top: 60,
          width: 1024,
          height: 640,
          overflow: "hidden",
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          background: C.surface,
          boxShadow: "0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", scale: 0.8 }}>
          <CanvasImage src={staticFile("shots/s01-home.png")} premountFor={fps} style={{ width: W, height: H }} />
          <div style={{ position: "absolute", inset: 0, opacity: crossfade }}>
            <CanvasImage src={staticFile("shots/s02-name.png")} premountFor={fps} style={{ width: W, height: H }} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 400,
              top: 322,
              width: 245,
              height: 283,
              boxSizing: "border-box",
              border: `7px solid ${C.accent}`,
              borderRadius: 14,
              background: C.accentSoft,
              opacity: 1 - crossfade,
              boxShadow: `0 0 0 ${10 + 10 * Math.sin(frame / 6)}px ${C.accentGlow}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 393,
              top: 117,
              width: 446,
              height: 58,
              boxSizing: "border-box",
              border: `7px solid ${C.accent}`,
              borderRadius: 14,
              background: C.accentSoft,
              opacity: crossfade,
              boxShadow: `0 0 0 ${10 + 10 * Math.sin(frame / 6)}px ${C.accentGlow}`,
            }}
          />
        </div>
        <Cursor
          style={{
            translate: interpolate(frame, [20, 90, 150, 185], ["860px 520px", "410px 360px", "410px 360px", "700px 170px"], {
              ...clampOpts,
              easing: ease,
            }),
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 418 - 40,
            top: 370 - 40,
            width: 80,
            height: 80,
            borderRadius: 40,
            border: `6px solid ${C.accent}`,
            opacity: interpolate(ripple, [0, 0.2, 1], [0, 1, 0]),
            scale: interpolate(ripple, [0, 1], [0.4, 1.8]),
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 24,
            bottom: 24,
            padding: "12px 20px",
            borderRadius: 12,
            background: C.text,
            color: "#fff",
            fontSize: 26,
            opacity: interpolate(frame, [160, 172, 204, 210], [0, 1, 1, 0], clampOpts),
          }}
        >
          지금은 이 단계가 아닙니다 → 이름 입력란에 입력
        </div>
      </div>
      <Caption text="깜박이는 표시를 클릭하세요" from={8} to={98} top={716} />
      <Caption text="입력 칸에는 안내된 내용을 입력해요" from={112} to={156} top={716} />
      <Caption text="엉뚱한 곳을 누르면 이렇게 안내해 줘요" from={160} to={206} top={716} />
    </Scene>
  );
};

const GATES = [
  { icon: "🔮", title: "예측", desc: "결과를 보기 전에 먼저 골라 봐요", from: 14 },
  { icon: "🧠", title: "체크포인트", desc: "맞혀야 다음 단계로 넘어가요", from: 94 },
  { icon: "🧪", title: "직접 고쳐 보기", desc: "지침을 직접 고치고 비교해요", from: 174 },
  { icon: "✍️", title: "내 말로 정리", desc: "마지막에 한 줄로 적어 봐요", from: 254 },
] as const;

const GatesScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene len={330}>
      <div style={{ position: "absolute", left: 0, width: W, top: 40, textAlign: "center", fontSize: 54, fontWeight: 800 }}>
        클릭만 하고 끝나지 않아요
      </div>
      {GATES.map((g, i) => (
        <div
          key={g.title}
          style={{
            position: "absolute",
            left: i % 2 === 0 ? 70 : 660,
            top: i < 2 ? 140 : 410,
            width: 550,
            height: 250,
            boxSizing: "border-box",
            padding: "0 36px",
            display: "flex",
            alignItems: "center",
            gap: 28,
            borderRadius: 22,
            background: C.surface,
            border: `1px solid ${C.border}`,
            boxShadow: "0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)",
            opacity: interpolate(frame, [g.from, g.from + 12], [0, 1], clampOpts),
            scale: interpolate(frame, [g.from, g.from + 22], [0.9, 1], { ...clampOpts, easing: ease }),
          }}
        >
          <div style={{ fontSize: 76, flex: "none" }}>{g.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.accent, whiteSpace: "nowrap" }}>{g.title}</div>
            <div style={{ fontSize: 27, marginTop: 10, color: C.text, fontWeight: 600, lineHeight: 1.4, wordBreak: "keep-all" }}>{g.desc}</div>
          </div>
        </div>
      ))}
      <Caption text="생각하고, 틀려 보고, 직접 고치는 순간이 기억에 남아요" from={282} to={326} top={694} />
    </Scene>
  );
};

const HintScene: React.FC = () => {
  const frame = useCurrentFrame();
  const unlocked = frame >= 95;
  const box = (from: number): React.CSSProperties => ({
    opacity: interpolate(frame, [from, from + 12], [0, 1], clampOpts),
    scale: interpolate(frame, [from, from + 20], [0.92, 1], { ...clampOpts, easing: ease }),
  });
  const base: React.CSSProperties = {
    width: 290,
    height: 200,
    flex: "none",
    borderRadius: 22,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    fontSize: 34,
    fontWeight: 800,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };
  return (
    <Scene len={180}>
      <div style={{ position: "absolute", left: 0, width: W, top: 70, textAlign: "center", fontSize: 54, fontWeight: 800 }}>
        막히면 힌트부터 보세요
      </div>
      <div style={{ position: "absolute", left: 0, width: W, top: 250, display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ ...base, background: C.surface, border: `1px solid ${C.border}`, ...box(10) }}>
          <div>
            <div style={{ fontSize: 60 }}>😵</div>막혔어요
          </div>
        </div>
        <div style={{ fontSize: 52, color: C.accent, fontWeight: 800, opacity: interpolate(frame, [40, 52], [0, 1], clampOpts) }}>→</div>
        <div style={{ ...base, background: C.surface, border: `1px solid ${C.border}`, ...box(46) }}>
          <div>
            <div style={{ fontSize: 60 }}>💡</div>힌트 보기
          </div>
        </div>
        <div style={{ fontSize: 52, color: C.accent, fontWeight: 800, opacity: interpolate(frame, [86, 98], [0, 1], clampOpts) }}>→</div>
        <div
          style={{
            ...base,
            background: unlocked ? C.accent : C.surface,
            color: unlocked ? "#fff" : C.text,
            border: `1px solid ${unlocked ? C.accent : C.border}`,
            ...box(82),
          }}
        >
          <div>
            <div style={{ fontSize: 60 }}>{unlocked ? "🔓" : "🔒"}</div>대신 해주기
          </div>
        </div>
      </div>
      <Caption text="힌트를 본 뒤에만 열려요. 사용 횟수는 완료 화면에 기록돼요" from={110} to={174} top={600} />
    </Scene>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene len={90}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ fontSize: 76, fontWeight: 800, opacity: interpolate(frame, [4, 18], [0, 1], clampOpts) }}>
          영상은 끝까지 봐야 시작돼요
        </div>
        <div
          style={{
            padding: "14px 40px",
            borderRadius: 999,
            background: C.accent,
            color: "#fff",
            fontSize: 44,
            fontWeight: 800,
            opacity: interpolate(frame, [30, 44], [0, 1], clampOpts),
            scale: interpolate(frame, [30, 54], [0.9, 1], { ...clampOpts, easing: ease }),
          }}
        >
          준비됐다면, 실습을 시작해요
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

export const Intro: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Series>
        <Series.Sequence name="Title" durationInFrames={90} premountFor={fps}>
          <TitleScene />
        </Series.Sequence>
        <Series.Sequence name="Layout" durationInFrames={210} premountFor={fps}>
          <LayoutScene />
        </Series.Sequence>
        <Series.Sequence name="Follow" durationInFrames={210} premountFor={fps}>
          <FollowScene />
        </Series.Sequence>
        <Series.Sequence name="Gates" durationInFrames={330} premountFor={fps}>
          <GatesScene />
        </Series.Sequence>
        <Series.Sequence name="Hint" durationInFrames={180} premountFor={fps}>
          <HintScene />
        </Series.Sequence>
        <Series.Sequence name="Outro" durationInFrames={90} premountFor={fps}>
          <OutroScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};

import React from "react";
import { Composition, Folder } from "remotion";
import { Intro } from "./Intro";
import { StepClip } from "./StepClip";
import { FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Intro" component={Intro} durationInFrames={1110} fps={FPS} width={W} height={H} />
      <Folder name="Clips">
        <Composition
          id="Clip-harness"
          component={StepClip}
          durationInFrames={450}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            stepNo: "Step 2",
            title: "GitHub Copilot 하니스 에이전트",
            what: "대화 경로를 직접 그리는 대신, 글로 쓴 지침과 목표로 움직이는 에이전트예요.",
            why: "시나리오를 다 설계하지 않아도 지침·지식·도구를 바꿔 가며 빠르게 다듬을 수 있어요.",
            takeaway: "지침 + 지식 + 도구\n= 에이전트",
            shots: [{ src: "s01-home.png", focus: [408, 330, 229, 267], label: "Copilot Studio 홈", from: 0, to: 450 }],
          }}
        />
        <Composition
          id="Clip-instructions"
          component={StepClip}
          durationInFrames={450}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            stepNo: "Step 4",
            title: "안내(지침)",
            what: "역할, 말투, 해야 할 일과 하지 말아야 할 일을 적는 에이전트의 행동 규칙이에요.",
            why: "같은 모델도 지침에 따라 다르게 행동해요. 경계를 적어야 안전하고 일관돼요.",
            takeaway: "지침 = 에이전트의 행동 규칙",
            shots: [{ src: "s21-preview-tab.png", focus: [280, 244, 556, 300], label: "빌드 탭 · 안내", from: 0, to: 450 }],
          }}
        />
        <Composition
          id="Clip-knowledge-web"
          component={StepClip}
          durationInFrames={450}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            stepNo: "Step 5",
            title: "공개 웹 사이트 지식",
            what: "공개 웹 사이트를 지식으로 연결해요. 기본값은 '모든 웹 사이트 검색'이에요.",
            why: "토글을 끄고 지정한 사이트만 연결하면, 믿을 수 있는 출처만 근거로 삼아요.",
            takeaway: "출처를 좁힐수록\n답이 믿을 만해져요",
            shots: [{ src: "s06-toggle-off.png", focus: [280, 138, 735, 58], label: "모든 웹 사이트 검색", from: 0, to: 450 }],
          }}
        />
        <Composition
          id="Clip-knowledge-file"
          component={StepClip}
          durationInFrames={450}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            stepNo: "Step 7",
            title: "문서 파일 지식",
            what: "회사 문서(.docx 등)를 직접 올려 지식으로 써요. 텍스트 기반 파일만 지원돼요.",
            why: "인터넷에 없는 우리 회사만의 안내를 근거로 답하게 하려는 거예요.",
            takeaway: "내부 문서 =\n우리 회사만의 정답",
            shots: [{ src: "s13-picker-upload.png", focus: [265, 219, 743, 174], label: "파일 업로드", from: 0, to: 450 }],
          }}
        />
        <Composition
          id="Clip-preview"
          component={StepClip}
          durationInFrames={450}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            stepNo: "Step 10",
            title: "미리 보기와 크레딧",
            what: "미리 보기는 실제 사용자처럼 에이전트를 시험해 보는 곳이에요.",
            why: "빌드 탭 설정은 무료지만, 미리 보기 대화는 크레딧을 써요. 질문을 아껴서 시험하세요.",
            takeaway: "빌드는 무료,\n미리 보기는 크레딧",
            shots: [{ src: "s22-q1-input.png", focus: [696, 90, 110, 32], label: "크레딧 카운터", from: 0, to: 450, zoom: 2.1 }],
          }}
        />
        <Composition
          id="Clip-evidence"
          component={StepClip}
          durationInFrames={450}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            stepNo: "Step 12",
            title: "추론 과정과 인용",
            what: "추론 과정은 어떤 도구를 썼는지, 인용은 답의 근거 문서를 보여줘요.",
            why: "AI 답은 그럴듯해도 틀릴 수 있어요. 근거를 직접 열어 확인해야 믿을 수 있어요.",
            takeaway: "믿기 전에\n근거를 열어 보세요",
            shots: [{ src: "s26-q1-top.png", focus: [376, 205, 770, 130], label: "미리 보기 · 추론 과정", from: 0, to: 450 }],
          }}
        />
        <Composition
          id="Clip-scope"
          component={StepClip}
          durationInFrames={450}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{
            stepNo: "Step 15",
            title: "범위 제한 실험",
            what: "범위 제한은 맡을 일과 맡지 않을 일의 경계를 글로 적어 두는 지침이에요.",
            why: "경계가 없으면 IT와 비슷한 요청(코드 작성 등)까지 답해서 담당 범위가 무너져요.",
            takeaway: "경계는 문장으로 명시하세요",
            shots: [
              { src: "s42-code-a-with-scope.png", focus: [376, 205, 770, 330], label: "A · 범위 제한 있음 → 거절", from: 0, to: 225 },
              { src: "s43-code-b-without-scope.png", focus: [376, 128, 770, 470], label: "B · 범위 제한 없음 → 코드 작성", from: 225, to: 450 },
            ],
          }}
        />
      </Folder>
    </>
  );
};

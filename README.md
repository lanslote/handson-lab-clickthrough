# 핸즈온 클릭스루 랩

정해진 길을 가는 핸즈온을, **실제 Copilot Studio 한국어 화면 위의 클릭스루**로 만들어 본 실험입니다.
오른쪽 가이드 패널을 따라 클릭하고 입력하면 되며, 테넌트·라이선스·Copilot Credits가 필요 없습니다.

- 소개 페이지: https://lanslote.github.io/handson-lab-clickthrough/
- 랩 v2 (학습 장치 포함): https://lanslote.github.io/handson-lab-clickthrough/lab2/
- 랩 v1 (기본): https://lanslote.github.io/handson-lab-clickthrough/lab/

## 구성

```
index.html        소개 페이지
lab/              v1: 스크린샷 + 클릭 영역 + 가이드 패널 (15단계)
  index.html
  lab-data.js     단계 정의 (클릭 영역 좌표, 가이드 문구)
  shots/          실제 화면 캡처 31장 (1280x800)
lab2/             v2: v1 + 학습 장치 (19단계)
  index.html
  lab-data.js
  shots/          실제 화면 캡처 34장 (범위 제한 실험 결과 3장 추가, s21 교체)
```

서버 코드는 없습니다. 정적 파일만으로 동작하므로 GitHub Pages나 로컬에서 `lab/index.html`, `lab2/index.html`을 열어도 됩니다.

## v2의 학습 장치

클릭만으로 끝나지 않도록 단계 사이에 아래 항목을 넣었습니다. 모두 `lab-data.js`의 `kind`로 정의합니다.

| kind | 동작 |
|---|---|
| `quiz` (`mode: 'predict'`) | 결과를 보기 전에 예측을 고르고, 나중에 실제 결과와 비교 |
| `quiz` (`mode: 'check'`) | 정답을 맞혀야 진행. 오답 이유 안내, 두 번 틀리면 정답 공개 |
| `edit` | 지침을 직접 고치게 함 (예: '범위 제한' 섹션 삭제) |
| `compare` | 실제로 실행해 둔 결과 화면을 탭으로 모두 확인해야 진행 |
| `reflect` | 한 줄 이상의 답안을 쓰고, 키워드 기반 점검과 모범 답안을 확인 |

그 밖에 힌트를 본 뒤에만 "대신 해주기"가 열리고, 4초 안에 넘긴 단계는 완료 화면에서 다시 보도록 안내합니다.

## 새 미션 추가

1. 한국어 UI로 로그인된 화면을 1280x800으로 캡처합니다. 개인정보는 가려서 저장하세요.
2. `lab/lab-data.js`의 `steps`에 단계를 추가합니다. `click`은 클릭 영역 `[x, y, 너비, 높이]`, `input`은 입력 영역과 정답 값을 가집니다.
3. 좌표는 캡처한 이미지 기준입니다. 이미지와 좌표가 같은 해상도여야 합니다.

## 한계

- UI가 바뀌면 다시 캡처해야 합니다. (캡처 대상: Copilot Studio 프리뷰 화면)
- 응답은 한 번 생성된 결과이며, 실행마다 달라지는 LLM의 특성은 보여주지 못합니다.
- 이 샘플에는 SharePoint 연결과 솔루션 확인 단계가 없습니다.

## 출처

비공식 프로토타입입니다. 실습 내용은 [Microsoft Agent Academy · Recruit NextGen](https://microsoft.github.io/agent-academy/recruit-nextgen/)(MIT License)의 Mission 04를 바탕으로 한국어로 옮겼습니다.
스크린샷은 Microsoft Copilot Studio(프리뷰) 화면에서 개인정보를 가려 캡처했습니다. Microsoft, Copilot Studio 및 관련 명칭은 Microsoft의 상표입니다.

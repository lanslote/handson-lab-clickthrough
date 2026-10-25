# hol-videos

핸즈온 랩 v2의 짧은 영상(Remotion) 소스입니다. 결과물은 `../lab2/videos/`에 있습니다.

## 실행

```bash
npm i
node scripts/prepare.mjs     # ../lab2/shots 를 public/shots 로 복사
npx remotion studio          # 미리 보기
npx remotion render Intro out/videos/intro.mp4 --codec=h264 --crf=27
```

## 구성

- `src/Intro.tsx` 소개 영상 (사용 방법, 37초)
- `src/StepClip.tsx` 단계 클립 템플릿 (이게 뭐예요? / 왜 하는 거예요? / 한 줄 정리)
- `src/Root.tsx` 단계 클립 7개의 문구와 화면 위치. 이 파일만 고치면 새 클립을 만들 수 있습니다.

글씨가 카드 밖으로 넘치지 않도록 카드 안에서 글자 크기를 자동으로 맞춥니다. 문구를 바꾼 뒤에는 Studio에서 한 번 훑어 확인하세요.

# iFigmaLab 사용 가이드

Figma 디자인을 Google Gemini AI로 분석해 즉시 실행 가능한 HTML/CSS/JS 코드로 변환합니다.

---

## 빠른 시작

### 1단계 — API Key 설정 `AGENT 탭`

- Gemini API Key를 입력합니다.
- **API 키 기억하기**를 체크하면 다음 방문 시 자동으로 복원됩니다.
- **Get Model Info**로 키 유효성과 모델 스펙을 확인할 수 있습니다.

> API Key는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있습니다.

### 2단계 — 디자인 가져오기 `MCP 탭`

Figma 연동 또는 직접 붙여넣기, 두 가지 방법이 있습니다.

**방법 A — Figma 자동 연동**

1. Figma Desktop App 실행
2. Proxy Server 실행 (`localhost:3006`)
3. MCP 탭 상단 연결 상태가 `Connected`인지 확인
4. Figma Node ID 또는 URL을 입력한 후 **Fetch** 클릭

**방법 B — 직접 붙여넣기 (Proxy 없이)**

- Figma에서 복사한 Design Context(JSON)를 Context 입력창에 붙여넣습니다.

**공통 옵션**

- **Screenshot** — 디자인 이미지를 캡처해 AI에게 함께 전달합니다.
- **Optimize** — `data-*` 속성을 제거해 토큰을 절약합니다.

### 3단계 — 생성 `MCP 탭`

- Prompt에 추가 지시사항을 입력합니다. (생략 가능)
- **Count Tokens** — 전송 전 토큰 수를 미리 확인합니다.
- **Submit ▶** — 생성을 시작합니다.

### 4단계 — 결과 확인 `VIEW 탭`

- 생성된 HTML을 브라우저에서 바로 미리봅니다.
- **Source** 버튼으로 소스 코드를 확인하고, **Download**로 파일을 저장합니다.

---

## 탭 안내

| 탭 | 역할 |
|---|---|
| **AGENT** | Gemini API Key, 모델 선택, API 키 저장 설정 |
| **MCP** | Figma 연동, Design Context 입력, 생성 요청 |
| **VIEW** | 생성된 HTML 미리보기 및 소스 다운로드 |
| **LOG** | 요청/응답 상세 디버그 로그 |
| **HELP** | 이 페이지 |

---

## 지원 모델

| 모델 | 특징 |
|---|---|
| `gemini-2.5-pro` | 최고 성능 — 복잡한 레이아웃·추론에 적합 |
| `gemini-2.5-flash` | 기본값 — 속도와 비용의 균형 |
| `gemini-2.5-flash-lite` | 저비용·저지연 |
| `gemini-2.0-flash` | 안정적인 구버전 |

---

## 아키텍처

```
Figma Desktop App
  └─ Figma MCP Server  (:3845)
       └─ Proxy Server  (:3006)
            └─ iFigmaLab (브라우저)
                 └─ Google Gemini API  ← Submit 시 브라우저에서 직접 호출
```

- **Gemini API 호출**은 Proxy를 거치지 않고 브라우저에서 직접 이루어집니다.
- **Proxy Server**는 Figma MCP 데이터 수신과 Screenshot 기능에만 사용됩니다.

---

## 문제 해결

**API Key가 유효하지 않다고 나올 때**
- AGENT 탭 → **Get Model Info** 버튼으로 키 유효성을 확인하세요.
- 키 앞뒤의 공백이 포함되지 않았는지 확인하세요.

**MCP 연결이 안 될 때**
- Figma Desktop App이 실행 중인지 확인하세요.
- Proxy Server가 `localhost:3006`에서 실행 중인지 확인하세요.
- Proxy 없이 사용하려면 Design Context를 직접 붙여넣으세요.

**생성이 실패하거나 HTML이 잘릴 때**
- LOG 탭에서 오류 메시지를 확인하세요.
- `gemini-2.5-pro` 모델은 더 높은 출력 토큰 한도를 지원합니다.
- Optimize로 입력 토큰을 줄이면 더 긴 출력이 가능합니다.

**토큰이 너무 많을 때**
- **Optimize** 버튼으로 불필요한 속성을 제거하세요.
- Screenshot 없이 Design Context만 사용해보세요.
- 복잡한 디자인은 섹션 단위로 나눠 생성하세요.

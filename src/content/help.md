# iFigmaLab 사용 가이드

Figma 디자인을 AI로 분석해 즉시 실행 가능한 HTML/CSS/JS 코드로 변환합니다.

---

## 시작하기

### 1. API Key 설정

**AGENT 탭**에서 Google Gemini API Key를 입력하고 사용할 모델을 선택합니다.

> Gemini API Key는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있습니다.

### 2. Figma 연결 (선택)

Figma 디자인을 자동으로 가져오려면 Figma Desktop App과 Proxy Server가 실행 중이어야 합니다.

- Figma Desktop App 실행
- Proxy Server 실행 (`localhost:3006`)
- **MCP 탭** 상단의 연결 상태가 `Connected`인지 확인

> Proxy Server 없이도 Design Context를 직접 붙여넣기하면 동일하게 사용할 수 있습니다.

### 3. 디자인 가져오기

**MCP 탭**에서 Figma Node ID 또는 Figma URL을 입력한 후:

- **Fetch from Figma** — Design Context(JSON) 가져오기
- **Screenshot** — 디자인 이미지 캡처

필요하다면 **Optimize**를 눌러 토큰 수를 줄일 수 있습니다.

### 4. 생성 및 확인

추가 지시사항을 Prompt에 입력하고 **Submit ▶**을 클릭합니다.
생성이 완료되면 **VIEW 탭**에서 결과를 바로 확인할 수 있습니다.

---

## 탭 안내

| 탭 | 역할 |
|---|---|
| **AGENT** | Gemini API Key 및 모델 설정 |
| **MCP** | Figma 연동, Design Context 입력, 생성 요청 |
| **VIEW** | 생성된 HTML 미리보기 및 소스 다운로드 |
| **LOG** | 요청/응답 상세 디버그 로그 |
| **HELP** | 사용 가이드 |

---

## 아키텍처

```
Figma Desktop App
  └─ Figma MCP Server (:3845)
       └─ Proxy Server (:3006)
            └─ iFigmaLab (브라우저)
                 └─ Google Gemini API  ← Submit 시 브라우저에서 직접 호출
```

Gemini API 호출은 Proxy Server를 거치지 않고 브라우저에서 직접 이루어집니다.
Proxy Server는 Figma MCP 데이터 수신 및 Screenshot 기능에만 사용됩니다.

---

## 문제 해결

**MCP 연결이 안 될 때**
- Figma Desktop App이 실행 중인지 확인하세요.
- Proxy Server가 `localhost:3006`에서 실행 중인지 확인하세요.

**생성이 실패할 때**
- AGENT 탭에서 API Key가 올바르게 입력되었는지 확인하세요.
- LOG 탭에서 오류 메시지를 확인하세요.

**Figma 없이 사용하고 싶을 때**
- Figma에서 직접 Design Context(JSON)를 복사해 MCP 탭의 입력창에 붙여넣으세요.
- Proxy Server 없이도 Submit이 가능합니다.

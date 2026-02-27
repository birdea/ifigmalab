# iFigmaLab 사용 가이드

Figma 디자인을 Google Gemini AI로 분석해 즉시 실행 가능한 HTML/CSS/JS 코드로 변환합니다.

---

## 빠른 시작

### 1단계 — API Key 설정 `AGENT 탭`

- Gemini API Key를 입력합니다.
- **로컬에 암호화하여 저장**을 체크하고 **4자리 이상 PIN**을 입력하면, 브라우저 로컬 저장소에 안전하게 암호화되어 보관됩니다. 재방문 시 PIN만 입력하여 잠금을 해제(Unlock)할 수 있습니다.
- **GET** 링크를 클릭하면 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 키를 발급받을 수 있습니다.

### 2단계 — 모델 선택 `AGENT 탭`

- 드롭다운에서 원하는 모델을 선택한 뒤 **SET** 버튼으로 적용합니다.
- 드롭다운 선택과 실제 적용은 별도의 2단계로 동작합니다. SET을 눌러야 반영됩니다.
- **↻ 새로고침** 버튼으로 Gemini API에서 최신 모델 목록을 가져올 수 있습니다. (API Key 필요)

### 3단계 — 디자인 가져오기 `MCP 탭`

Figma 연동 또는 직접 붙여넣기, 두 가지 방법이 있습니다.

**방법 A — Figma 자동 연동**

1. Figma Desktop App 실행
2. Proxy Server 실행 (`localhost:3006`)
3. 연결 상태가 `Connected`인지 확인
4. Figma Node ID 또는 URL을 입력한 후 **Fetch** 클릭

**방법 B — 직접 붙여넣기 (Proxy 없이)**

- Figma에서 복사한 Design Context(JSON)를 Context 입력창에 직접 붙여넣습니다.

### 4단계 — 생성 `MCP 탭`

- Prompt에 추가 지시사항을 입력합니다. (생략 가능)
- **Count Tokens** — 전송 전 토큰 수를 미리 확인합니다.
- **Submit ▶** — 생성을 시작합니다.
- 완료되면 MCP 탭 하단 미리보기에 결과가 표시되고, VIEW 탭 이동 알림이 나타납니다.

---

## 탭 안내

- **AGENT** — Gemini API Key 입력, 모델 선택, API 키 저장 설정
- **MCP** — Figma 연동, Design Context 입력, 생성 요청, 인라인 미리보기
- **VIEW** — 생성된 HTML 전체 화면 미리보기
- **HELP** — 이 페이지

---

## AGENT 탭 상세

### AI 공급자

현재는 **Google Gemini**만 지원합니다. Claude·Codex는 추후 지원 예정입니다.

### API Key

| 항목 | 설명 |
|---|---|
| 입력창 | 기본 숨김 처리. Show/Hide 버튼으로 토글 |
| 로컬에 암호화하여 저장 | 체크 시 4자리 이상의 PIN과 함께 암호화된 상태로 `localStorage`에 안전하게 저장 |
| 잠금 해제 (Unlock) / Clear | 저장된 키가 있을 경우 초기화면에 나타나며, 올바른 PIN을 입력해 Unlock 하거나 Clear로 일괄 삭제 |

### 모델 선택

| 항목 | 설명 |
|---|---|
| 드롭다운 | 사용 가능한 모델 목록. 기본값: `gemini-2.5-flash` |
| ↻ 새로고침 | Gemini API에서 실시간 모델 목록 조회 (generateContent 지원 모델만 표시) |
| SET | 드롭다운에서 선택한 모델을 실제로 적용. 미적용 상태일 때 파란색으로 강조 |
| 현재 적용 | SET으로 적용된 모델 이름을 힌트 텍스트로 표시 |

### Get Model Info

- API Key와 모델을 설정한 상태에서 클릭하면 해당 모델의 스펙 정보를 조회합니다.
- 표시 항목: `name`, `displayName`, `description`, `version`, `inputTokenLimit`, `outputTokenLimit`, `supportedGenerationMethods`, `temperature`, `topP`, `topK` 등

---

## MCP 탭 상세

### Figma MCP 연동 패널

| 항목 | 설명 |
|---|---|
| Server URL | Figma Desktop App의 MCP 서버 주소. 기본값: `http://localhost:3845` |
| Apply | 입력한 URL로 연결 상태를 즉시 재확인 |
| 연결 상태 | `Connected` (초록) / `Disconnected` (회색). 10초마다 자동 갱신 |
| Node ID | Figma Node ID 또는 전체 URL 입력. 하이픈·콜론 형식 모두 허용 |
| Fetch | Proxy 서버를 통해 디자인 Context를 가져와 아래 Context 입력창에 채움 |
| Screenshot | 현재 Node의 이미지를 캡처해 AI에 함께 전달. Figma 연결 및 Node ID 필수 |
| 이미지 미리보기 | 캡처된 이미지 섬네일 표시. **✕ 제거** 버튼으로 삭제 가능 |

### Design Prompt 패널

| 항목 | 설명 |
|---|---|
| Context | Figma 디자인 데이터(JSON). Fetch 또는 직접 붙여넣기 |
| 크기 뱃지 | Context가 입력되면 현재 바이트 크기를 표시 (예: `12.4 KB`) |
| Optimize | `data-*` 속성을 제거해 토큰을 절약. Context가 있을 때만 표시 |
| Prompt | AI에게 전달할 추가 지시사항. 비워두면 기본 지시사항이 사용됨 |
| 준비 상태 표시줄 | API Key와 Content 충족 여부를 실시간으로 표시 |
| Count Tokens | 전송될 전체 토큰 수를 미리 계산해 표시 |
| Submit ▶ | HTML 생성 요청. API Key 또는 Content가 없으면 비활성화 |

### 인라인 미리보기 (Submit 후)

생성이 완료되면 MCP 탭 하단에 미리보기가 표시됩니다.

| 버튼 | 설명 |
|---|---|
| Show / Hide Source Code | 생성된 HTML 소스를 코드 블록으로 표시·숨김 |
| ⬇ Download HTML | `figma-agent-{timestamp}.html` 파일로 다운로드 |
| 🔍 Debug Info | MCP 데이터 및 Gemini 원본 응답 일부를 확인 |

### Debug Log

Submit 또는 Count Tokens 실행 후 패널 하단에 나타납니다. 각 단계의 상세 정보를 타임스탬프와 함께 기록합니다.

- 유효성 검사, 프롬프트 구성 정보, 요청/응답 정보, HTML 추출 결과 등을 포함합니다.
- 메모리 성능을 위해 가장 최근 **500줄**까지만 유지됩니다.
- **Clear** 버튼으로 수동 초기화할 수도 있습니다.

---

## VIEW 탭 상세

- 생성된 HTML을 샌드박스 `<iframe>`으로 전체 화면 미리봅니다.
- 생성 완료 시 우측 하단에 알림이 표시되며, **VIEW로 이동** 버튼을 클릭해 바로 이동할 수 있습니다.
- 알림은 5초 후 자동으로 사라집니다.

---

## 지원 모델

| 모델 | 특징 |
|---|---|
| `gemini-2.5-pro` | 최고 성능 — 복잡한 레이아웃·추론에 적합 |
| `gemini-2.5-flash` | 기본값 — 속도와 비용의 균형 |
| `gemini-2.5-flash-lite` | 저비용·저지연 |
| `gemini-2.0-flash` | 안정적인 구버전 |

> **↻ 새로고침** 버튼을 사용하면 최신 모델 목록을 Gemini API에서 직접 조회합니다.

---

## 아키텍처

```
Figma Desktop App
  └─ Figma MCP Server  (:3845)
       └─ Proxy Server  (:3006)
            └─ iFigmaLab  (:3005, 브라우저)
                 └─ Google Gemini API (v1beta)  ← Submit 시 브라우저에서 직접 호출
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

**Screenshot 버튼이 비활성화될 때**
- Figma MCP가 `Connected` 상태인지 확인하세요.
- Node ID가 입력되어 있는지 확인하세요.

**생성이 실패하거나 HTML이 잘릴 때**
- MCP 탭 하단 **Debug Log**에서 오류 메시지를 확인하세요.
- `gemini-2.5-pro` 모델은 더 높은 출력 토큰 한도를 지원합니다.
- **Optimize**로 입력 토큰을 줄이면 더 긴 출력이 가능합니다.

**모델 선택이 반영되지 않을 때**
- 드롭다운 선택 후 **SET** 버튼을 눌러야 실제로 적용됩니다.

**토큰이 너무 많을 때**
- **Optimize** 버튼으로 불필요한 `data-*` 속성을 제거하세요.
- Screenshot 없이 Design Context만 사용해보세요.
- 복잡한 디자인은 섹션 단위로 나눠 생성하세요.

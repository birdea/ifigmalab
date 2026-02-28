/**
 * Figma URL 또는 Node ID 파라미터를 입력받아 Figma MCP 처리 형태(콜론 구분)로 정규화합니다.
 * @param raw - 사용자가 입력한 URL 형태의 문자열 또는 Node ID 포맷값
 * @returns 정규화된 Node ID 또는 포맷 에러 시 null 반환
 */
export function parseNodeId(raw: string): string | null {
  // 1) 텍스트 전체에서 Figma URL을 검색 (@ 접두사 포함 여부 무관, 멀티라인 대응)
  const urlMatch = raw.match(/@?(https?:\/\/(?:www\.)?figma\.com\/[^\s]+)/);
  if (urlMatch) {
    try {
      const url = new URL(urlMatch[1]);
      const nodeIdParam = url.searchParams.get('node-id');
      if (!nodeIdParam) return null;
      // "22041-216444" → "22041:216444"
      return nodeIdParam.replace(/-/g, ':');
    } catch {
      return null;
    }
  }

  const trimmed = raw.trim();

  // 2) 하이픈 구분자 → 콜론으로 변환 (예: "22041-218191")
  if (/^\d+-\d+$/.test(trimmed)) {
    return trimmed.replace(/-/g, ':');
  }

  // 3) 이미 콜론 구분자인 경우 (예: "22041:218191")
  if (/^\d+:\d+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

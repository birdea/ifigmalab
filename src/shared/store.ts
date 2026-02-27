import { createStore } from 'jotai';

/**
 * 앱 전반에서 공통으로 사용되는 Jotai 전역 Store 인스턴스입니다.
 * Provider에 연결되어 하위 Component에서 상태를 공유할 수 있도록 합니다.
 */
export const sharedStore = createStore();

# 티켓팅 타이머

공연 티켓팅을 위한 정확한 시간 동기화 및 카운트다운 Chrome 확장 프로그램

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/gogmbnfdmcbibgmlbjcjojpnbfejlkco?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/%ED%8B%B0%EC%BC%93%ED%8C%85-%ED%83%80%EC%9D%B4%EB%A8%B8/gogmbnfdmcbibgmlbjcjojpnbfejlkco)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 설치

[Chrome Web Store에서 설치 →](https://chromewebstore.google.com/detail/%ED%8B%B0%EC%BC%93%ED%8C%85-%ED%83%80%EC%9D%B4%EB%A8%B8/gogmbnfdmcbibgmlbjcjojpnbfejlkco)

개발자 모드로 직접 설치하려면:

1. `chrome://extensions/` 이동
2. 우측 상단 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `ticket-timer` 폴더 선택

```bash
git clone https://github.com/lukaPlayground/ticket-timer.git
```

## 주요 기능

- **표준시 동기화**: WorldTimeAPI 기반 KST 동기화 (네트워크 지연 보정)
- **탭별 독립 타이머**: 여러 공연을 각 탭에 개별 설정 가능
- **실시간 카운트다운**: 배지에 남은 시간 표시 (`3d` / `2h` / `45m` / `30s` / `!`)
- **자동 새로고침**: 오픈 시각에 페이지 자동 F5 (선택 사항)
- **알림 + 탭 활성화**: 오픈 시각 도래 시 브라우저 알림 및 자동 포커스

## 사용 방법

1. 티켓팅할 사이트 탭 열기 (멜론티켓, 인터파크 등)
2. 확장 프로그램 아이콘 클릭
3. 공연명 / 날짜 / 오픈 시각 / 자동 새로고침 여부 입력
4. **이 탭에 타이머 설정** 클릭

여러 공연을 동시에 준비할 경우 각 탭에 독립적으로 설정하면 됩니다.

## 주의사항

시간 확인 및 알림 기능만 제공합니다. 자동 클릭, 자동 구매 등의 매크로 기능은 없습니다.

## 기술 스택

- Chrome Extension Manifest V3
- Vanilla JavaScript
- WorldTimeAPI
- Chrome Storage / Alarms / Notifications API

## 라이선스

MIT License

## 개발자

Luka · [lukaplayground.tistory.com](https://lukaplayground.tistory.com)

# 동국제약·경쟁사 광고 대시보드

동국제약과 경쟁사의 광고 소재와 반응을 비교합니다. 두 탭에서 기간·매체·소재를 필터링하고 유튜브 및 TVCF 지표로 정렬할 수 있습니다.

| 탭 | 확인할 내용 |
| --- | --- |
| 동국제약+경쟁사 | 회사별 영상 소재와 유튜브·TVCF 반응 |
| 카리토포텐+경쟁사 | 카리토포텐과 10개 경쟁 제품의 광고 소재와 공개 반응 |

TVCF 재생·좋아요·댓글 수치는 소재별 공개 화면의 확인값입니다. 로그인 전 일부만 보이는 댓글은 미리보기로 표시합니다. 광고정보센터의 등록일, 유튜브 게시일, TVCF 온에어일은 카드에 각각 표기합니다.

## 열기

GitHub Pages 게시가 완료되면 [대시보드 웹 주소](https://kimyongwoogo.github.io/DK/)에서 열 수 있습니다. 게시 원본은 `main` 브랜치 루트의 [`index.html`](index.html)입니다. 게시 설정은 [Settings → Pages](https://github.com/kimyongwoogo/DK/settings/pages)에 있습니다.

로컬에서는 저장소 루트에서 `python3 -m http.server 8000`을 실행한 뒤 `http://localhost:8000`을 엽니다.

## 일일 점검 데이터

한국시간 오전 9시 점검의 반영 파일은 [`data/daily_checks.json`](data/daily_checks.json)입니다. 화면 상단에 마지막 확인 일시가 표시됩니다. 조회수 등 축약 표시에는 증감을 계산하지 않으며, 출처에서 확인하지 못한 값은 `—`로 표시합니다.

확인한 회차의 JSON은 `runs[0]`과 같은 구조를 사용합니다. `checked_at`에는 `+09:00`을 포함하고, TVCF·유튜브·뉴스에 각각 확인 상태, 범위, 행을 기록합니다. 새 회차를 검증하고 기존 기록에 병합하려면 다음 명령을 실행합니다.

```sh
python3 refresh_daily.py --update verified_check.json --output data/daily_checks.json
```

공개 댓글 스냅숏은 `data/youtube_comment_snapshot.json`에 있습니다. 대시보드의 **댓글 원문 연결**에 YouTube Data API 키를 입력하면 영상의 현재 공개 댓글을 직접 불러올 수 있습니다. 키는 열린 페이지에서만 사용됩니다.

제품 비교의 소재와 유튜브 반응은 `data/competition.json`에서 관리합니다. 두 탭의 TVCF 공개 반응은 `data/tvcf_reactions.json`에서 소재 ID로 연결합니다. 새로 확인한 값의 확인일과 TVCF 원본 주소를 함께 기록합니다.

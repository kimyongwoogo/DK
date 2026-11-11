# 동국제약·경쟁사 광고 대시보드

동국제약과 경쟁사 10곳의 광고 소재와 반응을 비교합니다. 회사·기간별로 소재를 찾고 영상 카드 하단에서 수록된 유튜브 공개 댓글 원문을 스크롤해 읽을 수 있습니다.

| 탭 | 확인할 내용 |
| --- | --- |
| 광고 소재 | 회사별 썸네일, 유튜브 조회수·좋아요·댓글, 수록된 댓글 원문 |
| TVCF 현황 | 소재별 온에어일·등록일과 점검 결과 |
| 유튜브 수치 | 공식 영상별 조회수·좋아요·댓글 및 이전 점검 대비 증감 |
| 브랜드·제품 뉴스 | 회사·브랜드·제품 필터, 네이버·구글 확인 경로, 기사 원문 |

## 열기

GitHub Pages에서 `main` 브랜치의 루트 폴더를 게시하면 [`index.html`](index.html)이 표시됩니다. 게시 설정은 [Settings → Pages](https://github.com/kimyongwoogo/DK/settings/pages)에 있습니다.

로컬에서는 저장소 루트에서 `python3 -m http.server 8000`을 실행한 뒤 `http://localhost:8000`을 엽니다.

## 일일 점검 데이터

한국시간 오전 9시 점검의 반영 파일은 [`data/daily_checks.json`](data/daily_checks.json)입니다. 화면 상단에 마지막 확인 일시가 표시됩니다. 조회수 등 축약 표시에는 증감을 계산하지 않으며, 출처에서 확인하지 못한 값은 `—`로 표시합니다.

확인한 회차의 JSON은 `runs[0]`과 같은 구조를 사용합니다. `checked_at`에는 `+09:00`을 포함하고, TVCF·유튜브·뉴스에 각각 확인 상태, 범위, 행을 기록합니다. 새 회차를 검증하고 기존 기록에 병합하려면 다음 명령을 실행합니다.

```sh
python3 refresh_daily.py --update verified_check.json --output data/daily_checks.json
```

공개 댓글 스냅숏은 `data/youtube_comment_snapshot.json`에 있습니다. 대시보드의 **댓글 원문 연결**에 YouTube Data API 키를 입력하면 영상의 현재 공개 댓글을 직접 불러올 수 있습니다. 키는 열린 페이지에서만 사용됩니다.

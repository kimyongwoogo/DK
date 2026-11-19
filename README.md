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

한국시간 오전 9시에 예약된 유튜브·TVCF 수치 갱신은 [`data/metric_updates.json`](data/metric_updates.json)에 반영됩니다. 두 갤러리에 매체별 수치의 실제 확인 시각과 최근 점검에서 확인한 편수가 표시됩니다.

`python3 refresh_metrics.py --targets`로 현재 소재에 연결된 공개 원본을 찾습니다. `python3 refresh_metrics.py --update observed_metrics.json`은 매체별 `checked_at`과 `records`를 검증해 확인된 수치를 반영합니다. 원본에서 확인한 정확한 값만 기록하고, 확인에 실패한 영상의 마지막 수치는 보존합니다.

공식 API 연결이 없는 환경에서는 `python3 collect_youtube.py > observed_youtube.json`으로 공개 원본 페이지에서 확인 가능한 유튜브 수치의 점검 데이터를 만듭니다.

광고·뉴스 일일 점검의 이력은 [`data/daily_checks.json`](data/daily_checks.json)에 있습니다.

확인한 회차의 JSON은 `runs[0]`과 같은 구조를 사용합니다. `checked_at`에는 `+09:00`을 포함하고, TVCF·유튜브·뉴스에 각각 확인 상태, 범위, 행을 기록합니다. 새 회차를 검증하고 기존 기록에 병합하려면 다음 명령을 실행합니다.

```sh
python3 refresh_daily.py --update verified_check.json --output data/daily_checks.json
```

공개 댓글 스냅숏은 `data/youtube_comment_snapshot.json`에 있습니다. 대시보드의 **댓글 원문 연결**에 YouTube Data API 키를 입력하면 영상의 현재 공개 댓글을 직접 불러올 수 있습니다. 키는 열린 페이지에서만 사용됩니다.

제품 비교의 소재와 유튜브 반응은 `data/competition.json`에서 관리합니다. 두 탭의 TVCF 공개 반응은 `data/tvcf_reactions.json`에서 소재 ID로 연결합니다. 새로 확인한 값의 확인일과 TVCF 원본 주소를 함께 기록합니다.

## 최근 기간 필터

최근 1·3·7·14·30일은 두 탭 모두 한국시간 오늘을 포함한 달력 날짜 기준입니다. 최근 1일은 오늘, 최근 7일은 오늘과 앞선 6일이며, 자료 수집일을 기간의 종료일로 사용하지 않습니다. NEW 표시는 오늘 기준 최근 7일을 사용합니다. 날짜가 바뀌면 열린 화면의 기간도 갱신됩니다.

화면에 기간의 시작·종료일과 소재 확인일·확인 범위를 구분해 표시합니다. 동국제약+경쟁사는 온에어일, 제품 비교는 카드의 온에어·게시·등록일로 필터링합니다. 해당 기간 수록 0편은 전체 신규 광고 0편을 의미하지 않습니다. 조회수·좋아요·댓글은 각 확인일의 누적 수치이며 선택 기간의 증감값이 아닙니다.

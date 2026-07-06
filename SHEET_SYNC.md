# Google 스프레드시트 연동 설정 방법

이 사이트는 `sheetConfig.js`의 `SHEET_CSV_URL`을 설정하면, 사이트를 열 때마다
Google 스프레드시트 내용을 자동으로 불러와 자료 카드로 보여줍니다.
설정하지 않으면(빈 문자열) `data.js`의 로컬 데이터만 사용합니다.

## 1. 스프레드시트 만들기

1. Google 스프레드시트에서 새 시트를 만든다.
2. `파일 > 가져오기 > 업로드`에서 이 저장소의 `sheet-template.csv`를 가져온다.
   (헤더 행 + 샘플 데이터 1행이 포함되어 있어 형식을 그대로 확인할 수 있다.)
3. 샘플 행 아래로 지문을 한 행씩 추가한다.

## 2. 열(컬럼) 규칙

- `id`, `book`, `level`, `unit`, `passageNo`, `category`, `title`, `topic`, `readingTime`, `words` — 지문 기본 정보.
  - `book` 값은 사이트의 교재 필터(`data.js`의 `BOOKS`)에 있는 교재명과 **정확히 일치**해야 필터에서 정상적으로 걸러집니다.
  - `passageNo`에 `01`처럼 0으로 시작하는 값을 넣으면 Google 스프레드시트가 자동으로 `1`로 바꿔버릴 수 있습니다. 한 자리 숫자는 사이트에서 자동으로 앞에 0을 채워 보정하지만(`1` → `01`), 더 안전하게 하려면 스프레드시트에서 해당 열의 서식을 `일반 텍스트`로 지정하거나 값 앞에 `'01`처럼 작은따옴표를 붙여 입력하세요.
- `keywords` — 검색 키워드. 여러 개는 `|`(파이프)로 구분. 예: `미세 플라스틱|플라스틱|해양 오염`
- `background_intro`, `background_connection` — A4 자료의 "한 줄 소개"와 "이 지문과의 연결".
- `background_section1_title` ~ `background_section6_title`, `..._body` — 기초 배경지식 항목(최대 6개). 비워두면 그 항목은 자동으로 건너뜁니다.
- `activity_name`, `activity_duration`, `activity_materials`, `activity_purpose`, `activity_bridge`, `activity_caution` — 아이스브레이킹 활동 정보.
- `activity_step1` ~ `activity_step8` — 활동 진행 단계(최대 8단계). 비워두면 자동으로 건너뜁니다.

셀 안에 쉼표(,)나 줄바꿈이 있어도 괜찮습니다 — Google 스프레드시트가 CSV로 내보낼 때 자동으로 처리합니다.

## 3. 웹에 게시하기

1. 스프레드시트 메뉴에서 `파일 > 공유 > 웹에 게시`를 연다.
2. "링크" 탭에서 데이터가 있는 시트를 선택하고, 형식을 **쉼표로 구분된 값(.csv)**으로 지정한다.
3. `게시`를 누르고 생성된 URL을 복사한다. (형식: `https://docs.google.com/spreadsheets/d/e/2PACX-xxxx/pub?output=csv`)

> ⚠️ 웹에 게시하면 URL을 아는 누구나 스프레드시트 내용을 볼 수 있습니다. 민감한 정보는 넣지 마세요.

## 4. 사이트에 연결하기

`sheetConfig.js` 파일을 열어 아래처럼 URL을 붙여넣는다.

```js
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-xxxx/pub?output=csv";
```

저장 후 사이트를 새로고침하면 스프레드시트 내용이 반영됩니다. 이후 스프레드시트만 수정하면 되고, 코드를 다시 배포할 필요가 없습니다.

## 동작 방식 참고

- 사이트는 열리자마자 `data.js`의 로컬 데이터로 먼저 화면을 그린 뒤, 스프레드시트를 백그라운드에서 불러와 성공하면 그 내용으로 교체합니다. 그래서 스프레드시트 응답이 늦거나 실패해도 화면이 비어 보이지 않습니다.
- 불러오기에 실패하면(네트워크 오류, 잘못된 URL 등) 콘솔에 경고만 남기고 로컬 데이터를 계속 보여줍니다.

/*
  sheetConfig.js — Google 스프레드시트 연동 설정

  설정 방법:
  1. Google 스프레드시트를 연다 (열 구성은 sheet-template.csv 참고).
  2. 메뉴에서 "파일 > 공유 > 웹에 게시"를 클릭한다.
  3. "링크" 탭에서 데이터가 있는 시트를 선택하고, 형식을 "쉼표로 구분된 값(.csv)"으로 지정한 뒤 [게시]를 누른다.
  4. 생성된 URL을 아래 SHEET_CSV_URL에 그대로 붙여넣는다.
     예: https://docs.google.com/spreadsheets/d/e/2PACX-xxxxxxxx/pub?output=csv

  주의:
  - "웹에 게시"된 스프레드시트는 URL을 아는 사람이면 누구나 내용을 볼 수 있다. 민감한 정보는 넣지 않는다.
  - SHEET_CSV_URL을 빈 문자열로 두면 스프레드시트 연동 없이 data.js의 기본 데이터만 사용한다.
  - 스프레드시트 내용을 수정한 뒤에는 사이트를 새로고침하면 최신 내용이 반영된다.
*/
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTn4vGTlW7XjC16bYk-ScoEwa5SvDM0cD-pNHawHFID6iFYLKbv4kIsHoHflBBUQFhsbdSP9_wmQXTR/pub?gid=335912978&single=true&output=csv";

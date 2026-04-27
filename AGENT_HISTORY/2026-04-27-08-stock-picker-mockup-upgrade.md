# Stock Picker Mockup Upgrade

## Scope
- Update smart stock recommendation mockup page in front-end chat flow.
- Add richer assistant messages for reasoning and execution call logs.
- Add code expand/collapse capability similar to dual moving-average strategy mockup.

## Files Changed
- front-end/src/app/fakeChatData.ts
- front-end/src/app/components/StockPickerTable.tsx

## Details
1. Enhanced conversation data for task `智能选股推荐`:
- Added a reasoning summary message (`思考过程（摘要）`).
- Added a mock execution call log message (`执行调用日志（mock）`) with pipeline-like steps.
- Kept final recommendation message and stock table output.

2. Enhanced stock picker card UI:
- Added `查看代码 / 隐藏代码` toggle button.
- Added expandable code block showing a mock multi-factor stock selection pipeline.
- Kept existing table and footer unchanged.

## Validation
- Type/script diagnostics checked for changed files.
- No new errors found in:
  - front-end/src/app/fakeChatData.ts
  - front-end/src/app/components/StockPickerTable.tsx

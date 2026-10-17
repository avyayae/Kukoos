# question-kinds

Question renderers (F05). `registry.ts` maps `Question.kind` to a React renderer:
`numeric`, `column`, `tradeBlocks`, `mcq`, `compare`, `trueFalse`.
Renderers display and collect a response. Checking is done by the domain generator's `check()`.

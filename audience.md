# Audience Display Query Params

## Pin 1 Display
`?pin=`

Pin any display so that it will ONLY EVER show that display
#### Options:
- `preview-full`
- `preview-stream`
- `match-full`
- `match-stream`
- `match-min` - score bug without teams
- `match-production` - custom screen for production widgets
- `results-full`
- `results-stream`
- `stats-graphics` - stats/graphics overlay only. Renders fully transparent when there is nothing on air (no placeholder, no spinner, no background) — intended to be opened as its own transparent browser source and layered over the match display in a broadcast switcher, rather than used as a standalone full display.

## OR build a custom flow
`?layout=xyz`

Build a custom flow.  `xyz` represents a 3-character string, where each character will choose what screen displays for the position
- `x` = preview
- `y` = in-match
- `z` = results

#### Options for each character
- `o` = off (hides the step entirely)
- `s` = stream (uses stream view)
- `f` = full (uses full-screen view)
- `m` = min (only avaliable for in-match screen, i.e. position `y`)
- `r` = results (only avaliable for the preview screen, i.e. position `x`) — replaces the
  preview step with the previous match's results, rendered in whatever style position `z`
  selects. Useful for keeping results on the wall right through the next match's preview.

#### Ex.
- `?layout=fff` will show the "Full" screen display for preview, match, and results
- `?layout=sos` will use the stream overlay for preview, show nothing for match, and stream overlay for results
- `?layout=sms` will use the stream overlay for preview, the minimal score bug in-match, and the stream overlay for results
- `?layout=rsf` will show full results in place of the preview, then the stream overlay in-match

#### Invalid values
A `layout` that isn't exactly three characters from the list above — including a bare
`?layout=` with no value — falls back to the default `fsf` rather than rendering a blank
screen. A character that's valid but not supported in that position (`m` in `x` or `z`,
`r` in `y` or `z`) shows nothing for that step, the same as `o`.


#### Other Notes:
`results-full` and `results-stream` show a **NEW HIGH SCORE** banner when the match
just committed set the high score. Details:
- Only on `Ranking` tournament-type matches. Qualification, playoff and practice
  matches never show it.
- The record is scoped **per phase** — qualification-style tournaments share one
  record, playoff-style tournaments share another. A stacked playoff alliance's
  score therefore can't freeze the ranking-round record.
- An alliance with a **disqualification or a red card** can't hold the record.
  Cards are applied when rankings are calculated, not when the match is scored,
  so a red-carded alliance's stored score is still its full raw score.
- Matching the record is not a record — it has to be beaten.
- On `results-full` the banner sits in the record-setting alliance's column,
  between its score box and its team list; the opposing column reserves the same
  height so both team lists stay aligned. On `results-stream` it's a compact
  badge inboard of the `Red`/`Blue` label in the header.
- Backed by `GET /match/high-score/:eventKey/:tournamentKey/:id`, which answers
  for any phase — the ranking-only rule lives in the display.

The "match-production" screen can be customized by setting custom CSS.  To change the styleing of the boxes... use a styling like below:
```css
.production-score-container {
    font-size: 100px !important;
    color: white !important;
}
```


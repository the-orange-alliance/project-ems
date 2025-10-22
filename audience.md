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
- `m` = min (only avaliable for in-match screen)

#### Ex.
- `?layout=fff` will show the "Full" screen display for preview, match, and results
- `?layout=sos` will use the stream overlay for preview, show nothing for match, and stream overlay for results


#### Other Notes:
The "match-production" screen can be customized by setting custom CSS.  To change the styleing of the boxes... use a styling like below:
```css
.production-score-container {
    font-size: 100px !important;
    color: white !important;
}
```


point: "example.com's custom domain was silently shadowing every /api/* route, and the fix was routing around an edge route rule, not the app"
hook: "The like button worked on the preview URL and 404'd on the custom domain."
emotionalCore: "the click of finding an invisible layer between you and your own server"
flare: "the exact curl output that proved it wasn't the app's fault"
targetAudience: "developers running serverless functions behind a CDN custom domain"
targetKeyword: "serverless function custom domain 404"
searchIntent: "informational"
postFormula: "war-story"

paragraphs:
  - order: 1
    topic: "the like button 404s on the custom domain"
    goal: "hook"
    paragraphFormula: "hook"
    audienceNote: "developers who just shipped a serverless function and are confused why prod fails"
    intendedBeat: "the specific, reproducible symptom"
    ourTake: "this smells like a routing problem, not a bug in my code"
    facts: ["/api/like-post 404s on example.com but 200s on the preview URL"]
    sources: []
    keyword: "serverless function custom domain 404"
    links: []
    gateGuidance: "keep this to the raw symptom, no diagnosis yet"
    rendersAsProse: true
  - order: 2
    topic: "false lead: blamed the function code"
    goal: "turn"
    paragraphFormula: "turn"
    audienceNote: "developers"
    intendedBeat: "the wrong assumption that ate an hour"
    ourTake: "I assumed the function itself was broken and rewrote it twice for nothing"
    facts: ["rewrote the handler twice, redeployed twice, same 404 both times"]
    sources: []
    keyword: ""
    links: []
    gateGuidance: "name the specific wrong turn, not just 'I was confused'"
    rendersAsProse: true
  - order: 3
    topic: "the reveal: an edge route rule was shadowing /api/*"
    goal: "turn"
    paragraphFormula: "turn"
    audienceNote: "developers"
    intendedBeat: "the root cause, named plainly"
    ourTake: "the custom domain had its own routing layer in front of the app, invisible from the dashboard"
    facts: ["an edge route rule on the CDN zone matched /api/* before it ever reached the app's functions"]
    sources: []
    keyword: ""
    links: []
    gateGuidance: "this is the load-bearing beat — don't soften it into a summary"
    rendersAsProse: true
  - order: 4
    topic: "the fix"
    goal: "payoff"
    paragraphFormula: "payoff"
    audienceNote: "developers"
    intendedBeat: "concrete relief — the exact change that worked"
    ourTake: "deleting the edge route rule fixed it in under a minute once I knew where to look"
    facts: ["removed the zone-level edge route rule; /api/like-post started 200ing on example.com immediately"]
    sources: []
    keyword: ""
    links: []
    gateGuidance: ""
    rendersAsProse: true
  - order: 5
    topic: "the lesson"
    goal: "context"
    paragraphFormula: "honest-limit"
    audienceNote: "developers"
    intendedBeat: "one honest takeaway, no moral-of-the-story bow"
    ourTake: "a custom domain isn't just DNS — it can carry its own routing rules that silently outrank your app"
    facts: []
    sources: []
    keyword: ""
    links: []
    gateGuidance: "no tidy-bow — end on the specific gotcha, not a life lesson"
    rendersAsProse: true

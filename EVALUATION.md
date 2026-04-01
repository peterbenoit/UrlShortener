
## Smawl — Evaluation

### The Trust Problem (Your Instinct Is Right)

You nailed the diagnosis. Here's why it reads as sketchy:

- **No explanation of what it does with your URL.** Does it redirect? Store it server-side? Expire? There's zero disclosure. Legitimate shorteners (Bitly, TinyURL) lead with how they work.
- **"Links are saved in your browser"** — this is actually a *great* differentiator (privacy-first, no server tracking), but it's buried in a subtitle and reads more like a disclaimer than a feature. Flip that: make it your headline trust signal.
- **No branding personality.** The name "Smawl" is fun, but the page gives it nothing to stand on. No logo, no color, no visual identity. It looks unfinished.
- **No HTTPS/security reassurance.** Even a single line like "We never store your URLs on our servers" changes the vibe entirely.
- **No About or FAQ.** Who made this? What happens to links? Why should I trust a `.vercel.app` domain?

---

### Design

- **Too sparse to feel intentional.** Minimalism works when there's a clear visual hierarchy and deliberate whitespace. Right now it just looks empty.
- **No visual identity** — no logo mark, no color palette with purpose, no typography pairing. It could be any throw-together tool.
- **The "My Links" section with nothing in it** on first load is a dead zone. Even a ghost/placeholder state ("Your shortened links will appear here") would help.
- **Mobile unknown** from the fetch, but the structure suggests it might be fine functionally — just visually bare.
- **Too Dark** - Light websites are often perceived as trustworthy

---

### Accessibility

Can't do a full audit without rendering the live DOM, but a few red flags from the markup pattern:

- Input labels — are those URL inputs properly `<label>`-associated or just placeholders?
- The modal (there's a "Close" in the content) — is focus managed correctly when it opens/closes?
- Color contrast is impossible to judge without the rendered CSS, but sparse designs often have low-contrast helper text.
- Keyboard navigation through the shortener flow should be explicitly tested.

---

### Function

The localStorage-only approach is genuinely smart for a side project — no backend, no privacy concerns. But it creates a UX gap:

- Links die if the user clears storage or switches browsers. That should be surfaced clearly.
- No indication of what the shortened URL will look like before you submit.
- No copy-to-clipboard confirmation feedback visible from the content.
- Custom ID is a nice feature — but what happens on collision? Is that handled gracefully? Will a user know what this means?
- Consider better tracking mechanisms - users may want additional information, fine tuned clicks, referrers, etc.

---

### Quick Wins to Fix the Trust Issue

1. **Add a tagline that leads with the privacy angle.** Something like: *"Private URL shortening. Your links never leave your browser."*
2. **Give it a real visual identity** — even a simple color and a small logomark makes it feel like a real product.
3. **Add a tiny "How it works" section** — three icons/steps max. Paste → Shorten → Share.
4. **Put your name/link more prominently**, not just in the footer. "Built by Peter Benoit" buried at the bottom doesn't help — a linked byline near the top signals accountability.
5. **Empty state in My Links** should have instructional copy, not just silence.

The bones are solid. The privacy-first angle is a genuine selling point. It just needs to *say so* before a user bounces thinking it's a phishing tool.

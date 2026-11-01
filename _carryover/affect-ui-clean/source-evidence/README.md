# Affect UI Clean / Light source evidence

Source: `D:\Program\frontend\affect-ui\affectui-free`. The manifest identifies the source capture and current inventory update dates.

The owner authorized a small portable copy of selected Clean Markdown and Light PNGs. [Manifest](manifest.json) records original relative path, copied relative path, byte count and SHA-256 for each of25 files:8 unchanged raw source snapshots and17 supplied Light PNGs, total1,034,979 bytes excluding this inventory and manifest. The original22 records/assets are unchanged; the three added PNGs are composition-only references (kind: composition-reference-png, usage_scope: reference-only). Source bytes are unchanged. Raw Markdown uses `.md.txt` to distinguish archival source/examples from project specifications; embedded Dark sections, related links, imports, demo code and service examples are not adopted. No Dark image, Classic variant or separate illustration/block/motion-module asset was copied. Composition screenshots do not adopt their sample features, filled icons or gradient avatar.

The [reference contract](../../frontend-flows/affect-ui-clean-light-reference.md) maps exact source lines and values to Dubbed's active flows and documents excluded behavior and necessary accessibility adaptations.

| Direct component family | Registered supplied Light PNGs |
|---|---|
| Button | [Initial](source/components/button/Clean/Light/01-initial.png), [loading](source/components/button/Clean/Light/03-loading.png) |
| Filter menu | [Initial](source/components/filter-menu/Clean/Light/01-initial.png), [selected](source/components/filter-menu/Clean/Light/02-selected-filters.png) |
| Profile menu | [Initial](source/components/profile-menu/Clean/Light/01-initial.png) |
| Segmented control | [Initial](source/components/segmented-control/Clean/Light/01-initial.png), [changed](source/components/segmented-control/Clean/Light/02-dashboard-changed.png) |
| Progress tracker | [Initial](source/components/progress-tracker/Clean/Light/01-initial.png), [progress changed](source/components/progress-tracker/Clean/Light/03-progress-updated.png) |
| Notification stack | [Initial](source/components/notification-stack/Clean/Light/01-initial.png) |
| OTP input | [Initial](source/components/otp-input/Clean/Light/01-initial.png), [invalid](source/components/otp-input/Clean/Light/03-invalid-code.png), [verified](source/components/otp-input/Clean/Light/04-verified.png) |
| Thinking loader | [Initial](source/components/thinking-loader/Clean/Light/01-initial.png) |

Composition-only references, not new direct component families:

| Reference | Supplied Light PNG |
|---|---|
| Decision inbox | [Initial](source/components/decision-inbox/Clean/Light/01-initial.png) |
| Email draft | [Initial](source/components/email-draft/Clean/Light/01-initial.png) |
| Comment thread | [Initial](source/components/comment-thread/Clean/Light/01-initial.png) |

The catalog's [Start here](../../frontend-flows/affect-ui-clean-light-reference.md#start-here) entry shows the six selected images opened for this guidance: BTN, PRO, invalid OTP and these three composition examples. Exact recipes come from matching selected Clean CSS, not values guessed from screenshots. The extra examples guide context/actions/long-text hierarchy only; their whole features, data and partial form controls are not automatic product or accessibility contracts.

Visual findings: supplied screenshots show dark primary actions, white secondary controls, neutral translucent ink, soft hairline-shadow edges, differentiated control/card corners, blue selected/progress marks and pale-red destructive/invalid treatments. Code gives exact CSS dimensions and animation declarations; screenshot scaling/canvas size does not. The source's surrounding showcase cards, email/demo-code footer, sample navigation, invitation content, profile-setup task and notification art are not Dubbed requirements.

Verification scope: byte/hash/source comparisons cover all25 portable entries; the six Start here PNGs were opened for the current guidance, and matching BTN/PRO/OTP Clean CSS was read. The unchanged direct-family source set remains registered above. Static source/contrast evidence is separate from rendered product verification. No application/runtime/browser execution, temporal motion observation, mobile/device test, screen-reader check, real-service/payment/media verification or product acceptance is claimed.

Reproduction checks use a PowerShell here-string piped to `python -`: read `manifest.json`, recompute `hashlib.sha256` for each copied file, compare copied bytes to the original source, then check local Markdown link targets, UTF-8 replacement characters and final newlines in the maintained catalog/inventory. Result:25/25 hashes and byte comparisons pass; no broken authored links or replacement characters; both maintained files end in newlines. Contrast computation used `round(backing_channel * (1 - alpha) + source_channel * alpha)`, standard sRGB transfer, luminance weights0.2126/0.7152/0.0722 and `(Llighter + 0.05) / (Ldarker + 0.05)`. It rejected `#d12e34` over the source hover tint and supports the separately named `#c1262c` readable-label adaptation on the checked backings. These checks concern the local source/document boundary only.

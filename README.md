Masonry Layout System – Lightbox & Related Posts (WIP Notes)

Overview
- Single lightbox per masonry container. Related grid is layout-only and delegates clicks back to the main lightbox.
- Identity-based exclusion for related posts: prefer slug (data-masonry-slug-value) else internal UID (data-masonry-item-id). UIDs are auto-assigned; no user config required.

Behavior
- Opening an item sets a view=<prefix>/<slug> query param when slugging is enabled.
- Clicking a related post while the lightbox is open switches the content in-place (no close/reopen).
- History behavior: first open pushes a new entry; switching items replaces the current entry to avoid needing multiple closes.

Opt-in features
- To enable a separate lightbox on the cloned related grid (not recommended by default), set `data-masonry-related-lightbox="true"` on the source container.

Integration notes
- You do not need to add slugs for related-posts to work. If you add slugs, deep-linking/back-forward will work using the configured `SLUG_CONFIG.slugQueryParam` (default: `view`).
- Ensure related clones do not include close controls if you want the whole card to delegate to the main lightbox.

Events (bubbling contract forthcoming)
- Lightbox emits: `masonry:lightboxBeforeOpen`, `masonry:lightboxOpen`, `masonry:lightboxBeforeClose`, `masonry:lightboxClose`.
- Related-posts emits: `masonry:relatedPostsBeforePopulate`, `masonry:relatedPostsAfterPopulate`.

Roadmap
- Phase 2: identity helpers + bubbled events including identity payloads.
- Phase 3: per-container controller that exposes openByUid/openBySlug and centralizes coordination.



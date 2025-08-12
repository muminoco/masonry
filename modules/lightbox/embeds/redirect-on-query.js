/**
 * Lightweight redirect embed for Webflow
 *
 * Behavior:
 * - If the current URL contains the configured query parameter (default: "itemSlug"),
 *   redirect to "/<prefix>/<slug>" (built from the parameter's value), preserving origin.
 * - Example: https://site.com/some-page?itemSlug=curation%2F12345 → https://site.com/curation/12345
 * - Handles URL decoding and safely encodes each path segment in the redirect target.
 *
 * Usage in Webflow:
 * - Project Settings → Custom Code → Inside <head> tag, or per-page Settings → Inside <head> tag.
 * - Paste the contents of this file inside a <script>...</script> tag.
 * - To avoid page flash, prefer placing it in the <head>.
 *
 * IMPORTANT: Keep PARAM_NAME in sync with modules/lightbox/config.js → SLUG_CONFIG.slugQueryParam.
 */
(function () {
  try {
    var PARAM_NAME = 'itemSlug';

    // If you changed SLUG_CONFIG.slugQueryParam in your project, update PARAM_NAME to match.

    var currentUrl = new URL(window.location.href);
    var combined = currentUrl.searchParams.get(PARAM_NAME);
    if (!combined) return;

    var value = String(combined).trim();
    if (!value) return;

    // URLSearchParams.get() already decodes percent-encoding. Normalize into safe path segments.
    var segments = value
      .split('/')
      .filter(function (s) { return s && s.length > 0; })
      .map(function (s) { return encodeURIComponent(s); });

    if (segments.length === 0) return;

    var target = currentUrl.origin + '/' + segments.join('/');

    // Avoid redirect if we're already at the target path
    var currentAtTarget = (currentUrl.origin + currentUrl.pathname).replace(/\/$/, '') === target.replace(/\/$/, '');
    if (currentAtTarget) return;

    // Replace so the back button goes to the true referrer rather than the query version
    window.location.replace(target);
  } catch (e) {
    if (typeof console !== 'undefined' && console && console.warn) {
      console.warn('Redirect-on-query embed failed:', e);
    }
  }
})();



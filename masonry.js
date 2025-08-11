import { autoInit } from './core/masonry-logic.js';
import { SlugManager } from './modules/lightbox/slugs.js';
import lightboxPlugin from './modules/lightbox/lightbox.js';
import relatedPostsPlugin from './modules/lightbox/related-posts.js';

// Auto-initialize masonry and add plugins
const masonryInstances = autoInit();

masonryInstances.forEach(masonry => {
  // Add lightbox plugin
  masonry.use(lightboxPlugin, {
    escapeKey: true,
    backdrop: true,
    animationDuration: 300
  });
  
  // Add related posts plugin
  masonry.use(relatedPostsPlugin, {
    maxItems: 12, // Optional: override default
    excludeCurrent: true // Optional: override default
  });
});

// Seed refresh→back support once per page load (safe if no breadcrumb exists)
try {
  SlugManager.seedRefreshBackSupport();
} catch (e) {
  console.warn('Masonry: Slug refresh/back bootstrap skipped:', e);
}
import { autoInit } from './core/masonry.js';
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
import { autoInit } from './core/masonry.js';
import lightboxPlugin from './modules/lightbox.js';

// Auto-initialize masonry and add lightbox
const masonryInstances = autoInit();
masonryInstances.forEach(masonry => {
  masonry.use(lightboxPlugin, {
    escapeKey: true,
    backdrop: true,
    animationDuration: 300
  });
});
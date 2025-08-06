/**
 * Lightbox Module Configuration
 * 
 * This file contains all configuration values for the lightbox module,
 * including both the lightbox plugin and related posts plugin.
 */

// Lightbox Configuration
export const LIGHTBOX_CONFIG = {
  // Attribute names
  lightboxAttribute: 'lightbox',
  contentTargetAttribute: 'content-target',
  closeAttribute: 'close',
  
  // CSS classes
  openClass: 'is-open',
  inLightboxClass: 'is-in-lightbox',
  bodyOpenClass: 'lightbox-open',
};

// Related Posts Configuration
export const RELATED_POSTS_CONFIG = {
  // Attribute names
  enabledAttribute: 'true',
  targetAttribute: 'target',
  sourceAttribute: 'source',
  filterAttribute: 'filter',
  filterPrefixAttribute: 'filter-',
  maxItemsAttribute: 'max',
  excludeCurrentAttribute: 'exclude-current',
  noResultsAttribute: 'no-results',
  
  // Default values
  maxItems: null, // No limit by default
  excludeCurrent: true,
  noResultsSelector: null,
  
  // CSS classes
  relatedContainerClass: 'is-related-container',
  relatedItemClass: 'is-related-post',
  noResultsVisibleClass: 'is-visible'
};

// Default configuration objects for backward compatibility
export const DEFAULT_LIGHTBOX_CONFIG = LIGHTBOX_CONFIG;
export const DEFAULT_RELATED_CONFIG = RELATED_POSTS_CONFIG; 
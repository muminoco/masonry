// core/config.js
export const DEFAULT_CONFIG = {
    itemSelector: ':scope > *', // All direct children
    transitionDuration: 300,
    // Auto-initialization selector configuration
    autoInitAttribute: 'data-masonry',
    autoInitValue: 'grid'
  };
  
  // Default CSS property values (used as fallback)
  export const DEFAULT_CSS_PROPERTIES = {
    // Desktop configuration
    '--masonry-desktop-min-width': '15rem',
    '--masonry-desktop-columns': '', // Optional
    '--masonry-desktop-gap-x': '1.25rem',
    '--masonry-desktop-gap-y': '1.25rem',
    
    // Tablet configuration
    '--masonry-tablet-columns': '2',
    '--masonry-tablet-min-width': '', // Optional
    '--masonry-tablet-gap-x': '1.25rem',
    '--masonry-tablet-gap-y': '1.25rem',
    
    // Mobile landscape configuration
    '--masonry-mobile-landscape-columns': '2',
    '--masonry-mobile-landscape-min-width': '', // Optional
    '--masonry-mobile-landscape-gap-x': '1.25rem',
    '--masonry-mobile-landscape-gap-y': '1.25rem',
    
    // Mobile portrait configuration
    '--masonry-mobile-portrait-columns': '2',
    '--masonry-mobile-portrait-min-width': '', // Optional
    '--masonry-mobile-portrait-gap-x': '1.25rem',
    '--masonry-mobile-portrait-gap-y': '1.25rem',
    
    // Legacy gap properties (fallback)
    '--masonry-gap-x': '1.25rem',
    '--masonry-gap-y': '1.25rem',
    
    // Custom breakpoint overrides (optional)
    '--masonry-breakpoint-tablet': '991px',
    '--masonry-breakpoint-mobile-landscape': '767px',
    '--masonry-breakpoint-mobile-portrait': '479px'
  };
  
  // Default breakpoints (matching Webflow defaults)
  export const DEFAULT_BREAKPOINTS = {
    'mobile-portrait': { max: 479 },
    'mobile-landscape': { min: 480, max: 767 },
    'tablet': { min: 768, max: 991 },
    'desktop': { min: 992 }
  };
  
  // Breakpoint class names
  export const BREAKPOINT_CLASSES = ['mobile-portrait', 'mobile-landscape', 'tablet', 'desktop'];
  
  // Default state structure
  export const DEFAULT_STATE = {
    isInitialized: false,
    isLayoutInProgress: false,
    columns: [],
    items: [],
    containerWidth: 0,
    columnMinWidth: 0,
    actualColumnWidth: 0,
    actualColumns: 0,
    gapX: 0,
    gapY: 0,
    currentBreakpoint: null
  };
  
  // Available hook names
  export const HOOK_NAMES = [
    'beforeInit',
    'afterInit',
    'beforeLayout',
    'afterLayout',
    'beforeDestroy',
    'afterDestroy'
  ];
  
  // CSS class names used by the system
  export const CSS_CLASSES = {
    itemPositioned: 'masonry_item-positioned',
    breakpointPrefix: 'masonry_'
  };
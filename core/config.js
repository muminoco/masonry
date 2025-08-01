// core/config.js
export const DEFAULT_CONFIG = {
    itemSelector: ':scope > *', // All direct children
    transitionDuration: 300
  };
  
  // Default CSS property values (used as fallback)
  export const DEFAULT_CSS_PROPERTIES = {
    '--masonry-desktop-min-width': '15rem',
    '--masonry-desktop-columns': '', // Optional: for constrained containers
    '--masonry-gap-x': '1.25rem',
    '--masonry-gap-y': '1.25rem',
    '--masonry-tablet-columns': '3',
    '--masonry-mobile-landscape-columns': '2',
    '--masonry-mobile-portrait-columns': '2'
  };
  
  // Standard breakpoints (matching Webflow defaults)
  export const BREAKPOINTS = {
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
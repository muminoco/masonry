// core/utils.js
import { DEFAULT_CSS_PROPERTIES, DEFAULT_BREAKPOINTS } from './config.js';

/**
 * Get CSS custom property value with fallback
 */
export function getCSSProperty(container, property, fallback = null) {
  const computedStyle = getComputedStyle(container);
  let value = computedStyle.getPropertyValue(property).trim();
  
  if (!value && fallback) {
    value = DEFAULT_CSS_PROPERTIES[property] || fallback;
    
    // Log missing property for user awareness
    console.info(`Masonry: Using default value "${value}" for ${property}. Consider setting this in your CSS.`);
  }
  
  return value;
}

/**
 * Convert CSS unit values to pixels
 */
export function convertToPixels(value, property = '') {
  if (!value) return 0;
  
  // Already in pixels
  if (value.endsWith('px')) {
    return parseFloat(value);
  }
  
  // Convert rem to pixels
  if (value.endsWith('rem')) {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return parseFloat(value) * rootFontSize;
  }
  
  // Convert em to pixels (relative to container font size)
  if (value.endsWith('em')) {
    const containerFontSize = parseFloat(getComputedStyle(document.container).fontSize);
    return parseFloat(value) * containerFontSize;
  }
  
  // Unitless value (assume pixels for gaps, columns for column counts)
  const numericValue = parseFloat(value);
  if (!isNaN(numericValue)) {
    if (property.includes('gap') || property.includes('width')) {
      console.warn(`Masonry: Unitless value "${value}" for ${property}. Assuming pixels. Please specify units (px, rem, or em).`);
      return numericValue;
    }
    return numericValue;
  }
  
  console.error(`Masonry: Invalid CSS value "${value}" for ${property}`);
  return 0;
}

/**
 * Get custom breakpoints from CSS properties or use defaults
 */
export function getCustomBreakpoints(container) {
  const tabletBreakpoint = getCSSProperty(container, '--masonry-breakpoint-tablet');
  const mobileLandscapeBreakpoint = getCSSProperty(container, '--masonry-breakpoint-mobile-landscape');
  const mobilePortraitBreakpoint = getCSSProperty(container, '--masonry-breakpoint-mobile-portrait');
  
  const breakpoints = { ...DEFAULT_BREAKPOINTS };
  
  // Override with custom breakpoints if provided
  if (tabletBreakpoint) {
    const tabletMax = convertToPixels(tabletBreakpoint, '--masonry-breakpoint-tablet');
    breakpoints.tablet.max = tabletMax;
    breakpoints.desktop.min = tabletMax + 1;
  }
  
  if (mobileLandscapeBreakpoint) {
    const mobileLandscapeMax = convertToPixels(mobileLandscapeBreakpoint, '--masonry-breakpoint-mobile-landscape');
    breakpoints['mobile-landscape'].max = mobileLandscapeMax;
    breakpoints.tablet.min = mobileLandscapeMax + 1;
  }
  
  if (mobilePortraitBreakpoint) {
    const mobilePortraitMax = convertToPixels(mobilePortraitBreakpoint, '--masonry-breakpoint-mobile-portrait');
    breakpoints['mobile-portrait'].max = mobilePortraitMax;
    breakpoints['mobile-landscape'].min = mobilePortraitMax + 1;
  }
  
  return breakpoints;
}

/**
 * Determine current breakpoint based on window width and custom breakpoints
 */
export function getCurrentBreakpoint(container = null) {
  const width = window.innerWidth;
  
  // Use custom breakpoints if container is provided, otherwise use defaults
  const breakpoints = container ? getCustomBreakpoints(container) : DEFAULT_BREAKPOINTS;
  
  if (width <= breakpoints['mobile-portrait'].max) return 'mobile-portrait';
  if (width <= breakpoints['mobile-landscape'].max) return 'mobile-landscape';
  if (width <= breakpoints.tablet.max) return 'tablet';
  return 'desktop';
}

/**
 * Get breakpoint configuration with enhanced per-breakpoint controls
 */
export function getBreakpointConfig(container) {
  const breakpoint = getCurrentBreakpoint(container);
  
  let config = {};
  
  // Get desktop configuration
  const desktopMinWidth = getCSSProperty(container, '--masonry-desktop-min-width');
  const desktopColumns = getCSSProperty(container, '--masonry-desktop-columns');
  
  // Column configuration with enhanced breakpoint-specific controls
  if (breakpoint === 'desktop') {
    const hasMinWidth = desktopMinWidth && convertToPixels(desktopMinWidth);
    const hasColumns = desktopColumns && parseInt(desktopColumns);
    
    // Check for conflicting configuration
    if (hasMinWidth && hasColumns) {
      console.warn('🧱 Masonry: Both --masonry-desktop-min-width and --masonry-desktop-columns are specified. Using min-width approach and ignoring columns. Remove one property to avoid this warning.');
    }
    
    if (hasMinWidth) {
      // Min-width takes precedence
      config.useMinWidth = true;
      config.columnMinWidth = convertToPixels(desktopMinWidth, '--masonry-desktop-min-width');
      console.log('🧱 Masonry: Using desktop min-width mode:', config.columnMinWidth + 'px');
    } else if (hasColumns) {
      // Use columns only if no min-width specified
      config.columns = parseInt(desktopColumns);
      config.useMinWidth = false;
      console.log('🧱 Masonry: Using desktop columns mode:', config.columns);
    } else {
      // Default fallback
      config.useMinWidth = true;
      config.columnMinWidth = convertToPixels('20rem', '--masonry-desktop-min-width');
      console.log('🧱 Masonry: Using default desktop min-width mode:', config.columnMinWidth + 'px');
    }
  } else {
    // Enhanced breakpoint-specific configuration with conflict resolution
    const breakpointMinWidth = getCSSProperty(container, `--masonry-${breakpoint}-min-width`);
    const breakpointColumns = getCSSProperty(container, `--masonry-${breakpoint}-columns`);
    
    const hasMinWidth = breakpointMinWidth && convertToPixels(breakpointMinWidth);
    const hasColumns = breakpointColumns && parseInt(breakpointColumns);
    
    // Check for conflicting configuration
    if (hasMinWidth && hasColumns) {
      console.warn(`🧱 Masonry: Both --masonry-${breakpoint}-min-width and --masonry-${breakpoint}-columns are specified. Using min-width approach and ignoring columns. Remove one property to avoid this warning.`);
    }
    
    if (hasMinWidth) {
      // Min-width takes precedence
      config.useMinWidth = true;
      config.columnMinWidth = convertToPixels(breakpointMinWidth, `--masonry-${breakpoint}-min-width`);
      console.log(`🧱 Masonry: Using ${breakpoint} min-width mode:`, config.columnMinWidth + 'px');
    } else {
      // Use column count approach with proper cascading fallback
      let columns;
      switch (breakpoint) {
        case 'tablet':
          columns = parseInt(breakpointColumns) || parseInt(getCSSProperty(container, '--masonry-tablet-columns')) || 
                   parseInt(getCSSProperty(container, '--masonry-mobile-landscape-columns')) || 
                   parseInt(getCSSProperty(container, '--masonry-mobile-portrait-columns')) || 2;
          break;
        case 'mobile-landscape':
          columns = parseInt(breakpointColumns) || parseInt(getCSSProperty(container, '--masonry-mobile-landscape-columns')) || 
                   parseInt(getCSSProperty(container, '--masonry-tablet-columns')) || 
                   parseInt(getCSSProperty(container, '--masonry-mobile-portrait-columns')) || 2;
          break;
        case 'mobile-portrait':
          columns = parseInt(breakpointColumns) || parseInt(getCSSProperty(container, '--masonry-mobile-portrait-columns')) || 
                   parseInt(getCSSProperty(container, '--masonry-mobile-landscape-columns')) || 
                   parseInt(getCSSProperty(container, '--masonry-tablet-columns')) || 1;
          break;
      }
      
      config.columns = columns;
      config.useMinWidth = false;
    }
  }
  
  // Enhanced gap configuration with proper cascading
  const breakpointGapX = getCSSProperty(container, `--masonry-${breakpoint}-gap-x`);
  const breakpointGapY = getCSSProperty(container, `--masonry-${breakpoint}-gap-y`);
  
  // Cascade from larger to smaller breakpoints for gaps
  let gapX, gapY;
  switch (breakpoint) {
    case 'desktop':
      gapX = breakpointGapX || getCSSProperty(container, '--masonry-desktop-gap-x') || getCSSProperty(container, '--masonry-gap-x');
      gapY = breakpointGapY || getCSSProperty(container, '--masonry-desktop-gap-y') || getCSSProperty(container, '--masonry-gap-y');
      break;
    case 'tablet':
      gapX = breakpointGapX || getCSSProperty(container, '--masonry-tablet-gap-x') || 
             getCSSProperty(container, '--masonry-desktop-gap-x') || getCSSProperty(container, '--masonry-gap-x');
      gapY = breakpointGapY || getCSSProperty(container, '--masonry-tablet-gap-y') || 
             getCSSProperty(container, '--masonry-desktop-gap-y') || getCSSProperty(container, '--masonry-gap-y');
      break;
    case 'mobile-landscape':
      gapX = breakpointGapX || getCSSProperty(container, '--masonry-mobile-landscape-gap-x') || 
             getCSSProperty(container, '--masonry-tablet-gap-x') || getCSSProperty(container, '--masonry-desktop-gap-x') || 
             getCSSProperty(container, '--masonry-gap-x');
      gapY = breakpointGapY || getCSSProperty(container, '--masonry-mobile-landscape-gap-y') || 
             getCSSProperty(container, '--masonry-tablet-gap-y') || getCSSProperty(container, '--masonry-desktop-gap-y') || 
             getCSSProperty(container, '--masonry-gap-y');
      break;
    case 'mobile-portrait':
      gapX = breakpointGapX || getCSSProperty(container, '--masonry-mobile-portrait-gap-x') || 
             getCSSProperty(container, '--masonry-mobile-landscape-gap-x') || getCSSProperty(container, '--masonry-tablet-gap-x') || 
             getCSSProperty(container, '--masonry-desktop-gap-x') || getCSSProperty(container, '--masonry-gap-x');
      gapY = breakpointGapY || getCSSProperty(container, '--masonry-mobile-portrait-gap-y') || 
             getCSSProperty(container, '--masonry-mobile-landscape-gap-y') || getCSSProperty(container, '--masonry-tablet-gap-y') || 
             getCSSProperty(container, '--masonry-desktop-gap-y') || getCSSProperty(container, '--masonry-gap-y');
      break;
  }
  
  config.gapX = convertToPixels(gapX, '--masonry-gap-x');
  config.gapY = convertToPixels(gapY, '--masonry-gap-y');
  config.breakpoint = breakpoint;
  
  return config;
}

/**
 * Apply default CSS properties if missing
 */
export function applyDefaultStyles(container) {
  const computedStyle = getComputedStyle(container);
  let hasCustomProperties = false;
  
  // Check if any custom properties are set
  Object.keys(DEFAULT_CSS_PROPERTIES).forEach(property => {
    if (computedStyle.getPropertyValue(property).trim()) {
      hasCustomProperties = true;
    }
  });
  
  // If no custom properties found, log helpful message
  if (!hasCustomProperties) {
    console.group('📐 Masonry CSS Properties Missing');
    console.info('No masonry CSS custom properties detected. Using defaults:');
    Object.entries(DEFAULT_CSS_PROPERTIES).forEach(([prop, value]) => {
      console.info(`${prop}: ${value}`);
    });
    console.info('💡 Add these properties to your CSS for full control:');
    console.info(`
[data-masonry="grid"] {
  --masonry-desktop-min-width: 20rem;
  --masonry-desktop-gap-x: 1.25rem;
  --masonry-desktop-gap-y: 1.25rem;
  --masonry-tablet-columns: 2;
  --masonry-mobile-landscape-columns: 2;
  --masonry-mobile-portrait-columns: 1;
}`);
    console.groupEnd();
  }
}

/**
 * Update CSS classes on container for breakpoint targeting
 */
export function updateBreakpointClasses(container, currentBreakpoint) {
  const breakpoints = ['mobile-portrait', 'mobile-landscape', 'tablet', 'desktop'];
  
  // Remove old breakpoint classes
  breakpoints.forEach(bp => {
    container.classList.remove(`masonry_${bp}`);
  });
  
  // Add current breakpoint class
  if (currentBreakpoint) {
    const className = `masonry_${currentBreakpoint}`;
    container.classList.add(className);
  }
}

/**
 * Setup media load listeners for an item
 */
export function setupMediaListeners(item, handleItemLoad) {
  const media = item.querySelectorAll('img, video');
  media.forEach(element => {
    if (element.tagName === 'IMG' && !element.complete) {
      element.addEventListener('load', handleItemLoad);
      element.addEventListener('error', handleItemLoad);
    } else if (element.tagName === 'VIDEO') {
      element.addEventListener('loadedmetadata', handleItemLoad);
    }
  });
}

/**
 * Remove media load listeners for an item
 */
export function removeMediaListeners(item, handleItemLoad) {
  const media = item.querySelectorAll('img, video');
  media.forEach(element => {
    element.removeEventListener('load', handleItemLoad);
    element.removeEventListener('error', handleItemLoad);
    element.removeEventListener('loadedmetadata', handleItemLoad);
  });
}

/**
 * Reset item styles to their default state
 */
export function resetItemStyles(item) {
  item.style.position = '';
  item.style.left = '';
  item.style.top = '';
  item.style.width = '';
  item.style.height = '';
  item.classList.remove('masonry_item-positioned');
}

/**
 * Get container element from string selector or element
 */
export function getContainer(container) {
  const element = typeof container === 'string' 
    ? document.querySelector(container) 
    : container;
    
  if (!element) {
    console.error('🧱 Masonry: Container not found:', container);
    throw new Error('Masonry container not found');
  }
  
  console.log('🧱 Masonry: Container found:', element);
  return element;
}
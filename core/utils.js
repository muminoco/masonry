// core/utils.js
import { DEFAULT_CSS_PROPERTIES, BREAKPOINTS } from './config.js';

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
 * Determine current breakpoint based on window width
 */
export function getCurrentBreakpoint() {
  const width = window.innerWidth;
  
  if (width <= 479) return 'mobile-portrait';
  if (width <= 767) return 'mobile-landscape';
  if (width <= 991) return 'tablet';
  return 'desktop';
}

/**
 * Get breakpoint configuration with min-width vs column count detection
 */
export function getBreakpointConfig(container) {
  const breakpoint = getCurrentBreakpoint();
  
  let config = {};
  
  // Get values with cascading fallback
  const desktopMinWidth = getCSSProperty(container, '--masonry-desktop-min-width');
  const desktopColumns = getCSSProperty(container, '--masonry-desktop-columns');
  const gapX = getCSSProperty(container, '--masonry-gap-x');
  const gapY = getCSSProperty(container, '--masonry-gap-y');
  
  // Column configuration with cascading
  let columns;
  if (breakpoint === 'desktop') {
    // Check if user specified desktop columns (for constrained containers)
    if (desktopColumns && parseInt(desktopColumns)) {
      config.columns = parseInt(desktopColumns);
      config.useMinWidth = false;
      console.log('🧱 Masonry: Using desktop columns mode:', config.columns);
    } else {
      // Desktop uses min-width-based calculation
      config.useMinWidth = true;
      config.columnMinWidth = convertToPixels(desktopMinWidth, '--masonry-desktop-min-width');
      console.log('🧱 Masonry: Using desktop min-width mode:', config.columnMinWidth + 'px');
    }
  } else {
    // Mobile/tablet use column counts with cascading
    const tabletColumns = getCSSProperty(container, '--masonry-tablet-columns');
    const mobileLandscapeColumns = getCSSProperty(container, '--masonry-mobile-landscape-columns');
    const mobilePortraitColumns = getCSSProperty(container, '--masonry-mobile-portrait-columns');
    
    switch (breakpoint) {
      case 'tablet':
        columns = parseInt(tabletColumns) || parseInt(mobileLandscapeColumns) || parseInt(mobilePortraitColumns) || 2;
        break;
      case 'mobile-landscape':
        columns = parseInt(mobileLandscapeColumns) || parseInt(tabletColumns) || parseInt(mobilePortraitColumns) || 2;
        break;
      case 'mobile-portrait':
        columns = parseInt(mobilePortraitColumns) || parseInt(mobileLandscapeColumns) || parseInt(tabletColumns) || 1;
        break;
    }
    
    config.columns = columns;
    config.useMinWidth = false;
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
.masonry-container {
  --masonry-desktop-min-width: 20rem;
  --masonry-gap-x: 1.25rem;
  --masonry-gap-y: 1.25rem;
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
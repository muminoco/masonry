// core/masonry.js
class MasonryLayout {
  constructor(container, options = {}) {
    console.log('🧱 Masonry: Creating new instance...', { container, options });
    
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!this.container) {
      console.error('🧱 Masonry: Container not found:', container);
      throw new Error('Masonry container not found');
    }
    
    console.log('🧱 Masonry: Container found:', this.container);

    // Check for required data attribute
    if (!this.container.dataset.masonry && this.container.getAttribute('data-masonry') === null) {
      console.warn('🧱 Masonry: Container should have data-masonry attribute for best results');
    }

    // Default configuration (will be overridden by CSS properties)
    this.config = {
      itemSelector: ':scope > *', // All direct children
      transitionDuration: 300,
      ...options
    };

    // Default CSS property values (used as fallback)
    this.defaults = {
      '--masonry-desktop-width': '20rem',
      '--masonry-desktop-columns': '', // Optional: for constrained containers
      '--masonry-gap-x': '1.25rem', // 20px equivalent
      '--masonry-gap-y': '1.25rem', // 20px equivalent
      '--masonry-tablet-columns': '2',
      '--masonry-mobile-landscape-columns': '2',
      '--masonry-mobile-portrait-columns': '2'
    };

    // State management
    this.state = {
      isInitialized: false,
      isLayoutInProgress: false,
      columns: [],
      items: [],
      containerWidth: 0,
      columnWidth: 0,
      actualColumns: 0,
      gapX: 0,
      gapY: 0,
      currentBreakpoint: null
    };

    // Event handlers (bound for proper context)
    this.handleResize = this.handleResize.bind(this);
    this.handleItemLoad = this.handleItemLoad.bind(this);

    // Plugin system for extensibility
    this.plugins = new Map();
    this.hooks = {
      beforeInit: [],
      afterInit: [],
      beforeLayout: [],
      afterLayout: [],
      beforeDestroy: [],
      afterDestroy: []
    };

    this.init();
  }

  /**
   * Get CSS custom property value with fallback
   */
  getCSSProperty(property, fallback = null) {
    const computedStyle = getComputedStyle(this.container);
    let value = computedStyle.getPropertyValue(property).trim();
    
    if (!value && fallback) {
      value = this.defaults[property] || fallback;
      
      // Log missing property for user awareness
      console.info(`Masonry: Using default value "${value}" for ${property}. Consider setting this in your CSS.`);
    }
    
    return value;
  }

  /**
   * Convert CSS unit values to pixels
   */
  convertToPixels(value, property = '') {
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
      const containerFontSize = parseFloat(getComputedStyle(this.container).fontSize);
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
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    // Standard breakpoints
    if (width <= 479) return 'mobile-portrait';
    if (width <= 767) return 'mobile-landscape';
    if (width <= 991) return 'tablet';
    return 'desktop';
  }

  /**
   * Get breakpoint configuration with container vs width detection
   */
  getBreakpointConfig() {
    const breakpoint = this.getCurrentBreakpoint();
    this.state.currentBreakpoint = breakpoint;
    
    let config = {};
    
    // Get values with cascading fallback
    const desktopWidth = this.getCSSProperty('--masonry-desktop-width');
    const desktopColumns = this.getCSSProperty('--masonry-desktop-columns');
    const gapX = this.getCSSProperty('--masonry-gap-x');
    const gapY = this.getCSSProperty('--masonry-gap-y');
    
    // Column configuration with cascading
    let columns;
    if (breakpoint === 'desktop') {
      // Check if user specified desktop columns (for constrained containers)
      if (desktopColumns && parseInt(desktopColumns)) {
        config.columns = parseInt(desktopColumns);
        console.log('🧱 Masonry: Using desktop columns mode:', config.columns);
      } else {
        // Desktop uses width-based calculation
        config.useWidth = true;
        config.columnWidth = this.convertToPixels(desktopWidth, '--masonry-desktop-width');
        console.log('🧱 Masonry: Using desktop width mode:', config.columnWidth + 'px');
      }
    } else {
      // Mobile/tablet use column counts with cascading
      const tabletColumns = this.getCSSProperty('--masonry-tablet-columns');
      const mobileLandscapeColumns = this.getCSSProperty('--masonry-mobile-landscape-columns');
      const mobilePortraitColumns = this.getCSSProperty('--masonry-mobile-portrait-columns');
      
      switch (breakpoint) {
        case 'tablet':
          columns = parseInt(tabletColumns) || parseInt(mobileLandscapeColumns) || parseInt(mobilePortraitColumns) || 2;
          break;
        case 'mobile-landscape':
          columns = parseInt(mobileLandscapeColumns) || parseInt(tabletColumns) || parseInt(mobilePortraitColumns) || 2;
          break;
        case 'mobile-portrait':
          columns = parseInt(mobilePortraitColumns) || parseInt(mobileLandscapeColumns) || parseInt(tabletColumns) || 2;
          break;
      }
      
      config.columns = columns;
    }
    
    config.gapX = this.convertToPixels(gapX, '--masonry-gap-x');
    config.gapY = this.convertToPixels(gapY, '--masonry-gap-y');
    
    return config;
  }

  /**
   * Initialize the masonry layout
   */
  async init() {
    try {
      await this.runHooks('beforeInit');
      
      this.setupContainer();
      this.getItems();
      this.calculateDimensions();
      this.setupEventListeners();
      
      await this.layout();
      
      this.state.isInitialized = true;
      await this.runHooks('afterInit');
      
      // Dispatch custom event
      this.container.dispatchEvent(new CustomEvent('masonry:initialized', {
        detail: { instance: this }
      }));
      
    } catch (error) {
      console.error('Masonry initialization failed:', error);
      throw error;
    }
  }

  /**
   * Apply default CSS properties if missing
   */
  applyDefaultStyles() {
    const computedStyle = getComputedStyle(this.container);
    let hasCustomProperties = false;
    
    // Check if any custom properties are set
    Object.keys(this.defaults).forEach(property => {
      if (computedStyle.getPropertyValue(property).trim()) {
        hasCustomProperties = true;
      }
    });
    
    // If no custom properties found, log helpful message
    if (!hasCustomProperties) {
      console.group('📐 Masonry CSS Properties Missing');
      console.info('No masonry CSS custom properties detected. Using defaults:');
      Object.entries(this.defaults).forEach(([prop, value]) => {
        console.info(`${prop}: ${value}`);
      });
      console.info('💡 Add these properties to your CSS for full control:');
      console.info(`
.masonry-container {
  --masonry-desktop-width: 20rem;
  --masonry-gap-x: 1.25rem;
  --masonry-gap-y: 1.25rem;
  --masonry-tablet-columns: 2;
  --masonry-mobile-landscape-columns: 2;
  --masonry-mobile-portrait-columns: 2;
}`);
      console.groupEnd();
    }
  }

  /**
   * Setup container styles and properties
   */
  setupContainer() {
    this.container.style.position = 'relative';
    this.applyDefaultStyles();
  }

  /**
   * Get all masonry items (all direct children)
   */
  getItems() {
    this.state.items = Array.from(this.container.children);
    
    // Setup item styles without transitions during resize
    this.state.items.forEach(item => {
      item.style.position = 'absolute';
      // Don't add transitions - let CSS handle this
    });
  }

  /**
   * Calculate container and column dimensions
   */
  calculateDimensions() {
    const containerStyles = getComputedStyle(this.container);
    const paddingLeft = parseInt(containerStyles.paddingLeft, 10) || 0;
    const paddingRight = parseInt(containerStyles.paddingRight, 10) || 0;
    
    this.state.containerWidth = this.container.clientWidth - paddingLeft - paddingRight;
    
    // Get breakpoint configuration
    const config = this.getBreakpointConfig();
    this.state.gapX = config.gapX;
    this.state.gapY = config.gapY;
    
    if (config.useWidth) {
      // Desktop: Calculate columns based on column width
      this.state.columnWidth = config.columnWidth;
      this.state.actualColumns = Math.floor(
        (this.state.containerWidth + this.state.gapX) / (this.state.columnWidth + this.state.gapX)
      ) || 1;
    } else {
      // Mobile/Tablet: Use fixed column count
      this.state.actualColumns = config.columns;
      this.state.columnWidth = (this.state.containerWidth - (this.state.gapX * (this.state.actualColumns - 1))) / this.state.actualColumns;
    }

    // Initialize column heights array
    this.state.columns = new Array(this.state.actualColumns).fill(0);
    
    // Add breakpoint class for CSS targeting
    this.updateBreakpointClasses();
  }

  /**
   * Update CSS classes on container for breakpoint targeting
   */
  updateBreakpointClasses() {
    const container = this.container;
    const breakpoints = ['mobile_portrait', 'mobile_landscape', 'tablet', 'desktop'];
    
    // Remove old breakpoint classes
    breakpoints.forEach(bp => {
      container.classList.remove(`masonry_${bp}`);
    });
    
    // Add current breakpoint class
    if (this.state.currentBreakpoint) {
      const className = `masonry_${this.state.currentBreakpoint.replace('-', '_')}`;
      container.classList.add(className);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for image loads
    this.state.items.forEach(item => {
      const images = item.querySelectorAll('img');
      images.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', this.handleItemLoad);
          img.addEventListener('error', this.handleItemLoad);
        }
      });
    });

    // Listen for window resize
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Handle item load events
   */
  handleItemLoad(event) {
    // Debounce layout calls
    if (this.layoutTimeout) {
      clearTimeout(this.layoutTimeout);
    }
    
    this.layoutTimeout = setTimeout(() => {
      this.layout();
    }, 500);
  }

  /**
   * Handle window resize with breakpoint detection
   */
  handleResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      console.log('🧱 Masonry: Handling resize...');
      
      const oldBreakpoint = this.state.currentBreakpoint;
      const oldContainerWidth = this.state.containerWidth;
      const oldColumns = this.state.actualColumns;
      
      // Recalculate everything from scratch
      this.calculateDimensions();
      
      console.log('🧱 Masonry: Resize calculations:', {
        breakpointChange: `${oldBreakpoint} → ${this.state.currentBreakpoint}`,
        widthChange: `${oldContainerWidth}px → ${this.state.containerWidth}px`,
        columnChange: `${oldColumns} → ${this.state.actualColumns}`,
        columnWidth: `${this.state.columnWidth}px`,
        gaps: `${this.state.gapX}px x ${this.state.gapY}px`
      });
      
      // Dispatch breakpoint change event if changed
      if (oldBreakpoint !== this.state.currentBreakpoint) {
        this.container.dispatchEvent(new CustomEvent('masonry:breakpointChange', {
          detail: {
            from: oldBreakpoint,
            to: this.state.currentBreakpoint,
            windowWidth: window.innerWidth,
            instance: this
          }
        }));
      }
      
      // Always re-layout after resize
      this.layout();
    }, 100); // Reduced debounce time for more responsive resizing
  }

  /**
   * Main layout function
   */
  async layout() {
    if (this.state.isLayoutInProgress || !this.state.items.length) {
      return;
    }

    this.state.isLayoutInProgress = true;
    
    try {
      await this.runHooks('beforeLayout');
      
      // Reset column heights
      this.state.columns.fill(0);
      
      // Position each item
      this.state.items.forEach(item => {
        this.positionItem(item);
      });
      
      // Set container height
      const maxColumnHeight = Math.max(...this.state.columns);
      this.container.style.height = `${maxColumnHeight}px`;
      
      await this.runHooks('afterLayout');
      
      // Dispatch layout complete event
      this.container.dispatchEvent(new CustomEvent('masonry:layoutComplete', {
        detail: { 
          instance: this,
          containerHeight: maxColumnHeight,
          columns: this.state.actualColumns,
          breakpoint: this.state.currentBreakpoint
        }
      }));
      
    } finally {
      this.state.isLayoutInProgress = false;
    }
  }

  /**
   * Position individual item
   */
  positionItem(item) {
    // Find shortest column
    const shortestColumnIndex = this.state.columns.indexOf(
      Math.min(...this.state.columns)
    );
    
    // Calculate position
    const x = shortestColumnIndex * (this.state.columnWidth + this.state.gapX);
    const y = this.state.columns[shortestColumnIndex];
    
    // Set item position
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.style.width = `${this.state.columnWidth}px`;
    
    // Update column height
    this.state.columns[shortestColumnIndex] += item.offsetHeight + this.state.gapY;
    
    // Add positioned class for styling hooks
    item.classList.add('masonry_item_positioned');
  }

  /**
   * Add new items to the layout (perfect for Webflow CMS pagination)
   */
  async addItems(elements) {
    const newItems = Array.isArray(elements) ? elements : [elements];
    
    // Setup new items
    newItems.forEach(item => {
      item.style.position = 'absolute';
      
      // Setup image load listeners
      const images = item.querySelectorAll('img');
      images.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', this.handleItemLoad);
          img.addEventListener('error', this.handleItemLoad);
        }
      });
    });
    
    // Add to items array
    this.state.items.push(...newItems);
    
    // Layout new items only
    newItems.forEach(item => {
      this.positionItem(item);
    });
    
    // Update container height
    const maxColumnHeight = Math.max(...this.state.columns);
    this.container.style.height = `${maxColumnHeight}px`;
    
    // Dispatch event
    this.container.dispatchEvent(new CustomEvent('masonry:itemsAdded', {
      detail: { 
        instance: this,
        newItems: newItems,
        totalItems: this.state.items.length
      }
    }));
  }

  /**
   * Remove items from layout
   */
  async removeItems(elements) {
    const itemsToRemove = Array.isArray(elements) ? elements : [elements];
    
    // Remove from items array
    itemsToRemove.forEach(item => {
      const index = this.state.items.indexOf(item);
      if (index > -1) {
        this.state.items.splice(index, 1);
      }
      
      // Remove from DOM
      if (item.parentNode) {
        item.parentNode.removeChild(item);
      }
    });
    
    // Re-layout remaining items
    await this.layout();
    
    // Dispatch event
    this.container.dispatchEvent(new CustomEvent('masonry:itemsRemoved', {
      detail: { 
        instance: this,
        removedItems: itemsToRemove,
        totalItems: this.state.items.length
      }
    }));
  }

  /**
   * Refresh layout (recalculate and re-layout)
   */
  async refresh() {
    this.getItems();
    this.calculateDimensions();
    await this.layout();
  }

  /**
   * Plugin system - register plugin
   */
  use(plugin, options = {}) {
    if (typeof plugin === 'function') {
      plugin(this, options);
    } else if (plugin && typeof plugin.install === 'function') {
      plugin.install(this, options);
    }
    return this;
  }

  /**
   * Hook system - add hook
   */
  addHook(hookName, callback) {
    if (this.hooks[hookName]) {
      this.hooks[hookName].push(callback);
    }
    return this;
  }

  /**
   * Run hooks
   */
  async runHooks(hookName) {
    if (this.hooks[hookName]) {
      for (const callback of this.hooks[hookName]) {
        await callback(this);
      }
    }
  }

  /**
   * Destroy instance
   */
  async destroy() {
    await this.runHooks('beforeDestroy');
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    this.state.items.forEach(item => {
      const images = item.querySelectorAll('img');
      images.forEach(img => {
        img.removeEventListener('load', this.handleItemLoad);
        img.removeEventListener('error', this.handleItemLoad);
      });
      
      // Reset item styles
      item.style.position = '';
      item.style.left = '';
      item.style.top = '';
      item.style.width = '';
      item.classList.remove('masonry_item_positioned');
    });
    
    // Reset container styles
    this.container.style.height = '';
    this.container.style.position = '';
    
    // Remove breakpoint classes
    const breakpoints = ['mobile_portrait', 'mobile_landscape', 'tablet', 'desktop'];
    breakpoints.forEach(bp => {
      this.container.classList.remove(`masonry_${bp}`);
    });
    
    // Clear timeouts
    if (this.layoutTimeout) clearTimeout(this.layoutTimeout);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    
    // Reset state
    this.state.isInitialized = false;
    this.state.items = [];
    this.state.columns = [];
    
    await this.runHooks('afterDestroy');
    
    // Dispatch destroy event
    this.container.dispatchEvent(new CustomEvent('masonry:destroyed'));
  }

  /**
   * Get current state (useful for debugging and plugins)
   */
  getState() {
    return { 
      ...this.state,
      breakpointConfig: this.getBreakpointConfig()
    };
  }

  /**
   * Get current CSS configuration values
   */
  getCurrentConfig() {
    return {
      breakpoint: this.state.currentBreakpoint,
      columns: this.state.actualColumns,
      columnWidth: this.state.columnWidth,
      gapX: this.state.gapX,
      gapY: this.state.gapY,
      containerWidth: this.state.containerWidth
    };
  }
}

// Factory function for easier instantiation
function createMasonry(container, options) {
  return new MasonryLayout(container, options);
}

// Auto-initialize based on data attributes
function autoInit() {
  console.log('🧱 Masonry: Starting auto-initialization...');
  
  const containers = document.querySelectorAll('[data-masonry]');
  console.log(`🧱 Masonry: Found ${containers.length} container(s) with [data-masonry]`);
  
  if (containers.length === 0) {
    console.warn('🧱 Masonry: No containers found with [data-masonry] attribute. Make sure to add data-masonry="true" to your container element.');
    return [];
  }
  
  const instances = [];
  
  containers.forEach((container, index) => {
    console.log(`🧱 Masonry: Initializing container ${index + 1}:`, container);
    
    try {
      const instance = new MasonryLayout(container);
      instances.push(instance);
      console.log(`✅ Masonry: Container ${index + 1} initialized successfully`);
    } catch (error) {
      console.error(`❌ Masonry: Failed to initialize container ${index + 1}:`, error);
    }
  });
  
  console.log(`🧱 Masonry: Auto-initialization complete. ${instances.length} instance(s) created.`);
  return instances;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasonryLayout, createMasonry, autoInit };
} else if (typeof define === 'function' && define.amd) {
  define(() => ({ MasonryLayout, createMasonry, autoInit }));
} else {
  window.MasonryLayout = MasonryLayout;
  window.createMasonry = createMasonry;
  window.masonryAutoInit = autoInit;
}

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  console.log('🧱 Masonry: Script loaded, setting up auto-initialization...');
  
  if (document.readyState === 'loading') {
    console.log('🧱 Masonry: DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🧱 Masonry: DOMContentLoaded fired');
      autoInit();
    });
  } else {
    console.log('🧱 Masonry: DOM already loaded, initializing immediately...');
    // Small delay to ensure styles are loaded
    setTimeout(autoInit, 10);
  }
}
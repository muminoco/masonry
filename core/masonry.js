// core/masonry.js
import { DEFAULT_CONFIG, DEFAULT_STATE, CSS_CLASSES } from './config.js';
import { 
  getContainer, 
  getBreakpointConfig, 
  applyDefaultStyles, 
  updateBreakpointClasses,
  setupMediaListeners,
  removeMediaListeners,
  resetItemStyles
} from './utils.js';
import { 
  EventManager, 
  MasonryEventDispatcher, 
  PluginManager, 
  createDebouncedHandler 
} from './events.js';

class MasonryLayout {
  constructor(container, options = {}) {
    console.log('🧱 Masonry: Creating new instance...', { container, options });
    
    this.container = getContainer(container);

    // Configuration (merge before using)
    this.config = {
      ...DEFAULT_CONFIG,
      ...options
    };

    // Check for required data attribute
    const expectedAttribute = this.config.autoInitAttribute;
    const expectedValue = this.config.autoInitValue;
    const actualValue = this.container.getAttribute(expectedAttribute);
    
    if (!actualValue) {
      console.warn(`🧱 Masonry: Container should have ${expectedAttribute}="${expectedValue}" attribute for best results`);
    }

    // State management
    this.state = { ...DEFAULT_STATE };

    // Event system
    this.eventManager = new EventManager();
    this.eventDispatcher = new MasonryEventDispatcher(this.container);
    this.pluginManager = new PluginManager().setContext(this);

    // Event handlers (bound for proper context)
    this.handleResize = createDebouncedHandler(this._handleResize.bind(this), 150);
    this.handleItemLoad = createDebouncedHandler(this._handleItemLoad.bind(this), 100);

    this.init();
  }

  /**
   * Initialize the masonry layout
   */
  async init() {
    try {
      await this.eventManager.runHooks('beforeInit', this);
      
      this.setupContainer();
      this.getItems();
      this.calculateDimensions();
      this.setupEventListeners();
      
      await this.layout();
      
      this.state.isInitialized = true;
      await this.eventManager.runHooks('afterInit', this);
      
      this.eventDispatcher.dispatchInitialized(this);
      
    } catch (error) {
      console.error('Masonry initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup container styles and properties
   */
  setupContainer() {
    this.container.style.position = 'relative';
    applyDefaultStyles(this.container);
  }

  /**
   * Get all masonry items (all direct children)
   */
  getItems() {
    this.state.items = Array.from(this.container.children);
    
    // Setup item styles without transitions during resize
    this.state.items.forEach(item => {
      item.style.position = 'absolute';
      // Don't force width - let items maintain their natural width within constraints
    });
  }

  /**
   * Calculate container and column dimensions using min-width approach
   */
  calculateDimensions() {
    const containerStyles = getComputedStyle(this.container);
    const paddingLeft = parseInt(containerStyles.paddingLeft, 10) || 0;
    const paddingRight = parseInt(containerStyles.paddingRight, 10) || 0;
    
    this.state.containerWidth = this.container.clientWidth - paddingLeft - paddingRight;
    
    // Get breakpoint configuration
    const config = getBreakpointConfig(this.container);
    this.state.currentBreakpoint = config.breakpoint;
    this.state.gapX = config.gapX;
    this.state.gapY = config.gapY;
    
    if (config.useMinWidth) {
      // Desktop: Calculate columns based on min-width (Pinterest approach)
      this.state.columnMinWidth = config.columnMinWidth;
      
      // Calculate how many columns fit with min-width constraint
      const maxPossibleColumns = Math.floor(
        (this.state.containerWidth + this.state.gapX) / (this.state.columnMinWidth + this.state.gapX)
      ) || 1;
      
      // Don't create more columns than items available
      this.state.actualColumns = Math.min(maxPossibleColumns, this.state.items.length);
      
      // Calculate actual column width (can be larger than min-width)
      this.state.actualColumnWidth = (this.state.containerWidth - (this.state.gapX * (this.state.actualColumns - 1))) / this.state.actualColumns;
      
      console.log('🧱 Masonry: Min-width calculation:', {
        minWidth: this.state.columnMinWidth,
        maxPossibleColumns: maxPossibleColumns,
        itemCount: this.state.items.length,
        actualColumns: this.state.actualColumns,
        actualColumnWidth: this.state.actualColumnWidth,
        containerWidth: this.state.containerWidth
      });
      
    } else {
      // Mobile/Tablet: Use fixed column count, but don't exceed item count
      this.state.actualColumns = Math.min(config.columns, this.state.items.length);
      this.state.actualColumnWidth = (this.state.containerWidth - (this.state.gapX * (this.state.actualColumns - 1))) / this.state.actualColumns;
      this.state.columnMinWidth = this.state.actualColumnWidth; // For consistency
    }

    // Initialize column heights array
    this.state.columns = new Array(this.state.actualColumns).fill(0);
    
    // Add breakpoint class for CSS targeting
    updateBreakpointClasses(this.container, this.state.currentBreakpoint);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for image loads and video loads
    this.state.items.forEach(item => {
      setupMediaListeners(item, this.handleItemLoad);
    });

    // Listen for window resize
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Handle item load events (internal method)
   */
  _handleItemLoad(event) {
    this.layout();
  }

  /**
   * Handle window resize with breakpoint detection (internal method)
   */
  _handleResize() {
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
      actualColumnWidth: `${this.state.actualColumnWidth}px`,
      gaps: `${this.state.gapX}px x ${this.state.gapY}px`
    });
    
    // Dispatch breakpoint change event if changed
    if (oldBreakpoint !== this.state.currentBreakpoint) {
      this.eventDispatcher.dispatchBreakpointChange(
        oldBreakpoint,
        this.state.currentBreakpoint,
        window.innerWidth,
        this
      );
    }
    
    // Always re-layout after resize
    this.layout();
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
      await this.eventManager.runHooks('beforeLayout', this);
      
      // Reset column heights
      this.state.columns.fill(0);
      
      // Position each item
      this.state.items.forEach(item => {
        this.positionItem(item);
      });
      
      // Set container height
      const maxColumnHeight = Math.max(...this.state.columns);
      this.container.style.height = `${maxColumnHeight}px`;
      
      await this.eventManager.runHooks('afterLayout', this);
      
      this.eventDispatcher.dispatchLayoutComplete(
        this,
        maxColumnHeight,
        this.state.actualColumns,
        this.state.currentBreakpoint
      );
      
    } finally {
      this.state.isLayoutInProgress = false;
    }
  }

  /**
   * Position individual item using min-width approach
   */
  positionItem(item) {
    // Find shortest column
    const shortestColumnIndex = this.state.columns.indexOf(
      Math.min(...this.state.columns)
    );
    
    // Calculate position
    const x = shortestColumnIndex * (this.state.actualColumnWidth + this.state.gapX);
    const y = this.state.columns[shortestColumnIndex];
    
    // Set item position and width
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.style.width = `${this.state.actualColumnWidth}px`;
    
    // Force layout calculation to get accurate height
    item.style.height = 'auto';
    
    // Get the actual height after width is set
    const itemHeight = item.offsetHeight;
    
    // Update column height
    this.state.columns[shortestColumnIndex] += itemHeight + this.state.gapY;
    
    // Add positioned class for styling hooks
    item.classList.add(CSS_CLASSES.itemPositioned);
  }

  /**
   * Add new items to the layout (perfect for Webflow CMS pagination)
   */
  async addItems(elements) {
    const newItems = Array.isArray(elements) ? elements : [elements];
    
    // Setup new items
    newItems.forEach(item => {
      item.style.position = 'absolute';
      setupMediaListeners(item, this.handleItemLoad);
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
    
    this.eventDispatcher.dispatchItemsAdded(this, newItems, this.state.items.length);
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
    
    this.eventDispatcher.dispatchItemsRemoved(this, itemsToRemove, this.state.items.length);
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
    return this.pluginManager.use(plugin, options);
  }

  /**
   * Hook system - add hook
   */
  addHook(hookName, callback) {
    return this.eventManager.addHook(hookName, callback);
  }

  /**
   * Destroy instance
   */
  async destroy() {
    await this.eventManager.runHooks('beforeDestroy', this);
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    this.state.items.forEach(item => {
      removeMediaListeners(item, this.handleItemLoad);
      resetItemStyles(item);
    });
    
    // Reset container styles
    this.container.style.height = '';
    this.container.style.position = '';
    
    // Remove breakpoint classes
    updateBreakpointClasses(this.container, null);
    
    // Clear timeouts (handled by debounced handlers)
    
    // Reset state
    this.state.isInitialized = false;
    this.state.items = [];
    this.state.columns = [];
    
    await this.eventManager.runHooks('afterDestroy', this);
    
    this.eventDispatcher.dispatchDestroyed();
  }

  /**
   * Get current state (useful for debugging and plugins)
   */
  getState() {
    return { 
      ...this.state,
      breakpointConfig: getBreakpointConfig(this.container)
    };
  }

  /**
   * Get current CSS configuration values
   */
  getCurrentConfig() {
    return {
      breakpoint: this.state.currentBreakpoint,
      columns: this.state.actualColumns,
      columnMinWidth: this.state.columnMinWidth,
      actualColumnWidth: this.state.actualColumnWidth,
      gapX: this.state.gapX,
      gapY: this.state.gapY,
      containerWidth: this.state.containerWidth
    };
  }
}

// Factory function for easier instantiation
export function createMasonry(container, options) {
  return new MasonryLayout(container, options);
}

// Auto-initialize based on data attributes
export function autoInit(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const attribute = config.autoInitAttribute;
  const value = config.autoInitValue;
  
  console.log('🧱 Masonry: Starting auto-initialization...');
  
  const containers = document.querySelectorAll(`[${attribute}="${value}"]`);
  console.log(`🧱 Masonry: Found ${containers.length} container(s) with [${attribute}="${value}"]`);
  
  if (containers.length === 0) {
    console.warn(`🧱 Masonry: No containers found with [${attribute}="${value}"] attribute. Make sure to add ${attribute}="${value}" to your container element.`);
    return [];
  }
  
  const instances = [];
  
  containers.forEach((container, index) => {
    console.log(`🧱 Masonry: Initializing container ${index + 1}:`, container);
    
    try {
      const instance = new MasonryLayout(container, config);
      instances.push(instance);
      console.log(`✅ Masonry: Container ${index + 1} initialized successfully`);
    } catch (error) {
      console.error(`❌ Masonry: Failed to initialize container ${index + 1}:`, error);
    }
  });
  
  console.log(`🧱 Masonry: Auto-initialization complete. ${instances.length} instance(s) created.`);
  return instances;
}

// Export the main class
export { MasonryLayout };

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
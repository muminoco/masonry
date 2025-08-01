// core/events.js
import { HOOK_NAMES } from './config.js';

/**
 * Event management system for masonry instances
 */
export class EventManager {
  constructor() {
    this.hooks = {};
    
    // Initialize hook arrays
    HOOK_NAMES.forEach(hookName => {
      this.hooks[hookName] = [];
    });
  }

  /**
   * Add hook callback
   */
  addHook(hookName, callback) {
    if (this.hooks[hookName]) {
      this.hooks[hookName].push(callback);
    } else {
      console.warn(`Masonry: Unknown hook name "${hookName}". Available hooks:`, HOOK_NAMES);
    }
    return this;
  }

  /**
   * Run hooks for a specific event
   */
  async runHooks(hookName, context) {
    if (this.hooks[hookName]) {
      for (const callback of this.hooks[hookName]) {
        await callback(context);
      }
    }
  }

  /**
   * Remove a specific hook callback
   */
  removeHook(hookName, callback) {
    if (this.hooks[hookName]) {
      const index = this.hooks[hookName].indexOf(callback);
      if (index > -1) {
        this.hooks[hookName].splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Clear all hooks for a specific event
   */
  clearHooks(hookName) {
    if (this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }
    return this;
  }

  /**
   * Clear all hooks
   */
  clearAllHooks() {
    HOOK_NAMES.forEach(hookName => {
      this.hooks[hookName] = [];
    });
    return this;
  }
}

/**
 * Custom event dispatcher for masonry events
 */
export class MasonryEventDispatcher {
  constructor(container) {
    this.container = container;
  }

  /**
   * Dispatch initialization complete event
   */
  dispatchInitialized(instance) {
    this.container.dispatchEvent(new CustomEvent('masonry:initialized', {
      detail: { instance }
    }));
  }

  /**
   * Dispatch breakpoint change event
   */
  dispatchBreakpointChange(from, to, windowWidth, instance) {
    this.container.dispatchEvent(new CustomEvent('masonry:breakpointChange', {
      detail: {
        from,
        to,
        windowWidth,
        instance
      }
    }));
  }

  /**
   * Dispatch layout complete event
   */
  dispatchLayoutComplete(instance, containerHeight, columns, breakpoint) {
    this.container.dispatchEvent(new CustomEvent('masonry:layoutComplete', {
      detail: { 
        instance,
        containerHeight,
        columns,
        breakpoint
      }
    }));
  }

  /**
   * Dispatch items added event
   */
  dispatchItemsAdded(instance, newItems, totalItems) {
    this.container.dispatchEvent(new CustomEvent('masonry:itemsAdded', {
      detail: { 
        instance,
        newItems,
        totalItems
      }
    }));
  }

  /**
   * Dispatch items removed event
   */
  dispatchItemsRemoved(instance, removedItems, totalItems) {
    this.container.dispatchEvent(new CustomEvent('masonry:itemsRemoved', {
      detail: { 
        instance,
        removedItems,
        totalItems
      }
    }));
  }

  /**
   * Dispatch destroy event
   */
  dispatchDestroyed() {
    this.container.dispatchEvent(new CustomEvent('masonry:destroyed'));
  }
}

/**
 * Debounced event handler creator
 */
export function createDebouncedHandler(callback, delay = 150) {
  let timeoutId;
  
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
}

/**
 * Plugin management system
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map();
  }

  /**
   * Register plugin
   */
  use(plugin, options = {}) {
    if (typeof plugin === 'function') {
      plugin(this.context, options);
    } else if (plugin && typeof plugin.install === 'function') {
      plugin.install(this.context, options);
    } else {
      console.warn('Masonry: Invalid plugin format. Plugin should be a function or have an install method.');
    }
    return this;
  }

  /**
   * Set the context (masonry instance) for plugins
   */
  setContext(context) {
    this.context = context;
    return this;
  }

  /**
   * Get registered plugin
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(name) {
    return this.plugins.has(name);
  }

  /**
   * Unregister plugin
   */
  unregister(name) {
    return this.plugins.delete(name);
  }

  /**
   * Get all registered plugin names
   */
  getPluginNames() {
    return Array.from(this.plugins.keys());
  }
}
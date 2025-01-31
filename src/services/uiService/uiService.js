/**
 * @typedef {import('./uiService.types').UIServiceConfigType} UIServiceConfigType
 * @typedef {import('./uiService.types').UIServiceStyleType} UIServiceStyleType
 * @typedef {import('./uiService.types').PageSizesType} PageSizesType
 * @typedef {import('./uiService.types').PageSizeType} PageSizeType
 * @typedef {import('./uiService.types').UISizesType} UISizesType
 */
import { observerMixin, dummySignal, mergeObjects, onResize, bind } from '@arpadroid/tools';

class UIService {
    pageWidth = 0;
    pageHeight = 0;
    /** @type {PageSizeType} */
    uiType = '';
    /** @type {PageSizeType} */
    pageSize = '';

    ////////////////////////////////
    // #region Initialization
    ////////////////////////////////

    constructor(config = {}) {
        bind(this, 'setPageSize');
        this.signal = dummySignal;
        observerMixin(this);
        this.setConfig(config);
        this.handleResize();
        this.initializeDarkMode();
    }

    /**
     * Returns the default configuration for the service.
     * @returns {UIServiceConfigType}
     */
    getDefaultConfig() {
        return {
            uiSizes: {
                mobile: 800,
                desktop: 1440
            },
            pageSizes: {
                mobileSmall: 400,
                mobile: 800,
                tablet: 1024,
                desktop: 1440,
                desktopLarge: 1920
            },
            styles: {
                dark: { id: 'dark-styles' },
                responsive: {
                    mobileSmall: { id: 'mobile-small-styles' },
                    mobile: { id: 'mobile-styles' },
                    tablet: { id: 'tablet-styles' },
                    desktop: { id: 'desktop-styles' },
                    desktopLarge: { id: 'desktop-large-styles' }
                }
            }
        };
    }

    /**
     * Sets the configuration for the service.
     * @param {UIServiceConfigType} [config]
     */
    setConfig(config = {}) {
        /** @type {UIServiceConfigType} */
        this._config = mergeObjects(this.getDefaultConfig(), config);
    }

    // #endregion

    ////////////////////////////////
    // #region Get
    ////////////////////////////////

    getUIType() {
        return this.uiType;
    }

    /**
     * Returns the page sizes.
     * @returns {UISizesType | undefined}
     */
    getUiSizes() {
        return this._config?.uiSizes;
    }

    /**
     * Returns the size key based on the given size.
     * @param {number} size
     * @param {UISizesType | undefined} sizes
     * @returns {PageSizeType | undefined}
     */
    getSize(size = this.pageWidth, sizes = this.getUiSizes() || {}) {
        const maxSize = Object.keys(sizes).pop();
        for (const [key, value] of Object.entries(sizes)) {
            if ((value && size < value) || key === maxSize) {
                return key;
            }
        }
    }

    getPageSize() {
        return this.pageSize;
    }

    // #endregion

    ////////////////////////////////
    // #region Set
    ////////////////////////////////

    setPageSize(width = window.innerWidth, height = window.innerHeight) {
        this.pageWidth = width;
        this.pageHeight = height;
        const pageSize = this.getSize();
        if (!pageSize) return;
        if (pageSize !== this.pageSize) {
            this.pageSize = pageSize;
            this.signal('PAGE_SIZE', pageSize);
        }
        this.setUIType(pageSize);
    }

    /**
     * Sets the UI type based on the given size.
     * @param {PageSizeType} type
     */
    setUIType(type) {
        const { styles = {} } = this._config || {};
        const { responsive: stylesheets } = styles;
        if (type !== this.uiType) {
            this.disableStylesheets();
            this.uiType = type;
            document.body.setAttribute('data-ui', type);
            this.signal('UI_TYPE', type);
            if (stylesheets?.[type]) {
                requestAnimationFrame(() => {
                    const sheet = document.getElementById(stylesheets[type].id);
                    sheet instanceof HTMLLinkElement && (sheet.disabled = false);
                });
            }
        }
    }

    // #endregion

    ////////////////////////////////
    // #region API
    ////////////////////////////////

    disableStylesheets() {
        const { styles = {} } = this._config || {};
        const { responsive = {} } = styles;
        for (const [, style] of Object.entries(responsive)) {
            const sheet = document.getElementById(style.id);
            if (sheet instanceof HTMLLinkElement) {
                sheet.disabled = true;
            }
        }
    }

    // #endregion

    //////////////////////////////////
    // #region Dark Mode
    //////////////////////////////////

    initializeDarkMode() {
        this.toggleDarkMode(this.isDarkMode());
    }

    /**
     * Returns the dark mode configuration.
     * @returns {UIServiceStyleType | undefined}
     */
    getDarkModeConfig() {
        return this._config?.styles?.dark;
    }

    /**
     * Returns the dark mode stylesheet id.
     * @returns {string | undefined}
     */
    getDarkModeId() {
        return this.getDarkModeConfig()?.id;
    }

    /**
     * Returns true if we are in dark mode.
     * @returns {boolean}
     */
    isDarkMode() {
        return window.localStorage.getItem('darkMode') === 'true';
    }

    /**
     * Toggles dark mode on or off.
     * @param {boolean} [darkMode]
     * @returns {void}
     */
    toggleDarkMode(darkMode = !this.isDarkMode()) {
        const id = this.getDarkModeId();
        this.darkStyle = id && document.getElementById(id);
        if (this.darkStyle instanceof HTMLLinkElement) {
            this.darkStyle.disabled = !darkMode;
            localStorage.setItem('darkMode', Boolean(darkMode) ? 'true' : 'false');
            this.signal('DARK_MODE', darkMode);
        }
    }

    // #endregion

    ///////////////////////////
    // #region Events
    //////////////////////////

    handleResize() {
        onResize(() => this.setPageSize());
        this.setPageSize();
    }

    // #endregion
}

export default UIService;

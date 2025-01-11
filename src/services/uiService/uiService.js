import { ObserverTool, mergeObjects, onResize } from '@arpadroid/tools';

class UIService {
    pageWidth;
    pageHeight;
    uiType = '';
    pageSize = '';
    uiSizes = {
        mobile: 800,
        // tablet: 1024,
        desktop: 1440
    };
    static pageSizes = {
        mobileSmall: 400,
        mobile: 800,
        tablet: 1024,
        desktop: 1440,
        desktopLarge: 1920
    };
    constructor(config = {}) {
        ObserverTool.mixin(this);
        this.setConfig(config);
        this.handleResize();
        this.initializeDarkMode();
    }

    getDefaultConfig() {
        return {
            darkStyle: { id: 'dark-styles' },
            stylesheets: {
                mobile: { id: 'mobile-styles' },
                desktop: { id: 'desktop-styles' }
            }
        };
    }

    setConfig(config = {}) {
        this._config = mergeObjects(this.getDefaultConfig(), config);
    }

    getPageSize() {
        return this.pageSize;
    }

    handleResize() {
        onResize(event => this.setPageSize(event));
        this.setPageSize();
    }

    setPageSize() {
        this.pageWidth = window.innerWidth;
        this.pageHeight = window.innerHeight;
        const uiType = this._getUIType();
        const pageSize = this._getPageSize();
        if (pageSize !== this.pageSize) {
            this.pageSize = pageSize;
            this.signal('PAGE_SIZE', pageSize);
        }
        this.setUIType(uiType);
    }

    setUIType(type) {
        const { stylesheets } = this._config;
        if (type !== this.uiType) {
            this.disableStylesheets();
            this.uiType = type;
            document.body.setAttribute('data-ui', type);
            this.signal('UI_TYPE', type);
            if (stylesheets[type]) {
                requestAnimationFrame(() => {
                    const sheet = document.getElementById(stylesheets[type].id);
                    sheet && (sheet.disabled = false);
                });
            }
        }
    }

    disableStylesheets() {
        const { stylesheets } = this._config;
        for (const [, style] of Object.entries(stylesheets)) {
            const sheet = document.getElementById(style.id);
            if (sheet) {
                sheet.disabled = true;
            }
        }
    }

    getUIType() {
        return this.uiType;
    }

    _getUIType() {
        return this._getPageSize(this.uiSizes);
    }

    _getPageSize(sizes = UIService.pageSizes) {
        return UIService.getSize(sizes, this.pageWidth);
    }

    static getSize(sizes, size) {
        const maxSize = Object.keys(sizes).pop();
        for (const [key, value] of Object.entries(sizes)) {
            if (size < value || key === maxSize) {
                return key;
            }
        }
    }

    isDarkMode() {
        return window.localStorage.getItem('darkMode') === 'true';
    }

    initializeDarkMode() {
        this.toggleDarkMode(this.isDarkMode());
    }

    toggleDarkMode(darkMode = !this.isDarkMode()) {
        this.darkStyle = document.getElementById('dark-styles');
        if (this.darkStyle) {
            this.darkStyle.disabled = !darkMode;
            localStorage.setItem('darkMode', Boolean(darkMode));
            this.signal('DARK_MODE', darkMode);
        }
    }
}

export default UIService;

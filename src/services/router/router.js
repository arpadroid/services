/**
 * @typedef {import ('./router.types').RouteType} RouteType
 * @typedef {import ('./router.types').RouterConfigType} RouterConfigType
 * @typedef {import ('./router.types').HistoryType} HistoryType
 * @typedef {import ('./router.types').RouteTypeType}  RouteTypeType
 */
import { observerMixin, mergeObjects, clearLazyQueue, dummyListener, dummySignal, dummyOff } from '@arpadroid/tools';
import { sanitizeURL, matchPath, matchPaths, editURL, getPathParts, getURLPath, getParentPath } from '@arpadroid/tools';
import APIService from '../apiService/apiService';

// import { Page } from '../../modules/page/page.module.js';

class Router {
    /** @type {Record<string, RouteType>} */
    routesByName = {};
    /** @type {RouterConfigType} routeConfig */
    routeConfig = {};
    /** @type {string} originalURL - The landing URL. */
    originalURL = window.location.href;
    /** @type {boolean} hasRouteChanged - Whether any navigation has ocurred within the application. */
    hasRouteChanged = false;
    /** @type {HistoryType} */
    history = [{ url: sanitizeURL(window.location.href) }];

    //////////////////////////
    // #region Initialization
    //////////////////////////

    /**
     * Creates an instance of Router.
     * @param {RouterConfigType} config - The component configuration.
     */
    constructor(config = {}) {
        this.on = dummyListener;
        this.signal = dummySignal;
        this.off = dummyOff;
        observerMixin(this);
        this.setConfig(config);
        this._initialize();
    }

    setConfig(config = {}) {
        /** @type {RouterConfigType} */
        this._config = mergeObjects(this.getDefaultConfig(), config);
    }

    getDefaultConfig() {
        return {
            basePath: '/',
            context: {},
            hasDatabaseRoutes: true,
            routeDefaults: {
                type: 'common'
            },
            routes: {
                public: {},
                private: {},
                common: {},
                dev: {}
            }
        };
    }

    _initialize() {
        this._initializeProperties();
        this._initializeRoutes();
        document.addEventListener('click', this._onNavigate);
        window.addEventListener('popstate', this._onPopState);
    }

    // #endregion Initialization

    //////////////////////////
    // #region Event Handlers
    //////////////////////////

    /**
     * Handles the popstate event.
     * @param {PopStateEvent} event
     */
    _onPopState(event) {
        /** @type {RouteType} */
        const route = this._findRoute(window.location.href) || {};
        route && (route.url = window.location.href);
        route && (route.isPopState = true);
        if (route) {
            this._onRouteChange(route, event);
        }
    }

    /**
     * Handles the navigation event.
     * @param {MouseEvent} event
     * @returns {boolean}
     */
    _onNavigate(event) {
        /**
         * @todo Implement Context.KeyboardTool.
         */
        // if (Context?.KeyboardTool?.isMetaPressed) {
        //     return;
        // }
        const target = event.target;
        const link = target instanceof HTMLElement && (target.closest('a') ?? target);
        if (link && link instanceof HTMLLinkElement) {
            const route = this._findRoute(link.href);
            if (route) {
                route.url = link.href;
                route.isPopState = false;
                event.preventDefault();
                window.history.pushState(link.href, '', link.href);
                this._onRouteChange(route, event);
            }
        }
        return false;
    }

    /**
     * Handles the route change.
     * @param {RouteType | undefined} route
     * @param {Event | undefined} event
     * @param {Record<string, any>} config
     * @returns {Promise<Record<string, any>>}
     */
    async _onRouteChange(route, event, config = {}) {
        return new Promise(resolve => {
            clearLazyQueue();
            if (route) {
                if (!(event instanceof PopStateEvent)) {
                    this._addItemToHistory(route);
                }
                /** @type {RouteType} */
                this._previousRoute = this._currentRoute;
                /** @type {RouteType} */
                this._currentRoute = route;
                if (!route?.componentInstance && route?.component) {
                    this._instantiateRoute(route);
                }
            }
            const payload = { route, event, previousRoute: this._previousRoute, config };
            this.signal('route_change', payload);
            // @ts-ignore
            this._onRouteChanged(payload);
            requestAnimationFrame(() => {
                this.signal('route_changed', payload);
                resolve(payload);
            });
        });
    }

    /**
     * Handles the route change.
     * @param {{
     * route: RouteType | undefined,
     * previousRoute?: RouteType,
     * config: Record<string, any>
     * }} payload
     * @returns {void}
     */
    _onRouteChanged({ route, previousRoute, config = {} }) {
        const prevComponent = previousRoute?.componentInstance;
        const newComponent = route?.componentInstance;
        const refreshAll = Boolean(config?.refreshAll);
        // Check if the route is the same as the previous route
        if (newComponent) {
            newComponent.refreshAll = refreshAll;
        }
        if (typeof newComponent?.initialize === 'function') {
            newComponent?.initialize();
        }
        if (!refreshAll && prevComponent === newComponent) {
            return;
        }
        this._replacePage(newComponent);
        prevComponent?.destroy();
    }

    // #endregion Event Handlers

    ///////////////////
    // #region Routing
    ///////////////////

    /**
     * Pre-processes the route before navigation occurs.
     * @param {RouteType} route
     * @returns {RouteType}
     * @throws {Error}
     */
    preprocessRoute(route) {
        /** @todo Implement User Context. */
        // if (route?.type === 'private' && !Context.User.isLoggedIn()) {
        //     Context.User.setLoginRedirect(this.getRoute());
        //     return this._findRoute('/login');
        // }
        // if (route?.type === 'public' && Context.User.isLoggedIn()) {
        //     const rv = this._findRoute('/');
        //     if (rv) {
        //         return rv;
        //     }
        // }
        if (!route) {
            return this.addDbRoute(this.getRoute()) ?? this.get404Route();
        }
        return route;
    }

    render404() {
        const route = this.get404Route();
        this.applyRoute(route);
    }

    renderRoute(_route = this.getCurrentRoute()) {
        const route = _route && this.preprocessRoute(_route);
        if (route && route !== _route && route.path !== '/404') {
            const url = route.url ?? route.path;
            window.history.replaceState(url, '', url);
        }
        this._currentRoute = route;
        route && (this.routeNode = this._renderRoute(route));
        return this.routeNode;
    }

    /**
     * Authorizes the route.
     * @param {RouteType} route
     * @returns {boolean}
     */
    authorizeRoute(route) {
        console.log('Authorizing route:', route);
        return true;
        /** @todo Implement User Context. */
        // const { accessGroups } = route;
        // const userGroup = Context.User.getAccessGroup();
        // return !accessGroups?.length || accessGroups.includes(userGroup);
    }

    /**
     * Renders the route.
     * @param {RouteType} route
     * @returns {HTMLElement}
     */
    _renderRoute(route) {
        let node;
        if (typeof route.render === 'function') {
            node = route.render();
        } else if (typeof route.component !== 'undefined' && typeof route.componentInstance === 'undefined') {
            this._instantiateRoute(route);
        }
        if (typeof route.componentInstance?.render === 'function') {
            node = route.componentInstance.render();
        }
        const { componentInstance } = route;
        if (typeof componentInstance?.initialize === 'function') {
            componentInstance.initialize();
        }
        return node;
    }

    /**
     * Instantiates the route.
     * @param {RouteType} route
     * @returns {void}
     */
    _instantiateRoute(route) {
        if (!route || !this.authorizeRoute(route)) {
            this.go('/');
            // Context.Messenger.error('You are not authorized to access this page.');
            return;
        }
        const config = mergeObjects(this.routeConfig, route.componentConfig ?? {});
        if (!config.pageContextConfig) {
            config.pageContextConfig = {};
        }
        route.componentInstance = new route.component(config);
    }

    /**
     * Exchanges the current page with the new one.
     * @param {any} newPage
     * @todo Implement Page and change any to Page.
     */
    _replacePage(newPage) {
        const content = newPage?.render();
        if (content && this?.routeNode?.parentNode) {
            this.routeNode.parentNode.replaceChild(content, this.routeNode);
            this.routeNode = content;
        }
    }

    // #endregion Routing

    /**
     * Adds an item to the history.
     * @param {RouteType} route
     * @returns {void}
     */
    _addItemToHistory(route) {
        route.url && (route.url = sanitizeURL(route.url));
        this.history.push(route);
    }

    _initializeProperties() {
        /** @type {string} this._route */
        this._route = this.getRoute();
        /** @type {string} */
        this.originalRoute = this._route;
        this._onNavigate = this._onNavigate.bind(this);
        this._onPopState = this._onPopState.bind(this);
    }

    _initializeRoutes() {
        this.getAllRoutesArray().forEach(route => this._setupRoute(route));
    }

    /**
     * Sets up a route.
     * @param {RouteType | (() => RouteType)} route
     */
    _setupRoute(route) {
        if (typeof route === 'function') route = route();
        const key = route.name || route.path;
        this.routesByName && key && (this.routesByName[key] = route);
    }

    initialize() {
        this._initializeRoute();
    }

    /**
     * Initializes the route.
     * @param {string | undefined} route
     * @returns {void}
     */
    _initializeRoute(route = this._route) {
        route && (this._currentRoute = this._findRoute(route));
    }

    /**
     * Finds a route by path.
     * @param {string} _route
     * @returns {RouteType | undefined}
     */
    _findRoute(_route) {
        const routes = this.getAllRoutes();
        for (const [routePath, route] of Object.entries(routes)) {
            if (matchPath(_route, routePath)) {
                return route;
            }
        }
    }

    /**
     * Adds a route.
     * @param {RouteType} _route
     * @returns {RouteType | undefined}
     * @throws {Error}
     */
    addRoute(_route) {
        const route = mergeObjects(this._config?.routeDefaults, _route);
        if (!route?.path) throw new Error('Route path is required.');
        if (!route?.type) throw new Error('Route type is required.');
        if (_route.path === this.getRoute()) {
            this._currentRoute = route;
        }
        if (this.routeExists(route.path)) return;
        this._addRoute(route);
        this._setupRoute(route);
        return route;
    }

    /**
     * Adds a route.
     * @param {RouteType} route
     * @returns {void}
     * @throws {Error}
     */
    _addRoute(route) {
        const type = route.type || '';
        const path = route.path || '';
        if (!type) throw new Error('Route type is required.');
        const routes = this._config?.routes || {};
        if (!routes[type]) routes[type] = {};
        // @ts-ignore
        routes[type][path] = route;
    }
    /**
     * Replaces the current route content with the passed one, without any preprocessing or URL change.
     * @param {*} route
     */
    applyRoute(route) {
        this._currentRoute = route;
        const node = this._renderRoute(route);
        if (this.routeNode) {
            this.routeNode.parentNode.replaceChild(node, this.routeNode);
        }
        this.routeNode = node;
    }

    /**
     * Adds a database route.
     * @param {string} path
     * @returns {RouteType | undefined}
     */
    addDbRoute(path) {
        if (!this._config?.hasDatabaseRoutes) {
            return;
        }
        const existing = this._findRoute(path);
        if (existing) {
            return;
        }
        return this.addRoute({
            path,
            /**
             * @todo Implement Page functionality and uncomment line below.
             */
            // component: Page,
            pageConfig: {
                id: path,
                path
            }
        });
    }

    /**
     * Deletes a route.
     * @param {string} path
     * @returns {void}
     */
    deleteRoute(path) {
        const route = this._findRoute(path);
        if (!route) return;
        if (route.type) {
            const typeRoutes = this.getRoutesByType(route.type);
            typeRoutes && route.path && delete typeRoutes[route.path];
        }
        route.name && delete this.routesByName[route.name];
    }

    /**
     * Sets the route.
     * @param {string} route
     */
    setRoute(route) {
        this.hasRouteChanged = true;
        this._route = sanitizeURL(route);
    }

    /////////////////////////////
    // #region Getters
    /////////////////////////////

    get404Route() {
        const route = this._findRoute('/404');
        if (!route) {
            throw Error('No route found, make sure you define a 404 route via Router.addRoute');
        }
        return route;
    }

    getCurrentRoute() {
        return this._currentRoute;
    }

    getPrevRoute() {
        return this._previousRoute;
    }

    getAllRoutesArray() {
        return Object.values(this.getAllRoutes());
    }

    /**
     * Returns all the paths of the routes of a specific type.
     * @param {RouteTypeType} routeType
     * @returns {string[]}
     */
    getAllRoutePaths(routeType) {
        const typeRoutes = this.getRoutesByType(routeType);
        return (typeRoutes && Object.keys(typeRoutes).map(route => typeRoutes[route]?.path || '')) || [];
    }

    /**
     * Returns the routes of a specific type.
     * @param {RouteTypeType} routeType
     * @returns {Record<string, RouteType> | undefined}
     */
    getRoutesByType(routeType) {
        return this._config?.routes?.[routeType];
    }

    getAllRoutes() {
        return {
            ...(this._config?.routes?.public ?? {}),
            ...(this._config?.routes?.private ?? {}),
            ...(this._config?.routes?.common ?? {}),
            ...(this._config?.routes?.dev ?? {})
        };
    }

    /**
     * Returns the previous URL.
     * @returns {string | undefined}
     */
    getPreviousURL() {
        const historyItem = this.history[this.history.length - 2];
        return historyItem?.url;
    }

    /**
     * Returns the previous route path.
     * @returns {string}
     */
    getPreviousPath() {
        return getURLPath(this.getPreviousURL());
    }

    /**
     * Returns the original URL.
     * @returns {string}
     */
    getOriginalURL() {
        return sanitizeURL(this.originalURL);
    }

    /**
     * Returnst the current route.
     * @returns {string}
     */
    getRoute() {
        return sanitizeURL(window.location.href);
    }
    //////////////////////////////////
    // #endregion Getters
    //////////////////////////////////

    //////////////////////////////////
    // #region Is
    //////////////////////////////////

    /**
     * Returns true if the route doesn't require authentication to be accessed.
     * @param {string} route
     * @returns {boolean}
     */
    isPublicRoute(route = this.getRoute()) {
        return matchPaths(route, this.getAllRoutePaths('public'));
    }

    /**
     * Returns true if the route requires authentication to be accessed.
     * @param {string} route
     * @returns {boolean}
     */
    isPrivateRoute(route = this.getRoute()) {
        return matchPaths(route, this.getAllRoutePaths('private'));
    }

    isPopState() {
        return this._currentRoute?.isPopState;
    }

    /**
     * Returns true if the route is a common route.
     * @param {string} route
     * @returns {boolean}
     */
    isCommonRoute(route = this.getRoute()) {
        return matchPaths(route, this.getAllRoutePaths('common'));
    }

    /**
     * Returns true if the route is a development route.
     * @param {string} route
     * @returns {boolean}
     */
    isDevRoute(route = this.getRoute()) {
        return matchPaths(route, this.getAllRoutePaths('dev'));
    }

    /**
     * Returns true if the route is the home route.
     * @param {string} route
     * @returns {boolean}
     */
    isHome(route = this.getRoute()) {
        return matchPath(route, '/');
    }

    /**
     * Return s true if the route is the logout route.
     * @param {string} route
     * @returns {boolean}
     */
    isLogout(route = this.getRoute()) {
        return matchPath(route, '/logout');
    }

    /**
     * Returns true if the route is the login route.
     * @param {string} route
     * @returns {boolean}
     */
    isLogin(route = this.getRoute()) {
        return matchPath(route, '/login');
    }

    //////////////////////////////////
    // #endregion Is
    //////////////////////////////////

    /**
     * Navigates to the specified route.
     * @param {string} _url
     * @param {Record<string, any>} [params]
     * @param {Record<string, any>} [config]
     * @param {boolean} [encode]
     * @returns {Promise<Record<string, any>>}
     */
    async go(_url, params = {}, config = {}, encode = true) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                const url = editURL(_url, params, encode);
                const route = this._findRoute(url);
                if (route) {
                    route.isPopState = false;
                    route.url = url;
                }
                window.history.pushState(url, '', url);
                this._onRouteChange(route, undefined, config).then(resolve);
            });
        });
    }

    refreshPage() {
        this.go(window.location.href, {}, { refreshAll: true }, false);
    }

    goToParent() {
        const parentPath = getParentPath(this.getRoute());
        this.go(parentPath);
    }

    /**
     * Returns the route params.
     * @param {RouteType} [route]
     * @returns {Record<string, any>}
     */
    getRouteParams(route = this.getCurrentRoute()) {
        if (!route) {
            return {};
        }
        const urlParts = getPathParts(route.url);
        const pathParts = getPathParts(route.path);
        /** @type {Record<string, any>} */
        const params = {};
        /**
         * Processes a part of the path.
         * @param {string} pathPart
         * @param {number} index
         */
        const processPart = (pathPart, index) => {
            if (pathPart.startsWith(':')) {
                params[pathPart.substr(1)] = urlParts[index];
            }
        };
        pathParts.forEach(processPart);
        return params;
    }

    setRouteConfig(config = {}) {
        this.routeConfig = config;
    }

    fetchRoutes() {
        if (!this._config?.hasDatabaseRoutes) {
            return Promise.resolve({});
        }
        return APIService.fetch('/api/core/get-routes').then(response => {
            const routes = response?.value?.payload ?? {};
            for (const [routePath] of Object.entries(routes)) {
                this.addDbRoute(`/${routePath}`);
            }
            return Promise.resolve(response);
        });
    }

    /**
     * Returns true if the route exists.
     * @param {string} path
     * @returns {boolean}
     */
    routeExists(path) {
        const route = this._findRoute(path);
        return Boolean(route);
    }
}

export default Router;

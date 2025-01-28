import { CallableType } from '@arpadroid/tools';

export type RouteTypeType = 'public' | 'private' | 'common' | 'dev';

export type RouterConfigType = {
    basePath?: string;
    routes?: RoutesType;
    preprocessRoute?: (route: string, queryParams: Record<string, string>) => string;
    context?: Record<string, unknown>;
    hasDatabaseRoutes?: boolean;
    routeDefaults?: RouteType;
};

export type RoutesType = {
    public?: Record<string, RouteType>;
    private?: Record<string, RouteType>;
    common?: Record<string, RouteType>;
    dev?: Record<string, RouteType>;
};

export type RouteType = {
    path?: string;
    url?: string;
    isPopState?: boolean;
    previousRoute?: RouteType;
    name?: string;
    type?: RouteTypeType;
    render?: () => HTMLElement;
    content?: HTMLElement | string | (() => HTMLElement | string) | (() => Promise<HTMLElement | string>);
    componentInstance?: CallableType;
    component?: CallableType;
    componentConfig?: Record<string, unknown>;
    pageConfig?: Record<string, unknown>;
};


export type HistoryItemType = {
    url: string;
    title?: string;
    state?: Record<string, unknown>;
};

export type HistoryType = RouteType[];

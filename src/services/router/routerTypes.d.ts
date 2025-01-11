export type RouteTypeInterface = 'public' | 'private' | 'common' | 'dev';

export interface RouterInterface {
    basePath?: string;
    routes?: RoutesInterface;
    preprocessRoute?: (route: string, queryParams: Record<string, string>) => string;
}

export interface RoutesInterface {
    public?: Record<string, RouteInterface>;
    private?: Record<string, () => RouteInterface>;
    common?: Record<string, () => RouteInterface>;
    dev?: Record<string, () => RouteInterface>;
}

export interface RouteInterface {
    path: string;
    url?: string;
    name?: string;
    type?: RouteTypeInterface;
    render?: () => HTMLElement;
    content?: HTMLElement | string | (() => HTMLElement | string) | (() => Promise<HTMLElement | string>);
}

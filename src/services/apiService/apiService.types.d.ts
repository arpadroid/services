export type HeadersType = {
    authorization?: string;
    'Content-Type'?: string;
    Accept?: string;
    'Cache-Control'?: string;
    Pragma?: string;
    Expires?: string;
    format?: string;
    accept?: string;
};

export type APIServiceConfigType = {
    method?: string;
    query?: Record<string, string>;
    body?: Record<string, unknown> | [];
    headers?: Partial<HeadersType>;
};

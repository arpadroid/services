export interface APIServiceInterface {
    method: string,
    query?: Record<string, string>,
    body?: Record<string, unknown> | [],
    headers?: Record<string, string>,
}
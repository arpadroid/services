import { mergeObjects, editURL } from '@arpadroid/tools';
/**
 * @typedef {import('./apiService.types').APIServiceConfigType} APIServiceConfigType
 * @typedef {import('./apiService.types').HeadersType} HeadersType
 */

class APIService {
    /**
     * Returns the configuration for the service.
     * @param {APIServiceConfigType} config
     * @returns {APIServiceConfigType}
     */
    static getConfig(config = {}) {
        return mergeObjects(APIService.getDefaultConfig(config.method), config);
    }

    /**
     * Returns the default configuration for the service.
     * @param {string} method
     * @returns {APIServiceConfigType}
     */
    static getDefaultConfig(method = 'GET') {
        return {
            method: 'GET',
            headers:
                method?.toLowerCase() === 'post' ? APIService.getDefaultPostHeaders() : APIService.getDefaultHeaders(),
            query: {}
        };
    }

    /**
     * Returns the default headers for the service.
     * @returns {HeadersType}
     */
    static getDefaultHeaders() {
        return {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            format: 'json'
        };
    }

    static getDefaultPostHeaders() {
        return {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
    }

    /**
     * Preprocesses a URL by replacing placeholders with values from the params object.
     * @param {string} url - The URL to preprocess.
     * @param {Record<string, unknown>} params - The parameters to replace in the URL.
     * @returns {string} - The preprocessed URL.
     */
    static preprocessURL(url, params = {}) {
        for (const [key, value] of Object.entries(params)) {
            if (url.indexOf(`{${key}}`) !== -1) {
                url = url.replace(`{${key}}`, String(value));
                delete params[key];
            }
        }
        return editURL(url, params);
    }

    /**
     * Fetches a resource from the API with GET.
     * @param {string} url
     * @param {APIServiceConfigType} _config
     * @returns {Promise<Record<string, any>>}
     */
    static async fetch(url, _config = {}) {
        const config = APIService.getConfig(_config);
        return fetch(APIService.preprocessURL(url, config.query), {
            headers: config.headers,
            method: config.method,
            body: config.body ? JSON.stringify(config.body) : undefined
        })
            .then(response => APIService.onFetched(response))
            .catch(response => APIService.onFetchError(response));
    }

    /**
     * Fetches a resource from the API with OPTIONS method.
     * @param {string} url
     * @param {APIServiceConfigType} config
     * @returns {Promise<Record<string, any>>}
     */
    static options(url, config = {}) {
        config.method = 'OPTIONS';
        return APIService.fetch(url, config);
    }

    /**
     * POSTs to the API.
     * @param {string} url
     * @param {APIServiceConfigType} config
     * @returns {Promise<Record<string, any>>}
     */
    static post(url, config = {}) {
        config.method = 'POST';
        return APIService.fetch(url, config);
    }

    /**
     * PUTs to the API.
     * @param {string} url
     * @param {APIServiceConfigType} config
     * @returns {Promise<Record<string, any>>}
     */
    static put(url, config = {}) {
        config.method = 'PUT';
        return APIService.fetch(url, config);
    }

    /**
     * DELETEs from the API.
     * @param {string} url
     * @param {APIServiceConfigType} config
     * @returns {Promise<Record<string, any>>}
     */
    static delete(url, config = {}) {
        config.method = 'DELETE';
        return APIService.fetch(url, config);
    }

    /**
     * Handles the fetch response.
     * @param {Record<string, any>} response
     * @returns {Promise<Record<string, any>>}
     */
    static async onFetched(response) {
        if (response.status === 500) {
            return Promise.reject(response);
        }
        response.value = await APIService.onFetchSuccess(response);
        return Promise.resolve(response);
    }

    static onFetchError(response = {}) {
        return Promise.reject(response);
    }

    /**
     * Handles the fetch success.
     * @param {Record<string, any>} response
     * @returns {Promise<unknown>}
     */
    static async onFetchSuccess(response) {
        let rv = await response.text();
        if (rv && rv.trim().length) {
            try {
                rv = JSON.parse(rv);
            } catch (err) {
                console.error(err);
            }
        }
        response.value = rv;
        return response.ok ? rv : Promise.reject(response);
    }

    /**
     * Downloads a file from the API.
     * @param {string} url
     * @param {Record<string, unknown>} queryParams
     * @returns {Promise<Response>}
     */
    static download(url, queryParams = {}) {
        url = APIService.preprocessURL(url, queryParams);
        const headers = APIService.addAuth({
            'Content-Type': 'application/octet-stream; charset=UTF-8',
            accept: '*/*'
        });
        return fetch(url, { headers, method: 'GET' }).then(response => {
            return APIService.handleDownload(response);
        });
    }

    /**
     * Handles the download response.
     * @param {Response} response
     * @returns {Promise<Response>}
     */
    static handleDownload(response) {
        const contentDisposition = response.headers.get('content-disposition') || '';
        const [, filename] = contentDisposition.split('filename=');
        return response.blob().then(blob => {
            APIService.openFile(blob, filename);
            return response;
        });
    }

    /**
     * Opens a file in the browser.
     * @param {Blob} blob
     * @param {string} filename
     * @returns {void}
     */
    static openFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Uploads a file to the API.
     * @param {string} url
     * @param {File} file
     * @param {Record<string, string>} headers
     * @returns {Promise<Response>}
     */
    static upload(url, file, headers = {}) {
        const body = new FormData();
        body.append('file', file);
        return fetch(url, { headers, body, method: 'POST' });
    }

    /**
     * Sets the bearer token from the headers.
     * @param {Headers} headers
     * @returns {void}
     */
    static setAuthToken(headers) {
        const token = headers?.get('authorization');
        if (token) {
            localStorage.setItem('auth-bearer-token', token);
        }
    }

    /**
     * Adds auth headers to the request.
     * @param {HeadersType} headers
     * @returns {HeadersType}
     */
    static addAuth(headers) {
        const bearerToken = localStorage.getItem('auth-bearer-token');
        headers && (headers.authorization = bearerToken || '');
        return headers;
    }
}

export default APIService;

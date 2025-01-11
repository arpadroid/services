import { mergeObjects, editURL } from '@arpadroid/tools';
/**
 * @typedef {import('./apiServiceInterface').APIServiceInterface} APIServiceInterface
 */

class APIService {
    static getConfig(config = {}) {
        return mergeObjects(APIService.getDefaultConfig(), config);
    }

    static getDefaultConfig() {
        const config = {
            method: 'GET',
            headers: APIService.getDefaultHeaders(),
            query: {},
            body: null
        };
        if (config?.method?.toLowerCase() === 'post') {
            config.headers = APIService.getDefaultPostHeaders();
        }
        return config;
    }

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

    static preprocessURL(url, params = {}) {
        for (const [key, value] of Object.entries(params)) {
            if (url.indexOf(`{${key}}`) !== -1) {
                url = url.replace(`{${key}}`, value);
                delete params[key];
            }
        }
        return editURL(url, params);
    }

    /**
     * Fetches a resource from the API with GET.
     * @param {string} url
     * @param {APIServiceInterface} _config
     * @returns {Promise<Response>}
     */
    static async fetch(url, _config = {}) {
        const config = APIService.getConfig(_config);
        return fetch(APIService.preprocessURL(url, config.query), {
            headers: config.headers,
            method: config.method,
            body: config.body
        })
            .then(response => APIService.onFetched(response))
            .catch(response => APIService.onFetchError(response, url, config));
    }

    /**
     * Fetches a resource from the API with OPTIONS method.
     * @param {string} url
     * @param {APIServiceInterface} config
     * @returns {Promise<Response>}
     */
    static options(url, config = {}) {
        config.method = 'OPTIONS';
        return APIService.fetch(url, config);
    }

    /**
     * POSTs to the API.
     * @param {string} url
     * @param {APIServiceInterface} config
     * @returns {Promise<Response>}
     */
    static post(url, config = {}) {
        config.method = 'POST';
        return APIService.fetch(url, config);
    }

    /**
     * PUTs to the API.
     * @param {string} url
     * @param {APIServiceInterface} config
     * @returns {Promise<Response>}
     */
    static put(url, config = {}) {
        config.method = 'PUT';
        return APIService.fetch(url, config);
    }

    /**
     * DELETEs from the API.
     * @param {string} url
     * @param {APIServiceInterface} config
     * @returns {Promise<Response>}
     */
    static delete(url, config = {}) {
        config.method = 'DELETE';
        return APIService.fetch(url, config);
    }

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

    static async onFetchSuccess(response = {}) {
        let rv = await response.text();
        if (rv && rv.trim().length) {
            try {
                rv = JSON.parse(rv);
            } catch (err) {
                // nothing to show
            }
        }
        response.value = rv;
        return response.ok ? rv : Promise.reject(response);
    }

    static download(url, queryParams = {}) {
        url = APIService.preprocessUrl(url, queryParams);
        const headers = APIService.addAuth({
            'Content-Type': 'application/octet-stream; charset=UTF-8',
            accept: '*/*'
        });
        return fetch(url, { headers, method: 'GET' }).then(response => {
            return APIService.handleDownload(response);
        });
    }

    static handleDownload(response) {
        const [, filename] = response.headers['content-disposition'].split('filename=');
        return response.blob().then(blob => {
            APIService.openFile(blob, filename);
            return response;
        });
    }

    static upload(url, file, headers = {}) {
        const body = new FormData();
        body.append('file', file);
        return fetch(url, { headers, body, method: 'POST' });
    }

    static setAuthToken(headers = {}) {
        const token = headers.get('authorization');
        if (token) {
            localStorage.setItem('auth-bearer-token', token);
        }
    }

    static addAuth(headers = {}) {
        const bearerToken = localStorage.getItem('auth-bearer-token');
        headers.authorization = bearerToken;
        return headers;
    }
}

export default APIService;

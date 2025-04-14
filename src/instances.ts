// see https://github.com/MathMan05/JankClient/blob/5b5d15c99c78d710d7b961451aecbe0ca8f1b672/src/utils.ts#L22-L67

import { SpacebarInfo, InstanceInfo, DomainsInfo } from './types';
import { normalizeUrl } from './util';

const validateInstanceUrl = (url: URL, instances: InstanceInfo[]) => {
    for (const instance of instances) {
        const instanceUrl = instance.url || instance.urls?.api;
        if (!instanceUrl) {
            continue;
        }
        try {
            // only check if hostname matches
            if (new URL(instanceUrl).host === url.host) {
                return; // hostname found, valid
            }
        } catch (ignored) {
        }
    }
    throw new Error(`Unknown instance: ${url}`);
};

export const getApiInfo = async (url: URL, instances: InstanceInfo[], check = true): Promise<SpacebarInfo> => {
    if (check) {
        validateInstanceUrl(url, instances);
    }

    // fetch spacebar url info
    url.pathname = '/.well-known/spacebar';
    const info: SpacebarInfo = await fetch(url)
            .then(resp => resp.json());

    // fetch domain info from instance itself
    const apiUrl = normalizeUrl(info.api);
    if (!apiUrl.pathname.includes('api')) apiUrl.pathname += '/api';
    apiUrl.pathname += '/policies/instance/domains';
    const domains: DomainsInfo = await fetch(apiUrl)
            .then(resp => resp.json());

    // return spacebar url info with replaced api url
    return {
        api: normalizeUrl(domains.apiEndpoint).toString(),
        gateway: normalizeUrl(domains.gateway).toString(),
        cdn: normalizeUrl(domains.cdn).toString(),
        wellknown: normalizeUrl(url).toString()
    };
};

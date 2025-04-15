// add trailing / to pathname if missing
export const normalizeUrl = (url: string | URL): URL => {
    const urlObj = new URL(url);
    if (!urlObj.pathname.endsWith('/')) {
        urlObj.pathname += "/";
    }
    return urlObj;
};

// remove trailing / from pathname
export const normalizeUrl = (url: string | URL): URL => {
    const urlObj = new URL(url);
    if (urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.substring(0, urlObj.pathname.length - 1);
    }
    return urlObj;
};

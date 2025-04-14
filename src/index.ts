import { buildInviteResponse } from './invites';

const defaultHandler = {
    async fetch(request, env, ctx): Promise<Response> {
        const url = new URL(request.url);
        switch (url.pathname) {
            case '/':
                url.pathname = 'home.html';
                return env.ASSETS.fetch(url);
            case '/instances.json':
            case '/uptime':
                // TODO is it possible to track uptime in a serverless environment?
                return fetch(`https://jank.booky.dev${url.pathname}`);
            case '/services/oembed':
                const inviteResponse = await buildInviteResponse(request, env);
                return new Response(JSON.stringify(inviteResponse), {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            default:
                // special invite SPA
                if (url.pathname.startsWith('/invite/')) {
                    url.pathname = '/invite.html';
                }
                return env.ASSETS.fetch(request);
        }
    }
} satisfies ExportedHandler<Env>;

export default {
    async fetch(request, env, ctx): Promise<Response> {
        // fetch normal response
        const resp = await defaultHandler.fetch(request, env, ctx);
        // build oembed link string and inject into a new set of headers
        const oembedLink = new URL('/services/oembed', request.url);
        oembedLink.searchParams.set('url', request.url);
        const newHeaders = new Headers(resp.headers);
        newHeaders.set('Link', `<${oembedLink.toString()}>; rel="alternate"; type="application/json+oembed"; title="Jank Client oEmbed format"`);
        // re-build response object
        return new Response(resp.body, {
            status: resp.status,
            statusText: resp.statusText,
            headers: newHeaders
        });
    }
} satisfies ExportedHandler<Env>;

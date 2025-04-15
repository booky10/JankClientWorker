import { buildInviteResponse } from './invites';
import { checkHealthForAll, loadUptimeData } from './uptime';
import { InstanceInfo, InstanceUptimeInfo } from './types';

const handleDefaultFetch: ExportedHandler<Env>['fetch'] = async (request, env, _ctx) => {
    const url = new URL(request.url);
    switch (url.pathname) {
        case '/':
            url.pathname = 'home.html';
            return env.ASSETS.fetch(url);
        case '/instances.json':
            const instances: InstanceInfo[] = await env.ASSETS.fetch(url)
                    .then(resp => resp.json());
            const uptimeData = await loadUptimeData(env);
            const instancesWithUptime: (InstanceInfo | InstanceUptimeInfo)[] = [];
            instances.forEach(instance => instancesWithUptime.push({
                ...instance, ...uptimeData[instance.name]?.uptime
            }));
            return new Response(JSON.stringify(instancesWithUptime), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        case '/uptime':
            const instance = url.searchParams.get('name');
            if (!instance) {
                // missing instance name
                return new Response('400 Bad Request', { status: 400 });
            }
            const uptimeInfo = (await loadUptimeData(env))[instance];
            if (!uptimeInfo) {
                // unknown instance
                return new Response('404 Not Found', { status: 404 });
            }
            return new Response(JSON.stringify(uptimeInfo.entries), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
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
            // prevent cloudflare doing a redirect on .html files (just removes the .html suffix)
            if (url.pathname.endsWith('.html')) {
                url.pathname = url.pathname.substring(0, url.pathname.length - '.html'.length);
            }
            return env.ASSETS.fetch(request);
    }
};

export default {
    async scheduled(_controller, env, _ctx) {
        // I hope this hack works in production...
        const instances: InstanceInfo[] = await env.ASSETS.fetch('http://127.0.0.1/instances.json')
                .then(resp => resp.json());
        await checkHealthForAll(env, instances);
    },
    async fetch(request, env, ctx): Promise<Response> {
        // fetch normal response
        const resp = await handleDefaultFetch(request, env, ctx);
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

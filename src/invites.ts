// see https://github.com/MathMan05/JankClient/blob/5b5d15c99c78d710d7b961451aecbe0ca8f1b672/src/utils.ts#L69-L128

import { getApiInfo } from './instances';
import { InstanceInfo, InviteInfo } from './types';
import { normalizeUrl } from './util';

const fetchInviteInfo = async (request: Request, env: Env) => {
    let url = normalizeUrl(request.url);
    if (url.searchParams.has('url')) {
        url = normalizeUrl(url.searchParams.get('url')!!);
    }

    if (!url.pathname.startsWith('/invite/')) {
        throw new Error(`Invalid invite URL: ${url}`);
    }
    let code = url.pathname.substring('/invite/'.length);
    if (!code) {
        throw new Error(`Missing invite code in invite: ${url}`);
    }
    const slashIndex = code.indexOf('/');
    if (slashIndex >= 0) {
        code = code.substring(0, slashIndex);
    }

    const instance = url.searchParams.get('instance');
    if (!instance || !URL.canParse(instance)) {
        throw new Error(`Missing or invalid instance in invite: ${url}`);
    }

    // this is a serverless environment, fetch own instances data
    const instancesUrl = new URL('/instances.json', request.url);
    const instances: InstanceInfo[] = await env.ASSETS.fetch(instancesUrl)
            .then(resp => resp.json());

    // extract instance api info and check it's a known instance
    const urlInfo = await getApiInfo(new URL(instance), instances, true);

    // fetch invitation info
    const invite: InviteInfo = await fetch(`${urlInfo.api}invites/${code}`)
            .then(resp => resp.json());

    return { urlInfo, invite };
};

const buildInviteData = async (request: Request, env: Env) => {
    const { urlInfo, invite } = await fetchInviteInfo(request, env);

    const guildName = invite.guild.name;
    const guildDescription = invite.guild.description ? `\n${invite.guild.description}` : '';
    const description = invite.inviter
            ? `${invite.inviter.username} has invited you to ${guildName}${guildDescription}`
            : `You've been invited to ${guildName}${guildDescription}`;
    const guildIconUrl = !invite.guild.icon ? '' :
            `${urlInfo.cdn}icons/${invite.guild.id}/${invite.guild.icon}.png`;

    return {
        type: 'link',
        version: '1.0',
        title: guildName,
        thumbnail: guildIconUrl,
        description
    };
};

export const buildInviteResponse = async (request: Request, env: Env) => {
    try {
        return await buildInviteData(request, env);
    } catch (error) {
        return {
            type: 'link',
            version: '1.0',
            title: 'Jank Client',
            thumbnail: '/logo.webp',
            description: 'A spacebar client has DMs, replying and more'
        };
    }
};

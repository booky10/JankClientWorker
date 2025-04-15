// see https://github.com/MathMan05/JankClient/blob/5b5d15c99c78d710d7b961451aecbe0ca8f1b672/src/utils.ts#L3-L20

export type SpacebarInfo = {
    api: string;
    gateway: string;
    cdn: string;
    wellknown: string;
}

export type DomainsInfo = {
    cdn: string;
    gateway: string;
    defaultApiVersion: string;
    apiEndpoint: string;
}

export type InviteInfo = {
    guild: {
        name: string;
        description?: string;
        icon?: string;
        id: string;
    };
    inviter?: {
        username: string;
    };
}

export type InstanceInfo = {
    name: string;
    description?: string;
    descriptionLong?: string;
    image?: string;
    url?: string;
    language: string;
    country: string;
    display: boolean;
    urls?: {
        wellknown: string;
        api: string;
        cdn: string;
        gateway: string;
        login?: string;
    };
    contactInfo?: {
        discord?: string;
        github?: string;
        email?: string;
        spacebar?: string;
        matrix?: string;
        mastodon?: string;
    };
};

// see https://github.com/MathMan05/JankClient/blob/5b5d15c99c78d710d7b961451aecbe0ca8f1b672/src/stats.ts#L10-L25
export type UptimeEntry = {
    time: number;
    online: boolean;
}
export type UptimeData = {
    [instance: string]: {
        entries: UptimeEntry[];
        uptime: InstanceUptimeInfo;
        lastCheck: number;
    }
}

export type InstanceUptimeInfo = {
    online: boolean;
    uptime: {
        daytime: number;
        weektime: number;
        alltime: number;
    }
}

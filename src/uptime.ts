import { InstanceInfo, InstanceUptimeInfo, UptimeData, UptimeEntry } from './types';
import { getApiInfo } from './instances';
import { normalizeUrl } from './util';

const KV_KEY = 'data';

export const loadUptimeData = async (env: Env) => {
    const data = await env.UPTIME.get<UptimeData>(KV_KEY, 'json');
    return data ?? {} as UptimeData;
};

const saveUptimeData = async (env: Env, data: UptimeData) => {
    await env.UPTIME.put(KV_KEY, JSON.stringify(data));
};

const extractApiUrl = async (instance: InstanceInfo) => {
    const apiUrl = instance.urls?.api;
    if (apiUrl) {
        return apiUrl;
    } else if (instance.url) {
        return (await getApiInfo(new URL(instance.url), [], false))?.api;
    }
    return undefined;
};

export const checkHealthForAll = async (env: Env, instances: InstanceInfo[]) => {
    // load existing data from KV
    const data = await loadUptimeData(env);
    // run health checks in parallel
    const checkers = instances.map(instance => checkHealth(data, instance));
    const results = await Promise.all(checkers);
    // check results and save data to KV if anything was updated
    const anyUpdate = results.find(updated => updated);
    if (anyUpdate) {
        await saveUptimeData(env, data);
    }
};

const UNHEALTHY_CHECK_INTERVAL = 1000 * 60 * 5; // 5min
const HEALTHY_CHECK_INTERVAL = 1000 * 60 * 30; // 30min

const shouldCheckHealth = (data: UptimeData, instance: InstanceInfo) => {
    const info = data[instance.name];
    if (!info) {
        return true; // no entry yet, check!
    }
    const checkDiff = Date.now() - info.lastCheck;
    const checkInterval = info.uptime.online ? HEALTHY_CHECK_INTERVAL : UNHEALTHY_CHECK_INTERVAL;
    return checkDiff > checkInterval;
};

const checkHealth = async (data: UptimeData, instance: InstanceInfo) => {
    if (!shouldCheckHealth(data, instance)) {
        return false; // don't check this time
    }
    const apiUrl = await extractApiUrl(instance);
    if (!apiUrl) {
        // no api url resolvable, unhealthy
        updateHealth(data, instance, false);
        return true; // changed
    }
    const pingUrl = normalizeUrl(apiUrl);
    pingUrl.pathname += 'ping';
    // fetch head of ping endpoint
    const response = await fetch(pingUrl, { method: 'HEAD' });
    updateHealth(data, instance, response.ok);
    return true; // changed
};

const updateHealth = (data: UptimeData, instance: InstanceInfo, health: boolean) => {
    let info = data[instance.name];
    const entries = info?.entries ?? [];
    // record entry change
    if (!info || !info.entries.length || info.entries[info.entries.length - 1].online !== health) {
        console.log(`Instance ${instance.name} went ${health ? 'up' : 'down'}`);
        entries.push({ time: Date.now(), online: health });
    } else if (!health) {
        console.log(`Instance ${instance.name} still down`);
    }
    // always re-recalculate stats
    const uptime = calcStats(entries);
    if (info) {
        // just update stats
        info.uptime = uptime;
        info.lastCheck = Date.now();
    } else {
        // create new data entry
        info = { entries, uptime, lastCheck: Date.now() };
        data[instance.name] = info;
    }
};

const calcStats = (entries: UptimeEntry[]): InstanceUptimeInfo => {
    if (entries.length === 1) {
        // work around division by zero
        return {
            online: true,
            uptime: {
                daytime: 1,
                weektime: 1,
                alltime: 1
            }
        };
    }

    const now = Date.now();
    const prevDay = now - 1000 * 60 * 60 * 24;
    const prevWeek = now - 1000 * 60 * 60 * 24 * 7;

    let totalTimePassed = 0;
    let alltime = 0;
    let daytime = 0;
    let weektime = 0;
    let online = false;

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        online = entry.online;
        const stamp = entry.time;
        const nextStamp = entries[i + 1]?.time || now;
        const timePassed = nextStamp - stamp;

        totalTimePassed += timePassed;
        alltime += Number(online) * timePassed;

        if (stamp + timePassed > prevWeek) {
            const weekTimePassed = Math.min(timePassed, nextStamp - prevWeek);
            weektime += Number(online) * weekTimePassed;

            if (stamp + timePassed > prevDay) {
                const dayTimePassed = Math.min(weekTimePassed, nextStamp - prevDay);
                daytime += Number(online) * dayTimePassed;
            }
        }
    }

    const uptime = calculateUptimeStats(
            totalTimePassed, alltime, daytime, weektime, online);
    return { online, uptime };
};

const calculateUptimeStats = (
        totalTimePassed: number,
        alltime: number,
        daytime: number,
        weektime: number,
        online: boolean
) => {
    const dayInMs = 1000 * 60 * 60 * 24;
    const weekInMs = dayInMs * 7;

    alltime /= totalTimePassed;

    if (totalTimePassed > dayInMs) {
        daytime = daytime || (online ? dayInMs : 0);
        daytime /= dayInMs;

        if (totalTimePassed > weekInMs) {
            weektime = weektime || (online ? weekInMs : 0);
            weektime /= weekInMs;
        } else {
            weektime = alltime;
        }
    } else {
        weektime = alltime;
        daytime = alltime;
    }

    return { daytime, weektime, alltime };
};

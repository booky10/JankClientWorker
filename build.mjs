#!/usr/bin/env node

import fs from 'node:fs';
import * as child_process from 'node:child_process';

/**
 * @returns {Promise<void>}
 */
const execCommand = (/**string*/command, /**string[]*/args, dir = process.cwd()) => {
    console.log(`+ [${[command, ...args].join(', ')}] in "${dir}"`);
    const process = child_process.spawn(command, args, {
        cwd: dir, stdio: ['ignore', 'inherit', 'inherit']
    });
    return new Promise((resolve, reject) => {
        process.once('exit', resolve);
        process.on('error', reject);
    });
};

console.log('Updating client submodule and cleaning up...');
await execCommand('git', ['submodule', 'update', '--init']);
await execCommand('git', ['clean', '-dfX'], 'client');

console.log('Installing client submodule dependencies...');
await execCommand('npm', ['install'], 'client');

console.log('Building jankclient distribution files...');
await execCommand('npm', ['run', 'build'], 'client');

console.log('Copying jankclient static distribution files to own distribution dir...');
fs.rmSync('dist', { recursive: true });
fs.cpSync('client/dist/webpage', 'dist', { recursive: true });

console.log('Fetching common spacebar instances and combining them...');
const instancesFile = 'dist/instances.json';
const /**any[]*/jankInstances = JSON.parse(fs.readFileSync(instancesFile).toString());
const instancesResponse = await fetch(
        'https://raw.githubusercontent.com/spacebarchat/spacebarchat/master/instances/instances.json');
const /**any[]*/instancesJson = await instancesResponse.json();
instancesJson.forEach(instance => {
    const existingInstance = jankInstances.find(jankInstance => jankInstance.name === instance.name);
    if (!existingInstance) {
        jankInstances.push(instance);
    } else {
        // merge the two instance objects
        Object.keys(instance)
                .filter(key => !(key in existingInstance))
                .forEach(key => existingInstance[key] = instance[key]);
    }
});
fs.writeFileSync(instancesFile, JSON.stringify(jankInstances));

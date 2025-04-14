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

# JankClientCF

Uses Cloudflare Pages/Workers for fast deployment

## Self-hosting

Because this uses Cloudflare Workers, you will need to have a Cloudflare Account. I would recommend forking this
repository, as you will need to change the Cloudflare Wrangler configuration file.

1. Install yarn dependencies: `yarn install`
2. Build static jank client distribution files: `yarn run build`
3. Create uptime KV namespace: `yarn wrangler kv namespace create UPTIME` - change the `id` in
   the `wrangler.jsonc` file to the `id` shown in the command output.
4. Deploy: `yarn run deploy`

To update, update the git repository first. Then execute the above steps again, but leave out step three.

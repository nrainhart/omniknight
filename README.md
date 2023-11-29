# `Omniknight`

Omniknight is a port of [y-websocket](https://github.com/yjs/y-websocket) that runs on the [Cloudflare Workers](https://workers.cloudflare.com/) ecosystem,
leveraging [Durable Objects](https://developers.cloudflare.com/durable-objects/) to coordinate clients.

## How to run

You need to have node installed on your local environment, then run:

```
npm i
npm start
```

## How to deploy

```
npm run publish
```

As part of the process, you'll be asked to log into Cloudflare, if you aren't already.
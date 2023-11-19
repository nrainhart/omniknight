import { channelNameFromRequest } from "./channel";
import index from "./index.html";

export { Channel } from "./channel";

export async function handleRequest(
	request: Request,
	env: Env,
	context: ExecutionContext
): Promise<Response> {
	const url = new URL(request.url);

	if (isIndex(request, url)) return html(index);

	if (isWebsocket(request, url)) return handleWebsockets(request, env);

	return new Response(null, { status: 404 });
}

function isIndex(request: Request, url: URL) {
	return request.method === "GET" && url.pathname === "/";
}

const HEADERS = {
	CONTENT_TYPE: "Content-Type",
	ENTITY_ID: "x-entity-id",
} as const;

const CONTENT_TYPE = {
	TEXT_HTML_UTF_8: "text/html; charset=utf-8",
} as const;

function html(body: string): Response {
	return new Response(body, {
		headers: { [HEADERS.CONTENT_TYPE]: CONTENT_TYPE.TEXT_HTML_UTF_8 },
	});
}

function isWebsocket(request: Request, url: URL) {
	return request.method === "GET" && url.pathname.startsWith("/chat");
}

function handleWebsockets(request: Request, env: Env): Promise<Response> {
	const chatName = channelNameFromRequest(request);
	const chatId = env.channels.idFromName(chatName);
	const chatStub = env.channels.get(chatId);
	return chatStub.fetch(request.clone());
}

// CF Worker entrypoint
// noinspection JSUnusedGlobalSymbols
export default { fetch: handleRequest };

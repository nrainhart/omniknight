import { CollaborativeDoc } from "./collaborative-doc";
import * as Y from "yjs";
import { Debouncer } from "./debouncer";

interface DurableObject {
	fetch(request: Request): Promise<Response>;
}

export class Channel implements DurableObject {
	private readonly doc: CollaborativeDoc;
	private isDocInitialized = false;

	constructor(private state: DurableObjectState, private env: Env) {
		this.doc = new CollaborativeDoc();
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade") != "websocket") {
			return new Response("expected websocket", { status: 400 });
		}

		if (!this.isDocInitialized) {
			await this.state.blockConcurrencyWhile(async () => {
				const urlSearchParams = new URLSearchParams(
					request.url.split("?").at(-1)
				);
				const userId = urlSearchParams.get("userId");

				if (!userId) {
					return new Response("userId missing", { status: 400 });
				}

				await this.initializeDocFromStorage();
				this.isDocInitialized = true;
			});
		}

		const pair = new WebSocketPair();
		const client = pair[0];
		const worker = pair[1];
		this.handleWebsocket(worker);

		return new Response(null, { status: 101, webSocket: client });
	}

	private handleWebsocket(socket: WebSocket) {
		socket.accept();
		this.doc.addConnection(socket);
	}

	private async initializeDocFromStorage() {
		const noteContent = await this.state.storage.get<Uint8Array>("noteContent");
		this.doc.initialize(noteContent);
		const debouncer = new Debouncer();
		this.doc.on("update", () => {
			debouncer.debounce(
				() => {
					const docEncodedeState = Y.encodeStateAsUpdate(this.doc);
					this.state.storage.put("noteContent", docEncodedeState);
				},
				1000,
				5000
			);
		});
	}
}

export function channelNameFromRequest(request: Request) {
	return (
		request.headers.get("x-entity-id") ||
		request.url.split("/").at(-1)?.split("?").at(0) ||
		""
	);
}

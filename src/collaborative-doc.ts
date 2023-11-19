import { Base64 } from "js-base64";
import * as Y from "yjs";
import {
	applyAwarenessUpdate,
	Awareness,
	removeAwarenessStates,
} from "y-protocols/awareness";
import { decoding, encoding } from "lib0";
import {
	encodeAwareness,
	encodeSyncMessage,
	encodeSyncStep1,
	encodeUpdate,
	MESSAGE_TYPE,
} from "./encoding";
import { close, send } from "./socket";

export class CollaborativeDoc extends Y.Doc {
	private readonly clientMapping: Map<WebSocket, Set<ClientId>> = new Map();
	private readonly awareness: Awareness = new Awareness(this);

	constructor() {
		super();
		this.awareness.setLocalState(null);
		this.awareness.on("update", this.onAwarenessChange.bind(this));
		this.on("update", this.onUpdate.bind(this));
	}

	initialize(initialContent?: Uint8Array) {
		if (initialContent) {
			Y.applyUpdate(this, initialContent);
		}
	}

	private onUpdate(docUpdate: Uint8Array) {
		const messageEncoder = encodeUpdate(docUpdate);
		send(this, messageEncoder, this.connections());
	}

	private onAwarenessChange(changes: AwarenessChange, conn: WebSocket | null) {
		const { added, updated, removed } = changes;
		const changedClients = [...added, ...updated, ...removed];
		if (conn !== null) {
			this.updateClients(conn, changes);
		}
		const messageEncoder = encodeAwareness(this.awareness, changedClients);
		send(this, messageEncoder, this.connections());
	}

	private updateClients(conn: WebSocket, changes: AwarenessChange) {
		const { added, removed } = changes;
		const userIds = this.clientMapping.get(conn);
		if (userIds !== undefined) {
			added.forEach((clientID) => {
				userIds.add(clientID);
			});
			removed.forEach((clientID) => {
				userIds.delete(clientID);
			});
		}
	}

	addConnection(conn: WebSocket) {
		this.clientMapping.set(conn, new Set());

		conn.addEventListener("message", (message) =>
			this.onMessage(message, conn)
		);

		conn.addEventListener("close", () => this.removeConnection(conn));

		this.startSyncProcess(conn);
	}

	removeConnection(conn: WebSocket) {
		if (this.clientMapping.has(conn)) {
			this.cleanupPendingClientIds(conn);
			this.clientMapping.delete(conn);
		}
		close(conn);
	}

	// These are clientIds that weren't remove by the normal flows. We'll need to manually remove them from the awareness states
	private cleanupPendingClientIds(conn: WebSocket) {
		const lostClients = this.clientMapping.get(conn);
		if (lostClients) {
			removeAwarenessStates(this.awareness, Array.from(lostClients), null);
		}
	}

	private startSyncProcess(conn: WebSocket) {
		this.sendSyncStep1(conn);
		if (this.hasAwareness()) {
			this.sendAwareness(conn);
		}
	}

	private sendSyncStep1(conn: WebSocket) {
		const messageEncoder = encodeSyncStep1(this);
		send(this, messageEncoder, [conn]);
	}

	private hasAwareness(): boolean {
		const awarenessStates = this.awareness.getStates();
		return awarenessStates.size > 0;
	}

	private sendAwareness(conn: WebSocket) {
		const awarenessEncoder = encodeAwareness(
			this.awareness,
			this.awarenessClients()
		);
		send(this, awarenessEncoder, [conn]);
	}

	private awarenessClients() {
		const awarenessStates = this.awareness.getStates();
		return Array.from(awarenessStates.keys());
	}

	private onMessage(messageEvent: MessageEvent, conn: WebSocket) {
		try {
			const message = new Uint8Array(messageEvent.data as ArrayBuffer);

			const decoder = decoding.createDecoder(message);
			const messageType = decoding.readVarUint(decoder);

			switch (messageType) {
				case MESSAGE_TYPE.SYNC:
					this.handleSyncMessage(decoder, conn);
					break;
				case MESSAGE_TYPE.AWARENESS: {
					const awarenessUpdate = decoding.readVarUint8Array(decoder);
					this.handleAwarenessMessage(awarenessUpdate, conn);
					break;
				}
			}
		} catch (err) {
			console.error(err);
			this.emit("error", [err]);
		}
	}

	private handleSyncMessage(syncMessage: decoding.Decoder, conn: WebSocket) {
		const syncEncoder = encodeSyncMessage(syncMessage, this);
		const hasPayload = encoding.length(syncEncoder) > 1;

		// Don't send if the buffer only consist of the message select
		if (hasPayload) send(this, syncEncoder, [conn]);
	}

	private handleAwarenessMessage(awarenessUpdate: Uint8Array, conn: WebSocket) {
		applyAwarenessUpdate(this.awareness, awarenessUpdate, conn);
	}

	private connections() {
		return this.clientMapping.keys();
	}
}

type ClientId = number;

type AwarenessChange = {
	added: number[];
	updated: number[];
	removed: number[];
};

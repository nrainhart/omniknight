import { CollaborativeDoc } from "./collaborative-doc";
import { Encoder } from "lib0/encoding";
import { encoding } from "lib0";

enum SOCKET_READY_STATE {
	CONNECTED = 0,
	OPEN = 1,
	CLOSING = 2,
	CLOSED = 3,
}

function isWebsocketUnexpectedlyClosed(conn: WebSocket) {
	return (
		conn.readyState !== SOCKET_READY_STATE.CONNECTED &&
		conn.readyState !== SOCKET_READY_STATE.OPEN
	);
}

function socketNeedsClosing(conn: WebSocket) {
	return (
		conn.readyState !== SOCKET_READY_STATE.CLOSING &&
		conn.readyState !== SOCKET_READY_STATE.CLOSED
	);
}

export function close(conn: WebSocket) {
	if (socketNeedsClosing(conn)) {
		conn.close();
	}
}

export function send(
	doc: CollaborativeDoc,
	encoder: Encoder,
	connections: Iterable<WebSocket>
) {
	for (const conn of connections) {
		if (isWebsocketUnexpectedlyClosed(conn)) {
			return doc.removeConnection(conn);
		}
		try {
			const message = encoding.toUint8Array(encoder);
			conn.send(message);
		} catch (e) {
			doc.removeConnection(conn);
		}
	}
}

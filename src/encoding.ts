import { Decoder } from "lib0/decoding";
import {
	createEncoder,
	Encoder,
	writeVarUint,
	writeVarUint8Array,
} from "lib0/encoding";
import { readSyncMessage, writeSyncStep1, writeUpdate } from "y-protocols/sync";
import { Awareness, encodeAwarenessUpdate } from "y-protocols/awareness";
import { CollaborativeDoc } from "./collaborative-doc";

export enum MESSAGE_TYPE {
	SYNC = 0,
	AWARENESS = 1,
}

export function encodeUpdate(update: Uint8Array): Encoder {
	const updateEncoder = createEncoder();
	writeVarUint(updateEncoder, MESSAGE_TYPE.SYNC);
	writeUpdate(updateEncoder, update);
	return updateEncoder;
}

export function encodeSyncStep1(doc: CollaborativeDoc): Encoder {
	const encoder = createEncoder();
	writeVarUint(encoder, MESSAGE_TYPE.SYNC);
	writeSyncStep1(encoder, doc);
	return encoder;
}

export function encodeAwareness(
	awareness: Awareness,
	changedClients: number[]
): Encoder {
	const encoder = createEncoder();
	const awarenessUpdate = encodeAwarenessUpdate(awareness, changedClients);
	writeVarUint(encoder, MESSAGE_TYPE.AWARENESS);
	writeVarUint8Array(encoder, awarenessUpdate);
	return encoder;
}

export function encodeSyncMessage(
	syncMessageDecoder: Decoder,
	doc: CollaborativeDoc
): Encoder {
	const encoder = createEncoder();
	writeVarUint(encoder, MESSAGE_TYPE.SYNC);
	readSyncMessage(syncMessageDecoder, encoder, doc, null);
	return encoder;
}

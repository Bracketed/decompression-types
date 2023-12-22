import { Stream, Writable, Readable, Duplex, Transform } from 'node:stream';

export function isStream(stream: Stream) {
	return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function';
}

export function isWritableStream(stream: Writable) {
	return isStream(stream) && stream.writable !== false && typeof stream._write === 'function';
}

export function isReadableStream(stream: Readable) {
	return isStream(stream) && stream.readable !== false && typeof stream._read === 'function';
}

export function isDuplexStream(stream: Duplex) {
	return isWritableStream(stream) && isReadableStream(stream);
}

export function isTransformStream(stream: Transform) {
	return isDuplexStream(stream) && typeof stream._transform === 'function';
}

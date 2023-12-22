import zlib from 'zlib';
import decompressTar from './tar.js';
import { fileTypeFromBuffer } from 'file-type';
import { isStream } from '../utilities/isStream.js';

export default async function decompress(input: Buffer) {
	if (!Buffer.isBuffer(input) && !isStream(input)) {
		return Promise.reject(new TypeError(`Expected a Buffer or Stream, got ${typeof input}`));
	}

	if (Buffer.isBuffer(input) && (!fileTypeFromBuffer(input) || (await fileTypeFromBuffer(input))?.ext !== 'gz')) {
		return Promise.resolve([]);
	}

	const chunks: Buffer[] = [];
	let result: any;

	const unzip = zlib.createGunzip();

	unzip.on('data', (chunk: Buffer) => {
		chunks.push(chunk);
	});

	unzip.on('end', () => {
		const decompressedBuffer = Buffer.concat(chunks);
		result = decompressTar(decompressedBuffer);
	});

	unzip.on('error', (err: Error) => {
		console.error('Error during decompression:', err);
	});

	if (Buffer.isBuffer(input)) {
		unzip.write(input);
		unzip.end();
	} else if (isStream(input)) {
		(input as NodeJS.ReadableStream).pipe(unzip);
	}

	return new Promise((resolve, reject) => {
		unzip.on('finish', () => {
			resolve(result);
		});

		unzip.on('error', (err: Error) => {
			reject(err);
		});
	});
}

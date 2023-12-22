import decompressTar from './tar.js';
import { fileTypeFromBuffer } from 'file-type';
import { isStream } from '../utilities/isStream.js';
import unbzip2Stream from 'unbzip2-stream';
import concatStream from 'concat-stream';
import { Readable, Stream } from 'node:stream';

export default async function decompress(input: Buffer | Readable) {
	if (!Buffer.isBuffer(input) && !isStream(input)) {
		return Promise.reject(new TypeError(`Expected a Buffer or Stream, got ${typeof input}`));
	}

	if (
		Buffer.isBuffer(input) &&
		(!(await fileTypeFromBuffer(input)) || (await fileTypeFromBuffer(input))?.ext !== 'bz2')
	) {
		return Promise.resolve([]);
	}

	try {
		let decompressedData: Buffer | undefined;

		if (Buffer.isBuffer(input)) {
			const stream = new Readable();
			stream.push(input);
			stream.push(null);
			decompressedData = await new Promise<Buffer>((resolve, reject) => {
				if (stream instanceof Stream) {
					stream.pipe(unbzip2Stream()).pipe(
						concatStream((buffer: Buffer) => {
							resolve(buffer);
						})
					);
				} else {
					reject(new Error('Invalid stream'));
				}
				stream.on('error', reject);
			});
		} else {
			decompressedData = await new Promise<Buffer>((resolve, reject) => {
				if (input instanceof Stream) {
					input.pipe(unbzip2Stream()).pipe(
						concatStream((buffer: Buffer) => {
							resolve(buffer);
						})
					);
				} else {
					reject(new Error('Invalid stream'));
				}
				input.on('error', reject);
			});
		}

		if (decompressedData) {
			return decompressTar(decompressedData);
		} else {
			return [];
		}
	} catch (error) {
		return Promise.reject(error);
	}
}

import { fileTypeFromBuffer } from 'file-type';
import { isStream } from '../utilities/isStream.js';
import tarStream from 'tar-stream';

export default async function decompress(input: Buffer) {
	if (!Buffer.isBuffer(input) && !isStream(input)) {
		return Promise.reject(new TypeError(`Expected a Buffer or Stream, got ${typeof input}`));
	}

	if (Buffer.isBuffer(input) && (!fileTypeFromBuffer(input) || (await fileTypeFromBuffer(input))?.ext !== 'tar')) {
		return Promise.resolve([]);
	}

	const extract = tarStream.extract();
	const files: any[] = [];

	extract.on('entry', (header, stream, cb) => {
		const chunk: any[] = [];

		stream.on('data', (data) => chunk.push(data));
		stream.on('end', () => {
			const file = {
				data: Buffer.concat(chunk),
				mode: header.mode,
				mtime: header.mtime,
				path: header.name,
				type: header.type,
				linkname: header.linkname,
			};

			if (header.type === 'symlink' || header.type === 'link') {
				file.linkname = header.linkname;
			}

			files.push(file);
			cb();
		});
	});

	const promise = new Promise<any[]>((resolve, reject) => {
		extract.on('finish', () => resolve(files));
		extract.on('error', (e) => reject(e));
	});

	extract.end(input);

	(promise as any).then = promise.then.bind(promise);
	(promise as any).catch = promise.catch.bind(promise);

	return promise as any;
}

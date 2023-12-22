import { fileTypeFromBuffer } from 'file-type';
import getStream from 'get-stream';
import pify from 'pify';
import yauzl from 'yauzl';
import { promisify } from 'node:util';

const getType = (entry: any, mode: any) => {
	const IFMT = 61440;
	const IFDIR = 16384;
	const IFLNK = 40960;
	const madeBy = entry.versionMadeBy >> 8;

	if ((mode & IFMT) === IFLNK) {
		return 'symlink';
	}

	if ((mode & IFMT) === IFDIR || (madeBy === 0 && entry.externalFileAttributes === 16)) {
		return 'directory';
	}

	return 'file';
};

const extractEntry = async (entry: any, zip: any) => {
	const file = {
		mode: (entry.externalFileAttributes >> 16) & 0xffff,
		mtime: entry.getLastModDate(),
		path: entry.fileName,
		type: '',
		linkname: '',
		data: Buffer.from([]),
	};

	file.type = getType(entry, file.mode);

	if (file.mode === 0 && file.type === 'directory') {
		file.mode = 493;
	}

	if (file.mode === 0) {
		file.mode = 420;
	}

	const openReadStreamAsync = promisify(zip.openReadStream).bind(zip);

	return openReadStreamAsync(entry)
		.then((buf: Buffer) => getStream(buf))
		.then((buf: Buffer) => {
			file.data = buf;

			if (file.type === 'symlink') {
				file.linkname = buf.toString();
			}

			return file;
		})
		.catch((err: any) => {
			zip.close();
			throw err;
		});
};

const extractFile = (zip: any) =>
	new Promise((resolve, reject) => {
		const files: any[] = [];

		zip.readEntry();

		zip.on('entry', (entry: any) => {
			extractEntry(entry, zip)
				.catch(reject)
				.then((file: any) => {
					files.push(file);
					zip.readEntry();
				});
		});

		zip.on('error', reject);
		zip.on('end', () => resolve(files));
	});

async function fromBufferPromise(buffer: Buffer) {
	return await new Promise((resolve, reject) => {
		yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
			if (err) {
				reject(err);
			} else {
				resolve(zipfile);
			}
		});
	});
}

export default async function decompress(buffer: Buffer) {
	if (!Buffer.isBuffer(buffer)) {
		return await Promise.reject(new TypeError(`Expected a Buffer, got ${typeof buffer}`));
	}

	if (!(await fileTypeFromBuffer(buffer)) || (await fileTypeFromBuffer(buffer))?.ext !== 'zip') {
		return await Promise.resolve([]);
	}

	const zip = pify(fromBufferPromise(buffer));
	return await extractFile(zip);
}

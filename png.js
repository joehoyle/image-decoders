document.body.addEventListener( 'drop', handleFileSelect, false);
document.body.addEventListener('dragover', handleDragOver, false);

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
}

function handleFileSelect( event ) {
	event.preventDefault();
	event.stopPropagation();
	const file = event.dataTransfer.files[0];
	const fileReader = new FileReader();
	fileReader.onloadend = () => {
		const binary                   = fileReader.result;
		const type                     = String.fromCharCode( ...new Uint8Array( binary.slice( 0, 2 ) ) );
		const chunks                   = [];
		let continueSearchingForChunks = true;
		let nextChunkStartPosition     = 8;
		let chunkCount                 = 0;
		let IHDR                       = null;
		let compressedData             = new Uint8Array();
		while ( continueSearchingForChunks ) {
			// Chunk length is stored big-endian
			const chunkLength = (new DataView( binary.slice( nextChunkStartPosition, nextChunkStartPosition + 4 ) )).getUint32();
			const chunkType = String.fromCharCode( ...new Uint8Array( binary.slice( nextChunkStartPosition + 4, nextChunkStartPosition + 8 ) ) );
			chunks.push( { type: chunkType, binary: binary.slice( nextChunkStartPosition + 8, nextChunkStartPosition + 8 + chunkLength ) } );
			chunkCount++;
			if ( chunkType === 'IHDR') {
				IHDR = binary.slice( nextChunkStartPosition + 8, nextChunkStartPosition + 8 + chunkLength );
			}
			if ( chunkType === 'IEND' ) {
				continueSearchingForChunks = false;
			}
			if ( chunkType === 'IDAT' ) {
				const data = binary.slice( nextChunkStartPosition + 8, nextChunkStartPosition + 8 + chunkLength );
				const zlibCompressionFlags = (new Uint8Array( data.slice( 0, 1 ) ))[0];
				const zlibAdditionalFlags = (new Uint8Array( data.slice( 1, 2 ) ))[0];
				const newData = new Uint8Array( compressedData.length + chunkLength );
				newData.set(compressedData);
				newData.set(new Uint8Array( data ), compressedData.length);
				compressedData = newData;
			}
			nextChunkStartPosition += 8 + chunkLength + 4;
		}
		const width             = (new DataView( IHDR.slice( 0, 4 ) )).getUint32();
		const height            = (new DataView( IHDR.slice( 4, 8 ) )).getUint32();
		const bitDepth          = (new DataView( IHDR.slice( 8, 9 ) )).getUint8();
		const colorType         = (new DataView( IHDR.slice( 9, 10 ) )).getUint8();
		const compressionMethod = (new DataView( IHDR.slice( 10, 11 ) )).getUint8();
		const filterMethod      = (new DataView( IHDR.slice( 11, 12 ) )).getUint8();
		const uncompressedData  = pako.inflate( compressedData )
		const interlaceMethod   = (new DataView( IHDR.slice( 12, 13 ) )).getUint8();
		const pixels            = new Uint8ClampedArray( width * height * 4);

		let index = 0;
		let filter = 0;
		for ( let i = 0; i < uncompressedData.length; i++ ) {
			if ( i % ( ( width * 4 ) + 1 ) === 0 ) {
				filter = uncompressedData[i];
				console.log('line')
			} else if ( filter === 0 ) {
				pixels[index] = uncompressedData[i];
				index++;
			} else if ( i % ( ( width * 4 ) + 1 ) <= 4 ) {
				pixels[index] = uncompressedData[i];
				index++;
			} else if ( filter === 1 ) { // sub left
				pixels[index] = uncompressedData[i] + pixels[index-4];
				index++;
			} else {
				throw new Error( 'Filter type not implemented ' + filter )
			}
		}

		console.log( { width, height, bitDepth, colorType, compressionMethod, filterMethod, interlaceMethod, compressedData, uncompressedData, pixels } );
		const canvas = document.createElement( 'canvas' );
		canvas.width = width;
		canvas.height = height;
		document.body.appendChild(canvas);

		const context = canvas.getContext('2d');
		const imageData = new ImageData( pixels, width, height )
		context.putImageData(imageData, 0, 0)
	}
	fileReader.readAsArrayBuffer( file );
}

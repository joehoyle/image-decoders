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
		const binary            = fileReader.result;
		const type              = String.fromCharCode( ...new Uint8Array( binary.slice( 0, 2 ) ) );
		const size              = new Uint32Array( binary.slice( 2, 6 ) )[0]
		const imageDataLocation = new Uint32Array( binary.slice( 10, 14 ) )[0]
		const headerSize        = new Uint8Array( binary.slice( 14, 18 ) )[0]
		const width             = new Uint32Array( binary.slice( 18, 22 ) )[0]
		const height            = new Uint32Array( binary.slice( 22, 26 ) )[0]
		const colorPlanes       = new Uint16Array( binary.slice( 26, 28 ) )[0]
		const bitsPerPixel      = new Uint16Array( binary.slice( 28, 30 ) )[0]
		const compressionMethod = new Uint32Array( binary.slice( 30, 34 ) )[0]
		const colorPaletteCount = new Uint32Array( binary.slice( 46, 50 ) )[0]
		const pixels            = new Uint8ClampedArray( width * height * 4 );
		const colorTable        = new Uint8Array( binary.slice( headerSize + 14, headerSize + 14 + ( colorPaletteCount * 3 ) ) )
		const imageBytes        = new Uint8Array( binary.slice( imageDataLocation ) );

		var rgbPixels = new Uint8Array( width * height * 3 )
		if ( bitsPerPixel === 24 ) {
			rgbPixels = imageBytes;
		} else if ( bitsPerPixel <= 8 ) {
			// Lookup color from color table
			for ( let i = 0; i < imageBytes.length ; i++ ) {
				const index = i * 3;
				rgbPixels[ index ] = colorTable[ imageBytes[i] * 4 ];
				rgbPixels[ index + 1 ] = colorTable[ imageBytes[i] * 4 + 1];
				rgbPixels[ index + 2 ] = colorTable[ imageBytes[i] * 4 + 2 ];
			}
		}

		// start drawing last line first
		let index = pixels.length;
		for ( let i = 0; i < rgbPixels.length ; i++ ) {
			// Each line offset the next index by 1 line first
			if ( ( i % ( width * 3 ) ) === 0 ) {
				index = index - ( width * 4 * 2 );
			}
			if ( i % 3 === 0 ) {
				pixels[ index + 0 ] = rgbPixels[ i + 2 ];
				pixels[ index + 1 ] = rgbPixels[ i + 1 ];
				pixels[ index + 2 ] = rgbPixels[ i + 0 ];
				pixels[ index + 3] = 254;
				index += 4;
			}

		}

		console.log( { colorPaletteCount, type, size, imageDataLocation, width, height, colorPlanes, bitsPerPixel, compressionMethod, pixels, rgbPixels, headerSize, colorTable } )

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

const blobToDataUrl = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

const canvasBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
	new Promise<Blob>((resolve, reject) =>
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to create export.'))), type, quality)
	);

const downloadBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
};

type ExportBounds = { x: number; y: number; width: number; height: number };

const unionBounds = (bounds: ExportBounds, next: DOMRect): ExportBounds => {
	const right = Math.max(bounds.x + bounds.width, next.x + next.width);
	const bottom = Math.max(bounds.y + bounds.height, next.y + next.height);
	const x = Math.min(bounds.x, next.x);
	const y = Math.min(bounds.y, next.y);
	return { x, y, width: right - x, height: bottom - y };
};

const exportBounds = (source: SVGSVGElement, pdfOutlines: boolean, paddingOverride?: number): ExportBounds => {
	const field = source.querySelector<SVGGraphicsElement>('[data-export-field-boundary]');
	const viewBox = source.viewBox.baseVal;
	let bounds: ExportBounds = field
		? field.getBBox()
		: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
	const optionalBounds = source.querySelectorAll<SVGGraphicsElement>('[data-export-team-box], [data-field-fixtures-layer], [data-export-down-marker]');
	for (const element of optionalBounds) {
		const next = element.getBBox();
		if (next.width > 0 && next.height > 0) bounds = unionBounds(bounds, next);
	}
	const padding = paddingOverride ?? (pdfOutlines ? 11 : 5);
	return {
		x: bounds.x - padding,
		y: bounds.y - padding,
		width: bounds.width + padding * 2,
		height: bounds.height + padding * 2
	};
};

export const renderPlayBuilderCanvas = async (
	source: SVGSVGElement,
	{
		pdfOutlines = false,
		padding,
		backgroundColor,
		stripedBackground = false,
		fieldBorderColor
	}: {
		pdfOutlines?: boolean;
		padding?: number;
		backgroundColor?: string;
		stripedBackground?: boolean;
		fieldBorderColor?: string;
	} = {}
) => {
	const bounds = exportBounds(source, pdfOutlines, padding);
	const outputScale = 2;
	const outputWidth = Math.ceil(bounds.width * outputScale);
	const outputHeight = Math.ceil(bounds.height * outputScale);
	const clone = source.cloneNode(true) as SVGSVGElement;
	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
	clone.setAttribute('width', String(outputWidth));
	clone.setAttribute('height', String(outputHeight));
	clone.setAttribute('font-family', getComputedStyle(source).fontFamily);
	if (backgroundColor) {
		const namespace = 'http://www.w3.org/2000/svg';
		const background = document.createElementNS(namespace, 'g');
		background.setAttribute('data-export-background', '');
		const base = document.createElementNS(namespace, 'rect');
		base.setAttribute('x', String(bounds.x));
		base.setAttribute('y', String(bounds.y));
		base.setAttribute('width', String(bounds.width));
		base.setAttribute('height', String(bounds.height));
		base.setAttribute('fill', backgroundColor);
		background.append(base);
		if (stripedBackground) {
			const stripes = base.cloneNode() as SVGRectElement;
			stripes.setAttribute('fill', 'url(#builder-grass-stripe)');
			background.append(stripes);
		}
		const definitions = clone.querySelector('defs');
		if (definitions) definitions.after(background);
		else clone.prepend(background);
	}
	if (pdfOutlines) {
		for (const outline of clone.querySelectorAll<SVGElement>('[data-pdf-outline]')) outline.removeAttribute('display');
	}
	if (fieldBorderColor) {
		const outline = clone.querySelector<SVGElement>('[data-export-field-outline]');
		outline?.removeAttribute('display');
		outline?.setAttribute('stroke', fieldBorderColor);
	}
	const images = Array.from(clone.querySelectorAll('image'));
	await Promise.all(
		images.map(async (image) => {
			const href = image.getAttribute('href') || image.getAttribute('xlink:href');
			if (!href || href.startsWith('data:')) return;
			const response = await fetch(new URL(href, window.location.origin));
			if (!response.ok) throw new Error('Unable to load an image used by the diagram.');
			image.setAttribute('href', await blobToDataUrl(await response.blob()));
		})
	);
	const markup = new XMLSerializer().serializeToString(clone);
	const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
	try {
		const image = new Image();
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('Unable to render the diagram.'));
			image.src = url;
		});
		const canvas = document.createElement('canvas');
		canvas.width = outputWidth;
		canvas.height = outputHeight;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Canvas export is not supported by this browser.');
		if (backgroundColor) {
			context.fillStyle = backgroundColor;
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return canvas;
	} finally {
		URL.revokeObjectURL(url);
	}
};

const concatBytes = (parts: Uint8Array[]) => {
	const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
};

const createPdf = async (canvases: HTMLCanvasElement[]) => {
	if (canvases.length === 0) throw new Error('There are no plays to export.');
	const jpegs = await Promise.all(
		canvases.map(async (canvas) => {
			const opaqueCanvas = document.createElement('canvas');
			opaqueCanvas.width = canvas.width;
			opaqueCanvas.height = canvas.height;
			const context = opaqueCanvas.getContext('2d');
			if (!context) throw new Error('Canvas export is not supported by this browser.');
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
			context.drawImage(canvas, 0, 0);
			return new Uint8Array(await (await canvasBlob(opaqueCanvas, 'image/jpeg', 0.94)).arrayBuffer());
		})
	);
	const encoder = new TextEncoder();
	const pageWidth = 792;
	const pageHeight = 612;
	const margin = 24;
	const pageObjectIds = canvases.map((_, index) => 3 + index * 3);
	const objects: Uint8Array[] = [
		encoder.encode('<< /Type /Catalog /Pages 2 0 R >>'),
		encoder.encode(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${canvases.length} >>`)
	];
	canvases.forEach((canvas, index) => {
		const jpeg = jpegs[index];
		const pageObjectId = pageObjectIds[index];
		const imageObjectId = pageObjectId + 1;
		const contentObjectId = pageObjectId + 2;
		const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
		const width = canvas.width * scale;
		const height = canvas.height * scale;
		const x = (pageWidth - width) / 2;
		const y = (pageHeight - height) / 2;
		const content = `q\n${width.toFixed(3)} 0 0 ${height.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm\n/Im0 Do\nQ\n`;
		objects.push(
			encoder.encode(
				`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
			),
			concatBytes([
				encoder.encode(
					`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
				),
				jpeg,
				encoder.encode('\nendstream')
			]),
			encoder.encode(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`)
		);
	});
	const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
	const offsets = [0];
	let length = parts[0].length;
	objects.forEach((object, index) => {
		offsets.push(length);
		const opening = encoder.encode(`${index + 1} 0 obj\n`);
		const closing = encoder.encode('\nendobj\n');
		parts.push(opening, object, closing);
		length += opening.length + object.length + closing.length;
	});
	const xrefOffset = length;
	let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (let index = 1; index <= objects.length; index += 1) xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
	xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
	parts.push(encoder.encode(xref));
	return new Blob([concatBytes(parts)], { type: 'application/pdf' });
};

export const exportPlayBuilderRaster = async (
	svg: SVGSVGElement,
	format: 'png' | 'jpg' | 'webp',
	options: { backgroundColor?: string; padding?: number; stripedBackground?: boolean; fieldBorderColor?: string } = {}
) => {
	const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
	const quality = format === 'png' ? undefined : 0.94;
	const canvas = await renderPlayBuilderCanvas(svg, options);
	if (format === 'jpg') {
		const opaqueCanvas = document.createElement('canvas');
		opaqueCanvas.width = canvas.width;
		opaqueCanvas.height = canvas.height;
		const context = opaqueCanvas.getContext('2d');
		if (!context) throw new Error('Canvas export is not supported by this browser.');
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, opaqueCanvas.width, opaqueCanvas.height);
		context.drawImage(canvas, 0, 0);
		downloadBlob(await canvasBlob(opaqueCanvas, mimeType, quality), `flag-football-play.${format}`);
		return;
	}
	downloadBlob(await canvasBlob(canvas, mimeType, quality), `flag-football-play.${format}`);
};
export const exportPlayBuilderPdf = async (canvases: HTMLCanvasElement[]) => downloadBlob(await createPdf(canvases), 'flag-football-plays.pdf');

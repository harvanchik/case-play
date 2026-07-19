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

export type ExportPrompt = {
	text: string;
	runs?: ExportPromptRun[];
	fontFamily: string;
	fontSize: number;
	fontWeight: string;
	fontStyle: string;
	lineHeight: number;
	color: string;
	backgroundColor: string;
	borderColor: string;
	borderWidth: number;
	paddingTop: number;
	paddingRight: number;
	paddingBottom: number;
	paddingLeft: number;
};

export type ExportPromptRun = {
	text: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: string;
	fontStyle: string;
	color: string;
	backgroundColor?: string;
	textDecorationLine?: string;
	paddingLeft?: number;
	paddingRight?: number;
};

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
	const optionalBounds = source.querySelectorAll<SVGGraphicsElement>(
		'[data-export-team-box], [data-field-fixtures-layer], [data-export-down-marker], [data-export-los-marker]'
	);
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

const addPromptHeader = (diagram: HTMLCanvasElement, prompt: ExportPrompt) => {
	const scale = 2;
	const paddingTop = prompt.paddingTop * scale;
	const paddingRight = prompt.paddingRight * scale;
	const paddingBottom = prompt.paddingBottom * scale;
	const paddingLeft = prompt.paddingLeft * scale;
	const borderWidth = prompt.borderWidth * scale;
	const gap = 8 * scale;
	const fontSize = prompt.fontSize * scale;
	const lineHeight = prompt.lineHeight * scale;
	const measurementCanvas = document.createElement('canvas');
	const measurementContext = measurementCanvas.getContext('2d');
	if (!measurementContext) throw new Error('Canvas export is not supported by this browser.');
	measurementContext.font = `${prompt.fontStyle} ${prompt.fontWeight} ${fontSize}px ${prompt.fontFamily}`;
	type PromptToken = { text: string; run: ExportPromptRun; whitespace: boolean; newline: boolean };
	type PositionedPromptToken = PromptToken & { x: number; y: number; width: number };
	const defaultRun: ExportPromptRun = {
		text: '',
		fontFamily: prompt.fontFamily,
		fontSize: prompt.fontSize,
		fontWeight: prompt.fontWeight,
		fontStyle: prompt.fontStyle,
		color: prompt.color
	};
	const tokens: PromptToken[] = [];
	for (const run of prompt.runs?.length ? prompt.runs : [{ ...defaultRun, text: prompt.text }]) {
		for (const part of run.text.replace(/\r\n/g, '\n').split(/(\n|\s+)/).filter(Boolean)) {
			tokens.push({ text: part, run, whitespace: /^\s+$/.test(part) && part !== '\n', newline: part === '\n' });
		}
	}
	const setTokenFont = (run: ExportPromptRun) => {
		measurementContext.font = `${run.fontStyle} ${run.fontWeight} ${run.fontSize * scale}px ${run.fontFamily}`;
	};
	const maxX = diagram.width - paddingRight;
	const positioned: PositionedPromptToken[] = [];
	let x = paddingLeft;
	let line = 0;
	let pendingWhitespace: PromptToken | null = null;
	for (const token of tokens) {
		if (token.newline) {
			line += 1;
			x = paddingLeft;
			pendingWhitespace = null;
			continue;
		}
		if (token.whitespace) {
			pendingWhitespace = token;
			continue;
		}
		setTokenFont(token.run);
		const tokenPadding = ((token.run.paddingLeft ?? 0) + (token.run.paddingRight ?? 0)) * scale;
		const tokenWidth = measurementContext.measureText(token.text).width + tokenPadding;
		let spaceWidth = 0;
		if (pendingWhitespace && x > paddingLeft) {
			setTokenFont(pendingWhitespace.run);
			spaceWidth = measurementContext.measureText(' ').width;
		}
		if (x > paddingLeft && x + spaceWidth + tokenWidth > maxX) {
			line += 1;
			x = paddingLeft;
			spaceWidth = 0;
		}
		if (pendingWhitespace && spaceWidth > 0) {
			positioned.push({ ...pendingWhitespace, text: ' ', x, y: paddingTop + line * lineHeight, width: spaceWidth });
			x += spaceWidth;
		}
		positioned.push({ ...token, x, y: paddingTop + line * lineHeight, width: tokenWidth });
		x += tokenWidth;
		pendingWhitespace = null;
	}
	const lineCount = Math.max(1, line + 1);
	const headerHeight = paddingTop + paddingBottom + lineCount * lineHeight;
	const output = document.createElement('canvas');
	output.width = diagram.width;
	output.height = headerHeight + gap + diagram.height;
	const context = output.getContext('2d');
	if (!context) throw new Error('Canvas export is not supported by this browser.');
	context.fillStyle = prompt.backgroundColor;
	context.fillRect(0, 0, output.width, headerHeight);
	context.strokeStyle = prompt.borderColor;
	context.lineWidth = borderWidth;
	context.strokeRect(borderWidth / 2, borderWidth / 2, output.width - borderWidth, headerHeight - borderWidth);
	context.textBaseline = 'top';
	for (const token of positioned) {
		const runFontSize = token.run.fontSize * scale;
		const textY = token.y + (lineHeight - runFontSize) / 2;
		const tokenPaddingLeft = (token.run.paddingLeft ?? 0) * scale;
		if (token.run.backgroundColor && token.run.backgroundColor !== 'rgba(0, 0, 0, 0)') {
			context.fillStyle = token.run.backgroundColor;
			context.fillRect(token.x, textY, token.width, runFontSize * 1.12);
		}
		context.fillStyle = token.run.color;
		context.font = `${token.run.fontStyle} ${token.run.fontWeight} ${runFontSize}px ${token.run.fontFamily}`;
		if (!token.whitespace) context.fillText(token.text, token.x + tokenPaddingLeft, textY);
		if (token.run.textDecorationLine?.includes('underline')) {
			context.strokeStyle = token.run.color;
			context.lineWidth = Math.max(1, scale);
			const underlineY = textY + runFontSize * 1.04;
			context.beginPath();
			context.moveTo(token.x, underlineY);
			context.lineTo(token.x + token.width, underlineY);
			context.stroke();
		}
	}
	context.drawImage(diagram, 0, headerHeight + gap);
	return output;
};

export const renderPlayBuilderCanvas = async (
	source: SVGSVGElement,
	{
		pdfOutlines = false,
		padding,
		backgroundColor,
		stripedBackground = false,
		fieldBorderColor,
		prompt
	}: {
		pdfOutlines?: boolean;
		padding?: number;
		backgroundColor?: string;
		stripedBackground?: boolean;
		fieldBorderColor?: string;
		prompt?: ExportPrompt;
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
	const fontFamily = getComputedStyle(source).fontFamily || 'Arial, sans-serif';
	clone.setAttribute('font-family', fontFamily);
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
		return prompt?.text.trim() ? addPromptHeader(canvas, prompt) : canvas;
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
	options: { backgroundColor?: string; padding?: number; stripedBackground?: boolean; fieldBorderColor?: string; prompt?: ExportPrompt } = {}
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

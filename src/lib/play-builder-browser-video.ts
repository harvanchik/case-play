import { canvasGrassAlignment } from './play-builder-export';
export type VideoFormat = 'mp4' | 'mov' | 'webm' | 'gif';
export async function downloadBrowserVideo(
	format: VideoFormat,
	duration: number,
	draw: (time: number) => Promise<HTMLCanvasElement>,
	signal: AbortSignal,
	progress: (percent: number) => void,
	name: string,
	download = true,
	grassColor = "#214b37",
 renderAhead = 1
) {
	const { Recorder, Encoders } = await import('canvas-record');
	const codec = format === 'webm' ? 'vp09.00.10.08' : 'avc1.420028';
	const nativeEncoder = (
		window as unknown as { VideoEncoder?: { isConfigSupported: (config: Record<string, unknown>) => Promise<{ supported?: boolean }> } }
	).VideoEncoder;
	let nativeSupported = false;
	if (format !== 'gif' && nativeEncoder) {
		try {
			nativeSupported = Boolean(
				(await nativeEncoder.isConfigSupported({ codec, width: 1920, height: 1080, framerate: 30, bitrate: 8_000_000 })).supported
			);
		} catch {
			/* MP4 can use the bundled software encoder. */
		}
	}
	if ((format === 'mov' || format === 'webm') && !nativeSupported)
		throw new Error(`${format.toUpperCase()} encoding is unavailable in this browser. Try MP4 or GIF.`);
	const canvas = document.createElement('canvas');
	canvas.width = format === 'gif' ? 960 : 1920;
	canvas.height = format === 'gif' ? 540 : 1080;
	const context = canvas.getContext('2d')!;
	const fps = format === 'gif' ? 15 : 30;
	const options = { extension: format, duration: Infinity, frameRate: fps, download: false, target: 'in-browser' };
	let recorder = new Recorder(context, {
		...options,
		...(format === 'gif'
			? {}
			: {
					encoder: nativeSupported
						? new Encoders.WebCodecsEncoder({ encoderOptions: { codec, width: 1920, height: 1080 } })
						: new Encoders.H264MP4Encoder()
				})
	});
	const pending = new Map<number,Promise<HTMLCanvasElement>>();
	try {
		try {
			await recorder.start({ initOnly: true });
		} catch (error) {
			await recorder.dispose();
			if (format !== 'mp4') throw error;
			recorder = new Recorder(context, { ...options, encoder: new Encoders.H264MP4Encoder() });
			await recorder.start({ initOnly: true });
		}
		const frames = Math.max(1, Math.ceil(duration * fps));
        let requested=0;
        const fillQueue=()=>{while(requested<frames&&pending.size<Math.max(1,Math.min(2,renderAhead))){const index=requested++;const task=Promise.resolve().then(()=>{signal.throwIfAborted();return draw(index/fps);});task.catch(()=>{});pending.set(index,task);}};
        fillQueue();
		for (let frame = 0; frame < frames; frame++) {
			signal.throwIfAborted();
			const image = await pending.get(frame)!;
            pending.delete(frame);
			signal.throwIfAborted();
			context.fillStyle = grassColor;
			context.fillRect(0, 0, canvas.width, canvas.height);
			const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
            const alignment=canvasGrassAlignment.get(image) ?? {x:0,y:0,scaleX:2,scaleY:2};
            const offsetX=(canvas.width-image.width*scale)/2,offsetY=(canvas.height-image.height*scale)/2;
            context.save();
            context.translate(offsetX+alignment.x*scale,offsetY+alignment.y*scale);
            context.scale(alignment.scaleX*scale,alignment.scaleY*scale);
            context.rotate(18*Math.PI/180);
            context.fillStyle='rgba(255,255,255,0.025)';
            const extent=(canvas.width+canvas.height+Math.abs(offsetX+alignment.x*scale)+Math.abs(offsetY+alignment.y*scale))/(Math.min(alignment.scaleX,alignment.scaleY)*scale);
            for(let x=Math.floor(-extent/32)*32;x<extent;x+=32)context.fillRect(x,-extent,16,extent*2);
            context.restore();
			context.drawImage(
				image,
				(canvas.width - image.width * scale) / 2,
				(canvas.height - image.height * scale) / 2,
				image.width * scale,
				image.height * scale
			);
            // Start rasterizing the next frame while the encoder consumes this one.
            fillQueue();
			await recorder.step();
            if(renderAhead>1)image.width=image.height=0;
			progress(Math.round(((frame + 1) / frames) * 100));
			if(frame%8===7)await new Promise((resolve) => setTimeout(resolve, 0));
		}
		const buffer = await recorder.stop();
		signal.throwIfAborted();
		if (!buffer || Array.isArray(buffer)) throw new Error('Unable to encode this video format.');
		const blob = new Blob([buffer as BlobPart], { type: format === 'gif' ? 'image/gif' : format === 'mov' ? 'video/quicktime' : `video/${format}` });
		if (!download) return blob;
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${name.replace(/[<>:"/\\|?*]/g, '').trim() || 'Play'} Animation.${format}`;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 60000);
	} finally {
		await recorder.dispose();
        const leftovers=await Promise.allSettled(pending.values());
        if(renderAhead>1)for(const result of leftovers)if(result.status==='fulfilled')result.value.width=result.value.height=0;
		canvas.width = canvas.height = 0;
	}
}

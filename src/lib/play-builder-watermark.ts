export const PLAY_BUILDER_WATERMARK_TEXT = 'CASEPLAY.ORG';
export const PLAY_BUILDER_WATERMARK_BASELINE = 'central';

// Measured visual bounds of the bold watermark text, including its tracking,
// expressed relative to its font size. Keeping these ratios here lets every
// renderer fit the same mark without relying on one field's fixed font size.
const PLAY_BUILDER_WATERMARK_WIDTH_EM = 8.89;
const PLAY_BUILDER_WATERMARK_HEIGHT_EM = 1.33;
const PLAY_BUILDER_WATERMARK_LETTER_SPACING_EM = 7 / 65;
const PLAY_BUILDER_WATERMARK_SAFE_SCALE = 0.8;

export type PlayBuilderWatermarkBounds = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export type PlayBuilderWatermarkSurface = PlayBuilderWatermarkBounds & {
	safeArea?: PlayBuilderWatermarkBounds;
};

/**
 * Centers and sizes a diagonal watermark within any rectangular field, court,
 * or rink. A sport may provide a smaller safe area when the mark must stay out
 * of end zones or another reserved region.
 */
export const playBuilderWatermarkGeometry = ({ left, top, width, height, safeArea }: PlayBuilderWatermarkSurface) => {
	const bounds = safeArea ?? { left, top, width, height };
	const angleRadians = Math.atan2(height, width);
	const cosine = Math.abs(Math.cos(angleRadians));
	const sine = Math.abs(Math.sin(angleRadians));
	const rotatedWidthPerFont = PLAY_BUILDER_WATERMARK_WIDTH_EM * cosine + PLAY_BUILDER_WATERMARK_HEIGHT_EM * sine;
	const rotatedHeightPerFont = PLAY_BUILDER_WATERMARK_WIDTH_EM * sine + PLAY_BUILDER_WATERMARK_HEIGHT_EM * cosine;
	const fontSize =
		Math.max(0, Math.min(bounds.width / rotatedWidthPerFont, bounds.height / rotatedHeightPerFont)) * PLAY_BUILDER_WATERMARK_SAFE_SCALE;

	return {
		centerX: bounds.left + bounds.width / 2,
		centerY: bounds.top + bounds.height / 2,
		angle: -(angleRadians * 180) / Math.PI,
		fontSize,
		letterSpacing: fontSize * PLAY_BUILDER_WATERMARK_LETTER_SPACING_EM
	};
};

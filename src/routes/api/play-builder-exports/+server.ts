import { json } from '@sveltejs/kit';
const unavailable = () => json({ message: 'Video exports are generated locally in your browser. Use the video download controls in the play builder.' }, { status: 410 });
export const GET = unavailable;
export const POST = unavailable;

import { XataClient } from './../xata';
import { XATA_API_KEY } from '$env/static/private';

export const xata = new XataClient({ apiKey: XATA_API_KEY });

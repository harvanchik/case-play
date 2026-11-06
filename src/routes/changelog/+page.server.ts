import markdown from '../../../CHANGELOG.md?raw';
import {parseChangelog} from '$lib/changelog';

export const load=()=>({releases:parseChangelog(markdown)});

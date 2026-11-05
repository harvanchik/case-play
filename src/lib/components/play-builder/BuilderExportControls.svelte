<script lang="ts">
 import BuilderActionBar from './BuilderActionBar.svelte';
 import BuilderActionButton from './BuilderActionButton.svelte';
 import ExportDropdown from './ExportDropdown.svelte';
 export let imageProgress:number|null=null;export let videoProgress:number|null=null;
 export let multipleImages=false;export let multipleVideos=false;
 export let disabled=false;export let videoDisabled=false;export let videoAllDisabled=false;
 export let videoTooltip='';export let modifier:string;export let settingsOpen=false;
 export let oncancel:()=>void;export let onall:(format:string)=>void;
 export let onimage:(format:string)=>void;export let onvideo:(format:string)=>void;
 export let onsettings:()=>void;export let onfullscreen:()=>void;
</script>
<BuilderActionBar position="top-right" label="Export controls" tutorial="export-buttons">
 <ExportDropdown progress={imageProgress} oncancel={oncancel} multiple={multipleImages} onall={onall} formats={['png','jpg','webp','pdf']} disabled={disabled} onselect={onimage} />
 <ExportDropdown progress={videoProgress} oncancel={oncancel} allDisabled={videoAllDisabled} multiple={multipleVideos} onall={onall} formats={['mp4','mov','webm','gif']} video={true} badge={true} disabled={videoDisabled} tooltip={videoTooltip} onselect={onvideo} />

				<BuilderActionButton
					tooltip="Export Settings"
					shortcutKeys={[modifier, 'Shift', 'O']}
					ariaLabel="Open export settings"
					label="Options"
					wrapperClass="ml-2 flex h-9 w-10 shrink-0"
					expanded={settingsOpen}
					disabled={disabled}
					onclick={onsettings}
				>
					<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
						<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" fill="none" stroke="currentColor" stroke-width="2" />
					</svg>
				</BuilderActionButton>
			<BuilderActionButton tooltip="Enter Full Screen" shortcutKeys={['F11']} ariaKeyshortcuts="F11" ariaLabel="Enter full screen" label="Go Full" buttonClass="relative" disabled={disabled} onclick={onfullscreen}><span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 px-1 text-[8px] leading-3 font-black text-white">NEW</span><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/></svg></BuilderActionButton>
</BuilderActionBar>
import { driver, type Driver, type DriveStep } from 'driver.js';

type Lesson = { side?: 'top' | 'left' | 'right' | 'bottom'; highlights?: string[]; keys?: 'playback' | 'steps'; target: string; title: string; description: string; wait?: () => boolean; skip?: () => void; prepare?: () => void | Promise<void> };
export function startAnimationTutorial(hooks: {
 ghosts: () => void; beginNextMovement: () => void; nextMovementReady: () => boolean; nextMovement: () => void;
 added: () => boolean; moved: () => boolean; add: () => void; move: () => void;
 lesson: (mode: 'none' | 'playback' | 'steps') => void;
 boundaries: () => void; endStep: () => void; pathOpen: () => boolean; prepareRoute: () => Promise<void>;
 editStep: () => void; openPath: () => Promise<void>; closePath: () => void;
 finish: () => void; register: (tour: Driver) => void;
}) {
 const dock = '[aria-label="Play animation controls"]';
 const field = '.play-builder-interaction';
 const lessons: Lesson[] = [
  {target:'[aria-label="Add animation step"]',title:'Add Your First Step',description:'Click + to add Step 2. Start is your opening formation; each new step copies the last one.',wait:hooks.added,skip:hooks.add},
  {target:field,title:'Move Any Element',description:'Drag any element to where it should go in this step. Try moving a few.',wait:hooks.moved,skip:hooks.move},
  {target:field,title:'Origins and Routes',prepare:hooks.editStep,description:'Faded elements show where they came from. Dashed lines show where they will move. Click an element or its ghost to select it.'},
  {target:'[aria-label="Show ghosts"]',title:'Show or Hide Ghosts',prepare:hooks.ghosts,description:'Toggle the ghost button to show or hide previous positions.'},
  {target:field,title:'Snap Movement and Revert',prepare:hooks.editStep,description:'Hold Shift while dragging to snap movement to 45° angles. The revert button beside the trash can returns a moved element to its origin. Delete removes it from this step onward.'},
  {target:'[aria-label="Add animation step"]',title:'Build the Next Movement',prepare:hooks.beginNextMovement,wait:hooks.nextMovementReady,skip:hooks.nextMovement,description:'Add another step and move elements again to continue the play. Each play can be up to one minute long.'},
  {target:'.step-duration',title:'Set the Step Duration',description:'Click the seconds to set how long this step takes. Use the up and down keys for small adjustments.',prepare:hooks.editStep},
  {target:'[aria-label="Timeline playback controls"]',title:'Animation Playback',prepare:hooks.editStep,description:'Use the playback buttons or keyboard shortcuts to watch your animation move.',keys:'playback'},
  {target:'[aria-label="Animation playhead"]',title:'Scrub and Select',prepare:hooks.editStep,description:'Drag the blue square to preview any moment. Snap to a step marker to edit that step.',keys:'playback'},
  {target:'[aria-label="Timeline playback controls"]',title:'Rewind and Fast Forward',prepare:hooks.editStep,description:'Click to skip a little, or hold to travel at 2× speed. Arrow keys do this during playback; use Shift+Arrow when paused.',keys:'playback'},
  {target:'[aria-label="Cycle playback speed"]',title:'Playback Speed',prepare:hooks.editStep,description:'Click to change how fast the preview plays. Your step durations stay the same.',keys:'playback'},
  {target:'[aria-label="Loop playback"]',title:'Repeat Playback',prepare:hooks.editStep,description:'Turn repeat on to keep the animation looping.',keys:'playback'},
  {target:'[aria-label="Animation steps"]',title:'Manage Steps',side:'left',description:'Press 1–9 to jump to a step. Drag step buttons to reorder them. Right-click or double-click a step for duplicate, delete, or Create Play from Step.',prepare:hooks.editStep,keys:'steps'},
  {target:'[aria-label="Animation playhead"]',title:'Drag a Step to Adjust Duration',description:'Drag a step marker to give one step more time and the next step less.',prepare:hooks.boundaries},
  {target:field,title:'Add, Remove, and Rename',description:'Place new elements, delete ones you no longer need, or double-click an element to rename it. These changes apply from this step onward.',prepare:hooks.endStep},
  {target:field,title:'Choose a Movement Path',description:'Double-click or right-click a dashed route or its ghost to open the movement options.',prepare:hooks.prepareRoute,wait:hooks.pathOpen,skip:()=>void hooks.openPath()},
  {target:'[data-animation-path-picker]',title:'Movement Paths',description:'Linear goes straight to the destination. Curved gives you a bend handle to drag.',prepare:hooks.openPath},
  {target:field,title:'Draw a Custom Route',prepare:hooks.openPath,description:'Choose Custom, then drag a route on the field and release to finish. Use Redraw to try again.'},
  {target:'[data-animation-path-picker]',title:'Departure and Arrival',prepare:hooks.openPath,description:'Drag the left handle to leave later or the right handle to arrive earlier. Hold Shift for finer adjustments.'},
  {target:'[data-animation-path-picker]',title:'Easing and Jump Cuts',prepare:hooks.openPath,description:'Choose easing to speed up or slow down along a route. Jump skips the movement and appears at the destination at the departure time.'},
  {target:'[aria-label="Clear animation"]',highlights:['[aria-label="Clear animation"]','[aria-label="Undo"]','[aria-label="Redo"]'],title:'Clear, Undo, and Redo',description:'Clear Animation removes the later steps and keeps Start. Undo brings an edit back; Redo applies it again.',prepare:hooks.closePath},
  {target:dock,title:'Move and Resize the Animation Doc',description:'Drag empty space to move the Animation Doc. Drag the handles on either edge to resize it.'},
  {target:dock,title:"You're All Set",description:'You’re ready to bring your plays to life. Try an idea, make it move, and create something great!'}
 ];
 let tour: Driver;
 let poll: ReturnType<typeof setInterval> | undefined;
 let advancing = false;
 let ended = false;
 let layoutFrame: number | null = null;
 let resizeObserver: ResizeObserver | undefined;
 let menuObserver: MutationObserver | undefined;
 const finish = () => { if (ended) return; ended = true; clearInterval(poll); if(layoutFrame!==null)cancelAnimationFrame(layoutFrame); resizeObserver?.disconnect(); menuObserver?.disconnect(); document.body.classList.remove('animation-tutorial-resize'); hooks.finish(); };
 const next = async () => {
  if (advancing || ended) return;
  advancing = true;
  try {
   const index = tour.getActiveIndex() ?? 0;
   lessons[index].skip?.();
   if (index === lessons.length - 1) tour.destroy();
   else {
    await lessons[index + 1].prepare?.();
    if (!ended) tour.moveNext();
   }
  } finally { advancing = false; }
 };
 const steps: DriveStep[] = lessons.map((lesson,index) => ({element:lesson.target,popover:{title:lesson.title,description:lesson.description,side:lesson.side??'top',align:'center',nextBtnText:index===lessons.length-1?'Done':lesson.wait?'Skip':'Next',onNextClick:next}}));
 tour = driver({steps,animate:true,duration:250,overlayColor:'#1c1917',overlayOpacity:.58,allowClose:false,overlayClickBehavior:()=>{},allowKeyboardControl:false,stagePadding:5,stageRadius:0,popoverOffset:10,popoverClass:'caseplay-tutorial-popover',showButtons:['next'],showProgress:true,progressText:'{{current}} / {{total}}',
  onPopoverRender:(popover)=>{const end=document.createElement('button');end.type='button';end.textContent='End';end.className='caseplay-tutorial-end';end.setAttribute('aria-label','End tutorial');end.addEventListener('click',()=>tour.destroy());popover.footerButtons.appendChild(end);},
  onHighlightStarted:(_element,_step,options)=>{
   clearInterval(poll); if(layoutFrame!==null)cancelAnimationFrame(layoutFrame); resizeObserver?.disconnect(); menuObserver?.disconnect();
   const index=options.index??0, lesson=lessons[index];
   document.querySelector('.driver-overlay path')?.removeAttribute('data-animation-tutorial-highlights');
   hooks.lesson(lesson.keys ?? 'none');
   document.body.classList.toggle('animation-tutorial-resize',lesson.title==='Move and Resize the Animation Doc');
   if(lesson.highlights || lesson.title==='Move and Resize the Animation Doc') {
    let previousBounds='';
    const follow = () => {
     if(ended || tour.getActiveIndex()!==index) return;
     const selectors=lesson.highlights ?? [lesson.target];
     const bounds=selectors.flatMap(selector=>{const element=document.querySelector(selector);return element?[element.getBoundingClientRect()]:[];});
     const signature=JSON.stringify(bounds.map(b=>[b.x,b.y,b.width,b.height]));
     if(signature!==previousBounds){previousBounds=signature;tour.refresh();}
     if(lesson.highlights){
      const path=document.querySelector<SVGPathElement>('.driver-overlay path');
      if(path){
       const holes=bounds.map(b=>`M${b.left-5},${b.top-5}v${b.height+10}h${b.width+10}v-${b.height+10}Z`).join(' ');
       path.setAttribute('d',`M0,0H${window.innerWidth}V${window.innerHeight}H0Z ${holes}`);
       path.setAttribute('fill-rule','evenodd');
       path.setAttribute('data-animation-tutorial-highlights',String(bounds.length));
      }
     }
     layoutFrame=requestAnimationFrame(follow);
    };
    layoutFrame=requestAnimationFrame(follow);
   }
   const picker=document.querySelector('[data-animation-path-picker]');
   if(picker){
    resizeObserver=new ResizeObserver(()=>{if(!ended) tour.refresh();});resizeObserver.observe(picker);
    menuObserver=new MutationObserver(()=>{if(!ended) tour.refresh();});menuObserver.observe(picker,{childList:true,subtree:true});
   }
   if(lesson.wait) poll=setInterval(()=>{if(tour.getActiveIndex()===index&&lesson.wait?.()) void next();},100);
  },
  onDestroyed:finish
 });
 const destroy = tour.destroy.bind(tour);
 tour.destroy = () => { destroy(); finish(); };
 hooks.register(tour);
 tour.drive();
 return tour;
}

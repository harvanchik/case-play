/** The authored duration is unchanged; every exported video gets a one-second final-pose hold. */
export function videoFramePlan(duration:number,fps:number){
 const authoredFrames=Math.max(1,Math.ceil(duration*fps));
 return {authoredFrames,frames:authoredFrames+fps,time:(frame:number)=>Math.min(duration,frame/fps)};
}

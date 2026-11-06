export const ANIMATION_DOCK_KEY='caseplay-animation-dock-v1';
export type LockedDock={locked:true;x:number;y:number;width:number};
export function readLockedDock(storage:Pick<Storage,'getItem'>):LockedDock|null{
 try{
  const value=JSON.parse(storage.getItem(ANIMATION_DOCK_KEY)??'null');
  return value?.locked===true&&[value.x,value.y,value.width].every(Number.isFinite)&&value.width>0&&value.width<=10000?{locked:true,x:value.x,y:value.y,width:value.width}:null;
 }catch{return null;}
}
export function saveLockedDock(storage:Pick<Storage,'setItem'|'removeItem'>,value:LockedDock|null){
 try{if(value)storage.setItem(ANIMATION_DOCK_KEY,JSON.stringify(value));else storage.removeItem(ANIMATION_DOCK_KEY);}catch{/* Locking still works when browser storage is unavailable. */}
}

/** Bounded exports preserve input order and settle running work before restoring the editor. */
export async function concurrentVideoExports<T,R>(items:T[],limit:number,worker:(item:T,index:number)=>Promise<R>,signal:AbortSignal,onerror:(error:unknown)=>void):Promise<R[]> {
 const results:R[]=[];let next=0;let failure:unknown;
 await Promise.all(Array.from({length:Math.min(items.length,Math.max(1,limit))},async()=>{
  while(next<items.length&&!signal.aborted&&failure===undefined){
   const index=next++;
   try{results[index]=await worker(items[index],index);}catch(error){if(failure===undefined){failure=error;onerror(error);}return;}
  }
 }));
 if(failure!==undefined)throw failure;
 signal.throwIfAborted();return results;
}

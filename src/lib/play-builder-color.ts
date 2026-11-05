type RGB=[number,number,number];
const rgb=(color:string):RGB=>color.startsWith('#')?[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)) as RGB:color.match(/[\d.]+/g)!.slice(0,3).map(Number) as RGB;
// Conversion matrices from Björn Ottosson's public-domain OKLab reference:
// https://bottosson.github.io/posts/oklab/#converting-from-linear-srgb-to-oklab
const linear=(value:number)=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const encoded=(value:number)=>Math.round(255*Math.max(0,Math.min(1,value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055)));
function toOklab(color:RGB):RGB{
 const [r,g,b]=color.map(linear);
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
 const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
 const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.7936177850*m-.0040720468*s,1.9779984951*l-2.4285922050*m+.4505937099*s,.0259040371*l+.7827717662*m-.8086757660*s];
}
function fromOklab([L,a,b]:RGB):RGB{
 const l=(L+.3963377774*a+.2158037573*b)**3;
 const m=(L-.1055613458*a-.0638541728*b)**3;
 const s=(L-.0894841775*a-1.2914855480*b)**3;
 return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.7076147010*s].map(encoded) as RGB;
}
/** Blend perceptual lightness and opponent-color coordinates, then return displayable sRGB. */
export function perceptualColorTransition(from:string,to:string,progress:number){
 const t=Math.max(0,Math.min(1,progress)),source=rgb(from),destination=rgb(to);
 const a=toOklab(source),b=toOklab(destination);
 const result=t===0?source:t===1?destination:fromOklab(a.map((v,i)=>v+(b[i]-v)*t) as RGB);
 return `rgb(${result.join(', ')})`;
}
/** Tint the colored fabric while retaining neutral outlines, highlights and shading. */
export function fabricTintMatrix(reference:string,target:string){
 const source=rgb(reference).map(v=>v/255),destination=rgb(target).map(v=>v/255),mean=source.reduce((a,b)=>a+b)/3;
 const centered=source.map(v=>v-mean),norm=centered.reduce((sum,v,i)=>sum+v*source[i],0);
 return destination.flatMap((v,row)=>[...source.map((_,col)=>(row===col?1:0)+(v-source[row])*centered[col]/norm),0,0]).concat([0,0,0,1,0]).join(' ');
}

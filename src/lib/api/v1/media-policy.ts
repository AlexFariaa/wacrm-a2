export const MAX_MEDIA_BYTES=16*1024*1024;
const types:Record<string,{kind:'image'|'audio'|'video'|'document';ext:string;signature:(b:Buffer)=>boolean}>={
 'image/jpeg':{kind:'image',ext:'jpg',signature:b=>b.subarray(0,3).toString('hex')==='ffd8ff'},
 'image/png':{kind:'image',ext:'png',signature:b=>b.subarray(0,8).toString('hex')==='89504e470d0a1a0a'},
 'video/mp4':{kind:'video',ext:'mp4',signature:b=>b.toString('ascii',4,8)==='ftyp'},
 'audio/mp4':{kind:'audio',ext:'m4a',signature:b=>b.toString('ascii',4,8)==='ftyp'},
 'audio/mpeg':{kind:'audio',ext:'mp3',signature:b=>b.toString('ascii',0,3)==='ID3'||(b[0]===255&&(b[1]&224)===224)},
 'audio/ogg':{kind:'audio',ext:'ogg',signature:b=>b.toString('ascii',0,4)==='OggS'},
 'application/pdf':{kind:'document',ext:'pdf',signature:b=>b.toString('ascii',0,5)==='%PDF-'},
 'text/plain':{kind:'document',ext:'txt',signature:b=>!b.includes(0)&&!b.toString('utf8').includes('\uFFFD')},
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':{kind:'document',ext:'docx',signature:b=>b.toString('ascii',0,2)==='PK'},
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':{kind:'document',ext:'xlsx',signature:b=>b.toString('ascii',0,2)==='PK'},
};
export function validateMediaUpload(rawMime:string,bytes:Buffer){const mime=rawMime.split(';')[0].trim().toLowerCase();const entry=types[mime];if(!entry||bytes.length===0||bytes.length>(entry.kind==='image'?5*1024*1024:MAX_MEDIA_BYTES)||!entry.signature(bytes))throw new Error('unsupported_or_oversized_media');return {...entry,mime};}
export function trustedMediaUrl(value:string,project:string,account:string){try{const url=new URL(value);const base=new URL(project);const normalized=new URL(decodeURIComponent(url.pathname),url.origin);return url.protocol==='https:'&&url.origin===base.origin&&!url.username&&!url.password&&!url.hash&&!url.search&&normalized.pathname.startsWith(`/storage/v1/object/public/chat-media/account-${account}/`);}catch{return false;}}
export async function limitedBytes(response:Response,limit=MAX_MEDIA_BYTES){if(!response.ok||Number(response.headers.get('content-length')??0)>limit)throw new Error('media_unavailable');const reader=response.body?.getReader();if(!reader)throw new Error('media_unavailable');const chunks:Uint8Array[]=[];let size=0;try{for(;;){const result=await reader.read();if(result.done)break;size+=result.value.byteLength;if(size>limit)throw new Error('media_too_large');chunks.push(result.value);}return Buffer.concat(chunks);}finally{await reader.cancel().catch(()=>undefined);}}

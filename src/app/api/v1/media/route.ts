import {randomUUID} from 'node:crypto';
import {requireApiKey} from '@/lib/auth/api-context';
import {ok,fail,toApiErrorResponse} from '@/lib/api/v1/respond';
import {MAX_MEDIA_BYTES,validateMediaUpload,limitedBytes} from '@/lib/api/v1/media-policy';
export async function POST(request:Request){
 try{
  const ctx=await requireApiKey(request,'messages:send');
  if(Number(request.headers.get('content-length')??0)>MAX_MEDIA_BYTES+65536)return fail('bad_request','File exceeds upload limit',413);
  let body:Buffer;try{body=await limitedBytes(new Response(request.body),MAX_MEDIA_BYTES+65536);}catch{return fail('bad_request','File exceeds upload limit',413);}
  const form=await new Response(new Uint8Array(body),{headers:{'content-type':request.headers.get('content-type')??''}}).formData();const file=form.get('file');if(!(file instanceof File)||file.size>MAX_MEDIA_BYTES)return fail('bad_request','Invalid file',400);
  const bytes=Buffer.from(await file.arrayBuffer());let media;try{media=validateMediaUpload(file.type,bytes);}catch{return fail('bad_request','Unsupported file type, content or size',400);}
  const path=`account-${ctx.accountId}/${randomUUID()}.${media.ext}`;
  const uploaded=await ctx.supabase.storage.from('chat-media').upload(path,bytes,{contentType:media.mime,upsert:false});
  if(uploaded.error)return fail('internal','Media storage unavailable',503);
  const {data}=ctx.supabase.storage.from('chat-media').getPublicUrl(path);
  return ok({url:data.publicUrl,type:media.kind,filename:file.name.replace(/[^\p{L}\p{N}_. -]/gu,'_').slice(0,120)||`arquivo.${media.ext}`},201);
 }catch(error){return toApiErrorResponse(error);}
}

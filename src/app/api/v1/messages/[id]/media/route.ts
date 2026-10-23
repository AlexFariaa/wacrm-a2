import {requireApiKey} from '@/lib/auth/api-context';
import {fail,toApiErrorResponse} from '@/lib/api/v1/respond';
import {limitedBytes,trustedMediaUrl,MAX_MEDIA_BYTES} from '@/lib/api/v1/media-policy';
import {decrypt} from '@/lib/whatsapp/encryption';
import {getMediaUrl} from '@/lib/whatsapp/meta-api';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const ctx=await requireApiKey(request,'messages:read');const {id}=await params;
  const {data}=await ctx.supabase.from('messages').select('media_url,content_type,conversations!inner(account_id)').eq('id',id).eq('conversations.account_id',ctx.accountId).maybeSingle();
  if(!data?.media_url)return fail('not_found','Media not found',404);
  let response:Response;
  if(trustedMediaUrl(data.media_url,process.env.NEXT_PUBLIC_SUPABASE_URL!,ctx.accountId))response=await fetch(data.media_url,{redirect:'error',signal:AbortSignal.timeout(20000)});
  else{
   const legacy=/^\/api\/whatsapp\/media\/(\d+)$/.exec(data.media_url);if(!legacy)return fail('bad_request','Untrusted media location',400);
   const config=await ctx.supabase.from('whatsapp_config').select('access_token').eq('account_id',ctx.accountId).single();if(!config.data)return fail('not_found','Channel not configured',404);
   const token=decrypt(config.data.access_token);const media=await getMediaUrl({mediaId:legacy[1],accessToken:token});if(media.fileSize&&media.fileSize>MAX_MEDIA_BYTES)return fail('bad_request','Media too large',413);
   response=await fetch(media.url,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(20000)});
  }
  const bytes=await limitedBytes(response);const mime=response.headers.get('content-type')?.split(';')[0]??'application/octet-stream';
  const inline=['image/jpeg','image/png','image/webp','audio/mpeg','audio/ogg','audio/mp4','audio/wav','video/mp4'].includes(mime);
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':mime,'Content-Disposition':inline?'inline':'attachment; filename="arquivo"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return toApiErrorResponse(error);}
}

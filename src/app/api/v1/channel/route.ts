import {requireApiKey} from '@/lib/auth/api-context';
import {ok,fail,toApiErrorResponse} from '@/lib/api/v1/respond';
export async function GET(request:Request){
 try{
  const ctx=await requireApiKey(request,'conversations:read');
  const {data,error}=await ctx.supabase.from('whatsapp_config').select('phone_number_id,status,registered_at,subscribed_apps_at,last_registration_error').eq('account_id',ctx.accountId).maybeSingle();
  if(error)return fail('internal','Failed to read channel',500);
  return ok({configured:!!data,phone_number_id:data?.phone_number_id??null,status:data?.status??'disconnected',registered_at:data?.registered_at??null,subscribed_apps_at:data?.subscribed_apps_at??null,registration_error:!!data?.last_registration_error});
 }catch(error){return toApiErrorResponse(error);}
}

import { requireApiKey } from '@/lib/auth/api-context'
import { ok, fail, toApiErrorResponse } from '@/lib/api/v1/respond'

// Conservative account-wide preflight for external responders. Any active
// automation or flow blocks an external agent, even if its trigger may not
// match this particular message.
export async function GET(request: Request) {
  try {
    const ctx = await requireApiKey(request, 'conversations:read')
    const [ai, automations, flows] = await Promise.all([
      ctx.supabase.from('ai_configs').select('is_active,auto_reply_enabled').eq('account_id', ctx.accountId).maybeSingle(),
      ctx.supabase.from('automations').select('id', { count: 'exact', head: true }).eq('account_id', ctx.accountId).eq('is_active', true),
      ctx.supabase.from('flows').select('id', { count: 'exact', head: true }).eq('account_id', ctx.accountId).eq('status', 'active'),
    ])
    if (ai.error || automations.error || flows.error) return fail('internal', 'Failed to check automation status', 500)
    return ok({
      ai_auto_reply_enabled: ai.data?.is_active === true && ai.data?.auto_reply_enabled === true,
      active_automations_count: automations.count ?? 0,
      active_flows_count: flows.count ?? 0,
    })
  } catch (error) {
    return toApiErrorResponse(error)
  }
}

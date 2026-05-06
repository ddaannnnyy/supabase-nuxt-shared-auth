export function useSharedAuthCookies() {
  const runtimeConfig = useRuntimeConfig()
  const supabaseProject = new URL(runtimeConfig.public.supabase.url).hostname
  const access_token = useCookie(`shared-access-token-${supabaseProject}-access-token`)
  const refresh_token = useCookie(`shared-access-token-${supabaseProject}-refresh-token`)

  return {
    access_token,
    refresh_token,
  }
}

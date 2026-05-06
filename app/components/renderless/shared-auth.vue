<script setup lang="ts">
import type { Subscription } from '@supabase/auth-js'

export type SameSite = boolean | 'lax' | 'strict' | 'none'

export interface Props {
  domain: string
  maxAge?: number
  path?: string
  sameSite?: SameSite
  redirect?: boolean
  redirectLocation?: `/${string}`
  disableDevDomain?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  maxAge: 100 * 365 * 24 * 60 * 60,
  path: '/',
  sameSite: 'lax',
  redirect: true,
  redirectLocation: '/logout',
  disableDevDomain: false,
})
const supabase = useSupabaseClient()
const runtimeConfig = useRuntimeConfig()
const supabaseProject = new URL(runtimeConfig.public.supabase.url || runtimeConfig.public.sharedAuth.supabaseProject).hostname

const supabaseAuthSubscription = ref<Subscription | null>(null)
const currentlyApplyingTokens = ref<boolean>(false)

const { domain, maxAge, path, sameSite, redirect, redirectLocation, disableDevDomain } = toRefs(props)

const access_token_cookie = useCookie(`shared-access-token-${supabaseProject}-access-token`, {
  domain: import.meta.dev && !disableDevDomain.value ? '.localhost' : `.${domain.value}`,
  path: path.value,
  maxAge: maxAge.value,
  sameSite: sameSite.value,
  secure: !(import.meta.dev && !disableDevDomain.value),
  watch: true,
})
const refresh_token_cookie = useCookie(`shared-access-token-${supabaseProject}-refresh-token`, {
  domain: import.meta.dev && !disableDevDomain.value ? '.localhost' : `.${domain.value}`,
  path: path.value,
  maxAge: maxAge.value,
  sameSite: sameSite.value,
  secure: !(import.meta.dev && !disableDevDomain.value),
  watch: true,
})

onMounted(() => {
  if (import.meta.dev && !disableDevDomain.value) {
    console.warn(`Dev only warning\r\nDev version active, cookie domain will be set to .localhost overriding the domain prop in development environments.\r\nIn production the domain value will be passed and this warning will not show`)
  }

  const { subscription } = startAuthStateHook()
  supabaseAuthSubscription.value = subscription
})

onBeforeUnmount(() => {
  if (supabaseAuthSubscription.value) {
    supabaseAuthSubscription.value.unsubscribe()
  }
})

watch([access_token_cookie, refresh_token_cookie], async ([new_access_token_cookie, new_refresh_token_cookie]) => {
  if (currentlyApplyingTokens.value)
    return

  if (!new_access_token_cookie && !new_refresh_token_cookie) {
    // Tokens have been revoked elsewhere
    access_token_cookie.value = null
    refresh_token_cookie.value = null
    await supabase.auth.signOut()
    if (redirect.value) {
      return await navigateTo(redirectLocation.value)
    }
    return
  }
  /*
  This doesn't sign out because theres a chance the immediate runs before the subscription has had a chance to apply the cookies the first time
  This skip should be fine as cleanup occurs on any errors
  */
  if (!new_access_token_cookie || !new_refresh_token_cookie)
    return

  const { data: { session: current } } = await supabase.auth.getSession()
  if ((current?.access_token === new_access_token_cookie) && (current.refresh_token === new_refresh_token_cookie))
    return
  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: new_access_token_cookie,
    refresh_token: new_refresh_token_cookie,
  })

  if (setSessionError) {
    console.error(`Unable to set session`)
    access_token_cookie.value = null
    refresh_token_cookie.value = null
    await supabase.auth.signOut()
    if (redirect.value) {
      return await navigateTo(redirectLocation.value)
    }
    return
  };
}, { immediate: true })

function startAuthStateHook() {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    currentlyApplyingTokens.value = true
    try {
      if (event === 'INITIAL_SESSION') {
        const { data: { session: current }, error: getSessionError } = await supabase.auth.getSession()
        if (current?.access_token && current.refresh_token) {
          access_token_cookie.value = current.access_token
          refresh_token_cookie.value = current.refresh_token
          const { error: getSessionError } = await supabase.auth.setSession({
            access_token: access_token_cookie.value,
            refresh_token: refresh_token_cookie.value,
          })
          if (getSessionError) {
            throw new Error('Unable to set session with provided tokens')
          }
        }
        if (getSessionError) {
          throw new Error('Unable to set session with provided tokens')
        };
      }
      else if (event === 'SIGNED_OUT') {
        // revoke tokens
        access_token_cookie.value = null
        refresh_token_cookie.value = null
        if (redirect.value) {
          return await navigateTo(redirectLocation.value)
        }
      }
      else if (event === 'SIGNED_IN') {
        // set tokens
        access_token_cookie.value = session?.access_token
        refresh_token_cookie.value = session?.refresh_token
      }
      else if (event === 'TOKEN_REFRESHED') {
        // refresh tokens
        access_token_cookie.value = session?.access_token
        refresh_token_cookie.value = session?.refresh_token
      }
    }
    catch {
      // revoke tokens
      access_token_cookie.value = null
      refresh_token_cookie.value = null
      await supabase.auth.signOut()
    }
    finally {
      nextTick(() => currentlyApplyingTokens.value = false)
    }
  })

  return data
}
</script>

<template>
  <div id="shared-auth-component" />
</template>

<style scoped>
#shared-auth-component {
    width: 1;
    height: 1;
    position: absolute;
    left: -1000px;
}
</style>

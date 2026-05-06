# Supabase Shared Authentication

This layer provides your supabase session as domains sharable between sub-domains.

That is, a user can log into a.site.com and then carry their session over to b.site.com without having to re-authenticate, and vise versa.

This solves a problem that I had with applications that were provided as iframes, as well as smooth access between related sites which are kept on separate domains for simplicity, or a separation of powers.

## Requirements

This layer solves a pretty specific purpose for me, and it wasn't made as a bulletproof solution so it does require some standards.

- This solution only supports supabase as an authentication system, although you're welcome to adapt it to suit your own needs. This is provided without warranty though.
- The projects must use the **same** supabase project for their authentication. I.e. the supabase credentials must match for the session to be generated between projects.
- `process.env.SUPABASE_URL` must be provided at the project level, alternatively you must provide a project key which is shared between your applications using the same project as a URL under `runtimeConfig.public.sharedAuth.supabaseProject`. The domain is stripped from the URL and used to manage the relationship between shared auth systems.
- This application will expose current supabase access tokens and refresh tokens as multi-domain cookies, which will make them client viewable. If this is not suitable for your needs then I do not recommend this solution.

## Installation

As a layer, simply extend the nuxt profile of each of the applications that you would like to share the authentication systems.

```ts
// nuxt.config.ts in Parent Application
export default defineNuxtConfig({
  /* ... The rest of your config ... */
  extends: ["github:ddaannnnyy/supabase-nuxt-shared-auth"]
  /* ... The rest of your config ... */
})
```

alternatively you can clone the repository and serve the layer locally

```ts
// nuxt.config.ts in Parent Application
export default defineNuxtConfig({
  /* ... The rest of your config ... */
  /* link to the relative location of this layer */
  extends: ['./layers/supabase-nuxt-shared-auth']
  /* ... The rest of your config ... */
})
```

Ensure you have the supabase module installed, this layer relies on composables provided by the module, it is currently untested with a manual supabase installation in a nuxt environment.

You can install the supabase module by running

```bash
npx nuxi@latest module add supabase
```

ensure that the module is registered in your config

```ts
export default defineNuxtConfig({
  /* ... The rest of your config ... */
  modules: ['@nuxtjs/supabase'],
  /* ... The rest of your config ... */
})
```

then just add the `renderless-shared-auth` component to your `app.vue`

```jsx
<renderless-shared-auth domain="site.com" />
```

> Note - By default while in development the cookies are registered with the .localhost domain. This lets you test the system across local addressed. i.e. localhost:3000 & localhost:3001. In production the cookies will be registered against the domain prop in the multi-domain syntax (`.${domain}`).

## Component Props

`<renderless-shared-auth />`

Props

### Props and defaults


| name             | type                                  | default   | required |
| ---------------- | ------------------------------------- | --------- | -------- |
| domain           | string                                | -         | ✅        |
| maxAge           | number                                | 100 years |          |
| path             | string                                | '/'       |          |
| sameSite         | - boolean - "lax" - "strict" - "none" | 'lax'     |          |
| redirect         | boolean                               | true      |          |
| redirectLocation | /${string}                            | "/logout" |          |
| disableDevDomain | boolean                               | false     |          |


> Note - `redirect` and `redirectLocation` are used when tokens are revoked. If tokens are revoked or setting a session fails, the user will be redirected. Disable this for access that allows guest or anon users, or if you'd like to handle unauthorised users entirely in your own middleware.

---

Type Definition

### Type Definition

```ts
export type SameSite = boolean | 'lax' | 'strict' | 'none' | undefined

export interface Props {
  domain: string
  maxAge?: number
  path?: string
  sameSite?: SameSite
  redirect?: boolean
  redirectLocation?: `/${string}`
  disableDevDomain?: boolean
}
```

---

## Composable

`useSharedAuthCookies`

Returns the current access and refresh tokens stored by then shared auth cookie

```ts
const { access_token, refresh_token } = useSharedAuthCookies()
```

This allows you to access the supplied tokens in middleware, or for logging, etc.
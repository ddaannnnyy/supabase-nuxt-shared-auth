/* eslint-disable node/prefer-global/process */
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  runtimeConfig: {
    public: {
      sharedAuth: {
        supabaseProject: process.env.SUPABASE_URL,
      },
    },
  },
})

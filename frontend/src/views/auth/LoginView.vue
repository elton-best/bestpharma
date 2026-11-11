<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { officineService } from '@/services/officine'
import { demoMode, request } from '@/services/quality'
const mfa=ref('');const google=ref(false)
onMounted(async()=>{if(!demoMode){try{google.value=(await request<{google_enabled:boolean}>('/auth/providers')).google_enabled}catch{/* availability must not block password login */}}})
async function googleLogin(){error.value='';try{window.location.assign((await request<{url:string}>('/auth/google/start','POST')).url)}catch(e){error.value=(e as Error).message}}
const router = useRouter(); const route = useRoute(); const email = ref(''); const password = ref(''); const busy = ref(false); const error = ref('')
async function login() {
 busy.value = true; error.value = ''
 try {
  const result = await request<{ token: string; officines: { id: number; status: string }[]; is_platform_admin: boolean;mfa_enrollment_required?:boolean }>('/auth/login', 'POST', { email: email.value, password: password.value,mfa_code:mfa.value||undefined })
  let officine: {id:number;status:string}|undefined
  sessionStorage.removeItem('bestpharma.officine')
  sessionStorage.setItem('bestpharma.token', result.token)
  sessionStorage.setItem('bestpharma.platform', String(result.is_platform_admin))
  if(result.mfa_enrollment_required){router.push('/dashboard/securite');return}
  const next = route.query.next
  if (typeof next === 'string' && /^\/(?:invitation|internal-invitation)#token=[A-Za-z0-9%]+$/.test(next)) { router.push(next); return }
  if (result.is_platform_admin) { router.push('/beg/inscriptions'); return }
  const account = await officineService.account()
  const active = account.officines.filter(o=>o.status==='active')
  if(active.length>1){router.push('/choose-officine');return}
  officine=active[0]
  if (officine) sessionStorage.setItem('bestpharma.officine', String(officine.id))
  router.push(officine ? '/dashboard' : '/application')
 } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}
</script>
<template><div class="login-page"><div class="login-story"><RouterLink class="brand" to="/">bestpharma.</RouterLink><div><p class="eyebrow">L’OFFICINE, SIMPLEMENT.</p><h1>Du temps pour<br><span class="accent-serif">ce qui compte.</span></h1><p>Qualité, suivi et sérénité au quotidien.</p></div><small>Une plateforme BEG · Pensée pour les officines.</small></div><div class="login-content"><section><span class="eyebrow">BIENVENUE DANS VOTRE ESPACE</span><h2>{{ demoMode ? 'Découvrez BestPharma' : 'Heureux de vous retrouver.' }}</h2><template v-if="demoMode"><p>Explorez une démonstration avec des données fictives, sauvegardées uniquement dans votre navigateur.</p><RouterLink class="button primary" to="/dashboard">Ouvrir la démonstration</RouterLink><p class="muted-note">Ne saisissez aucune donnée personnelle ou de santé.</p></template><div v-else><form @submit.prevent="login"><p v-if="error" class="alert error" role="alert">{{ error }}</p><label>Adresse e-mail<input v-model="email" type="email" autocomplete="username" required /></label><label>Mot de passe<input v-model="password" type="password" autocomplete="current-password" required /></label><label>Code MFA ou code de secours (si activé)<input v-model="mfa" inputmode="text" maxlength="32" autocomplete="one-time-code" /></label><button class="button primary" :disabled="busy">{{ busy ? 'Connexion…' : 'Se connecter' }}</button></form></div><RouterLink class="text-link registration-link" to="/register">Ouvrir mon espace officine →</RouterLink><RouterLink v-if="!demoMode" to="/forgot-password" class="text-link registration-link">Mot de passe oublié</RouterLink><button v-if="!demoMode&&google" class="button secondary" @click="googleLogin">Continuer avec Google</button><small v-else-if="!demoMode" class="muted-note">Google non configuré dans cet environnement.</small></section></div></div></template>

<style scoped>
</style>

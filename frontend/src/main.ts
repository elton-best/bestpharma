import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import './assets/erp.css'
import './assets/lisibilite.css'
import './assets/officine-theme.css'
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, { theme: { preset: Aura } })
// Resolve the initial public route before mounting authenticated shell components.
router.isReady().then(() => app.mount('#app'))

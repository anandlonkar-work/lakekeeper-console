/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins';
import auth from '@/plugins/auth';

// Components
import App from './App.vue';

// Composables
import { createApp } from 'vue';

const app = createApp(App);

// Enable Vue DevTools in production for debugging
// @ts-ignore
app.config.devtools = true;

registerPlugins(app);

app.use(auth);
app.mount('#app');

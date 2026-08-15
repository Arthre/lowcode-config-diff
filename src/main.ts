import { createApp } from 'vue'
import 'virtual:uno.css'
import './styles/index.scss'
import App from './App.vue'
import router from './router'
import pinia from './stores'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')

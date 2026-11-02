import { defineConfig } from 'vite';
import reactNativeWeb from 'vite-plugin-react-native-web';

export default defineConfig({
  plugins: [reactNativeWeb()],

  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
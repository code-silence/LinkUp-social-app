
import { defineConfig } from 'vite';
import reactNativeWeb from 'vite-plugin-react-native-web';

export default defineConfig({
    plugins: [reactNativeWeb()],

    resolve: {
        alias: {
            'react-native': 'react-native-web',
            '@react-native/assets-registry/registry':
                'react-native-web/dist/modules/AssetRegistry',
        },
    },

    server: {
        port: 5173,
        host: '0.0.0.0',
    },
});

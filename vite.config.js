import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login/index.html'),
        signup: resolve(__dirname, 'signup/index.html'),
        app: resolve(__dirname, 'app/index.html'),
        assistant: resolve(__dirname, 'app/assistant/index.html'),
        bookings: resolve(__dirname, 'app/bookings/index.html'),
        profile: resolve(__dirname, 'app/profile/index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        adminSlots: resolve(__dirname, 'admin/slots/index.html'),
        adminBookings: resolve(__dirname, 'admin/bookings/index.html'),
        adminUsers: resolve(__dirname, 'admin/users/index.html')
      }
    }
  },
  test: {
    include: ['tests/**/*.test.js'],
    exclude: [
      'dist/**',
      'legacy/**',
      '.superpowers/**',
      '~/**',
      'node_modules/**'
    ]
  }
});

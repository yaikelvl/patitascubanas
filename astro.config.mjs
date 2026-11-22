import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false })
  ],
  vite: {
    optimizeDeps: {
      include: ['lucide-react', '@supabase/supabase-js', 'crypto-js']
    }
  }
});

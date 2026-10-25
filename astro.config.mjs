import { defineConfig } from 'astro/config';

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import Compress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  integrations: [
    sitemap({
      serialize(item) {
        item.lastmod = new Date();
        return item;
      },
    }),
    Compress({
      Image: false,
      Exclude: (file) => /safari-pinned-tab\.svg$/.test(file),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});

import { defineConfig } from 'astro/config';

import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import Compress from "@playform/compress";
import robotsTxt from "astro-robots-txt";

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      serialize(item) {
        item.lastmod = new Date();
        return item;
      },
    }),
    robotsTxt(),
    Compress({
      Image: false,
      Exclude: (file) => /safari-pinned-tab\.svg$/.test(file),
    }),
  ]
});

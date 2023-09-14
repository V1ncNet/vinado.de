import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
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
  ]
});

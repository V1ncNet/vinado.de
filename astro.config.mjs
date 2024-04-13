import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import Compress from "@playform/compress";

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

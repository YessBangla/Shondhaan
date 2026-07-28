// vite.config.ts
import { defineConfig } from "file:///B:/SHONDHAAN/shondhaan/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///B:/SHONDHAAN/shondhaan/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { VitePWA } from "file:///B:/SHONDHAAN/shondhaan/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "B:\\SHONDHAAN\\shondhaan\\frontend";
var vite_config_default = defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.ico",
        "favicon.png",
        "icons/apple-touch-icon.png"
      ],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/],
        globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,webp,woff2}"],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      manifest: {
        name: "Shondhaan",
        short_name: "Shondhaan",
        description: "\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7\u09B0 \u09AA\u09CD\u09B0\u09BF\u09AE\u09BF\u09AF\u09BC\u09BE\u09AE \u09B9\u09CB\u09AE \u09B8\u09BE\u09B0\u09CD\u09AD\u09BF\u09B8 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u099F\u09AB\u09B0\u09CD\u09AE",
        lang: "bn",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#277A4F",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJCOlxcXFxTSE9OREhBQU5cXFxcc2hvbmRoYWFuXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJCOlxcXFxTSE9OREhBQU5cXFxcc2hvbmRoYWFuXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9COi9TSE9OREhBQU4vc2hvbmRoYWFuL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoKSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIGhtcjoge1xyXG4gICAgICBvdmVybGF5OiBmYWxzZSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJhdXRvVXBkYXRlXCIsXHJcbiAgICAgIGluamVjdFJlZ2lzdGVyOiBmYWxzZSxcclxuICAgICAgZGV2T3B0aW9uczogeyBlbmFibGVkOiBmYWxzZSB9LFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXHJcbiAgICAgICAgXCJmYXZpY29uLmljb1wiLFxyXG4gICAgICAgIFwiZmF2aWNvbi5wbmdcIixcclxuICAgICAgICBcImljb25zL2FwcGxlLXRvdWNoLWljb24ucG5nXCIsXHJcbiAgICAgIF0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL35vYXV0aC8sIC9eXFwvYXBpL10sXHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxwbmcsanBnLGpwZWcsc3ZnLHdlYnAsd29mZjJ9XCJdLFxyXG4gICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcclxuICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogNSAqIDEwMjQgKiAxMDI0LFxyXG4gICAgICB9LFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6IFwiU2hvbmRoYWFuXCIsXHJcbiAgICAgICAgc2hvcnRfbmFtZTogXCJZZXNzXCIsXHJcbiAgICAgICAgZGVzY3JpcHRpb246XHJcbiAgICAgICAgICBcIlx1MDlBQ1x1MDlCRVx1MDk4Mlx1MDlCMlx1MDlCRVx1MDlBNlx1MDlDN1x1MDlCNlx1MDlDN1x1MDlCMCBcdTA5QUFcdTA5Q0RcdTA5QjBcdTA5QkZcdTA5QUVcdTA5QkZcdTA5QUZcdTA5QkNcdTA5QkVcdTA5QUUgXHUwOUI5XHUwOUNCXHUwOUFFIFx1MDlCOFx1MDlCRVx1MDlCMFx1MDlDRFx1MDlBRFx1MDlCRlx1MDlCOCBcdTA5QUFcdTA5Q0RcdTA5QjJcdTA5Q0RcdTA5QUZcdTA5QkVcdTA5OUZcdTA5QUJcdTA5QjBcdTA5Q0RcdTA5QUVcIixcclxuICAgICAgICBsYW5nOiBcImJuXCIsXHJcbiAgICAgICAgc3RhcnRfdXJsOiBcIi9cIixcclxuICAgICAgICBzY29wZTogXCIvXCIsXHJcbiAgICAgICAgZGlzcGxheTogXCJzdGFuZGFsb25lXCIsXHJcbiAgICAgICAgb3JpZW50YXRpb246IFwicG9ydHJhaXRcIixcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiNmZmZmZmZcIixcclxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjMjc3QTRGXCIsXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHsgc3JjOiBcIi9pY29ucy9pY29uLTE5Mi5wbmdcIiwgc2l6ZXM6IFwiMTkyeDE5MlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiIH0sXHJcbiAgICAgICAgICB7IHNyYzogXCIvaWNvbnMvaWNvbi0zODQucG5nXCIsIHNpemVzOiBcIjM4NHgzODRcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9LFxyXG4gICAgICAgICAgeyBzcmM6IFwiL2ljb25zL2ljb24tNTEyLnBuZ1wiLCBzaXplczogXCI1MTJ4NTEyXCIsIHR5cGU6IFwiaW1hZ2UvcG5nXCIgfSxcclxuICAgICAgICAgIHsgc3JjOiBcIi9pY29ucy9pY29uLW1hc2thYmxlLTUxMi5wbmdcIiwgc2l6ZXM6IFwiNTEyeDUxMlwiLCB0eXBlOiBcImltYWdlL3BuZ1wiLCBwdXJwb3NlOiBcIm1hc2thYmxlXCIgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICB9LFxyXG4gICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcInJlYWN0L2pzeC1ydW50aW1lXCJdLFxyXG4gIH0sXHJcbn0pKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UixTQUFTLG9CQUFvQjtBQUNwVCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZUFBZTtBQUh4QixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsT0FBTztBQUFBLEVBQ2pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZ0JBQWdCO0FBQUEsTUFDaEIsWUFBWSxFQUFFLFNBQVMsTUFBTTtBQUFBLE1BQzdCLGVBQWU7QUFBQSxRQUNiO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCwwQkFBMEIsQ0FBQyxhQUFhLFFBQVE7QUFBQSxRQUNoRCxjQUFjLENBQUMsZ0RBQWdEO0FBQUEsUUFDL0QsdUJBQXVCO0FBQUEsUUFDdkIsK0JBQStCLElBQUksT0FBTztBQUFBLE1BQzVDO0FBQUEsTUFDQSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUNFO0FBQUEsUUFDRixNQUFNO0FBQUEsUUFDTixXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsUUFDUCxTQUFTO0FBQUEsUUFDVCxhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixhQUFhO0FBQUEsUUFDYixPQUFPO0FBQUEsVUFDTCxFQUFFLEtBQUssdUJBQXVCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxVQUNsRSxFQUFFLEtBQUssdUJBQXVCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxVQUNsRSxFQUFFLEtBQUssdUJBQXVCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxVQUNsRSxFQUFFLEtBQUssZ0NBQWdDLE9BQU8sV0FBVyxNQUFNLGFBQWEsU0FBUyxXQUFXO0FBQUEsUUFDbEc7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSCxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLElBQ0EsUUFBUSxDQUFDLFNBQVMsYUFBYSxtQkFBbUI7QUFBQSxFQUNwRDtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==

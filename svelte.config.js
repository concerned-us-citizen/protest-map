import adapter from "@sveltejs/adapter-static";

const dev = process.env.NODE_ENV === "development";
const base = dev ? "" : (process.env.BASE_PATH ?? "");
const username = dev ? "" : process.env.GITHUB_USERNAME;

export default {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
    }),
    paths: { base },

    prerender: {
      origin: dev ? "http://localhost:5173" : `https://${username}.github.io`,
    },
  },
};

module.exports = {
  apps: [
    {
      name: "ai-chat-backend",
      cwd: "./backend",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "ai-chat-frontend",
      cwd: "./frontend",
      script: "npx",
      args: "vite preview",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};

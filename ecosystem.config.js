module.exports = {
  apps: [
    {
      name: "rwmanage-backend",
      script: "./backend/dist/src/server.js",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "rwmanage-frontend",
      script: "./frontend/.next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};

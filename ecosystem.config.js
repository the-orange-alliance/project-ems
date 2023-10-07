module.exports = {
  apps : [{
    name   : "EMS API",
    script : "./api/index.js",
    env: {
      NODE_ENV: "production",
      SERVICE_NAME: "ems-api",
      SERVICE_PORT: 8080,
      JWT_SECRET: 'toaadmin1',
      RESULTS_API_BASE_URL: "https://api.first.global",
      RESULTS_API_KEY: "7691d689-fe13-443c-9bf7-cccf5e2ec4f3"
    }
  },{
    name   : "EMS REALTIME",
    script : "./realtime/index.js",
    env: {
      NODE_ENV: "production",
      SERVICE_NAME: "ems-realtime",
      SERVICE_PORT: 8081,
      JWT_SECRET: 'toaadmin1'
    }
  },{
    name   : "EMS WEBAPP",
    script : "serve",
    env: {
      NODE_ENV: "production",
      PM2_SERVE_PATH: './webapp',
      PM2_SERVE_PORT: 80,
      PM2_SERVE_SPA: 'true',
    }
  }]
}
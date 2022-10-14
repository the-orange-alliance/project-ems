module.exports = {
  apps : [{
    name   : "EMS API",
    script : "./api/index.js",
    env: {
      "NODE_ENV": "production",
      SERVICE_NAME: "ems-api",
      SERVICE_PORT: 8080,
      JWT_SECRET: 'toaadmin1'
    },
    env_production: {
      env: {
      "NODE_ENV": "production",
      SERVICE_NAME: "ems-api",
      SERVICE_PORT: 8080,
      JWT_SECRET: 'toaadmin1'
    }
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
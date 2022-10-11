module.exports = {
  apps : [{
    name   : "EMS API",
    script : "./api/index.js",
    env: {
      NODE_ENV: "production",
      SERVICE_NAME: "ems-relatime",
      SERVICE_PORT: 8080,
      JWT_SECRET: 'toaadmin1'
    }
  },{
    name   : "EMS REALTIME",
    script : "./realtime/index.js",
    env: {
      NODE_ENV: "production",
      SERVICE_NAME: "ems-relatime",
      SERVICE_PORT: 8081,
      JWT_SECRET: 'toaadmin1'
    }
  }]
}
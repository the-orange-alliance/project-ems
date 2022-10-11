module.exports = {
  apps : [{
    name   : "EMS API",
    script : "./api/Server.js",
    env: {
      NODE_ENV: "production"
    }
  },{
    name   : "EMS REALTIME",
    script : "./api/Server.js",
    env: {
      NODE_ENV: "production"
    }
  }]
}
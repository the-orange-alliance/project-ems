import dotenv from 'dotenv';

interface EnvironmentConfig {
  serviceName: string;
  serviceHost: string;
  servicePort: string;
  jwtSecret: string;
  nodeEnv: string;
  resultsApiBaseUrl: string;
  resultsApiKey: string | null;
}

/**
 * This is kind of an anti-pattern, but I consider it useful for this
 * sole purpose of storing the contents of an environment config inside of a class.
 * The benefits to this are not having to use conditionals for possible
 * non-existant environment variables such as:
 * process.env.SERVICE_HOST || 'default here'
 * Singletons are still at the end of the day, pretty neat.
 */
class Environment {
  private static _instance: Environment;

  private env: EnvironmentConfig;

  private constructor() {
    this.env = {
      serviceName: '',
      serviceHost: '',
      servicePort: '',
      jwtSecret: '',
      nodeEnv: '',
      resultsApiBaseUrl: '',
      resultsApiKey: null
    };
  }

  public static getInstance(): Environment {
    if (!Environment._instance) {
      Environment._instance = new Environment();
    }
    return Environment._instance;
  }

  public loadAndSetDefaults(env: any) {
    dotenv.config();

    this.env.serviceName = env.SERVICE_NAME || 'api';
    this.env.serviceHost = /*env.SERVICE_HOST || */ '0.0.0.0';
    this.env.servicePort = env.SERVICE_PORT || '8080';
    this.env.jwtSecret = env.JWT_SECRET || 'fgc2022';
    this.env.nodeEnv = env.NODE_ENV || 'development';
    this.env.resultsApiBaseUrl =
      env.RESULTS_API_BASE_URL || 'https://api.first.global';
    this.env.resultsApiKey = env.RESULTS_API_KEY || null;
  }

  public get(): EnvironmentConfig {
    return this.env;
  }

  public isProd(): boolean {
    return this.env.nodeEnv === 'production';
  }
}

export default Environment.getInstance();

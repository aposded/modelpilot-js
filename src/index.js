/**
 * ModelPilot JavaScript/TypeScript Client Library
 * OpenAI-compatible interface for intelligent model routing
 */

const axios=require('axios');
const {ChatCompletions}=require('./chat');
const {ModelPilotError,APIError,AuthenticationError,RateLimitError}=require('./errors');
const {validateConfig,buildHeaders,handleResponse}=require('./utils');

/**
 * Main ModelPilot client class
 * Provides OpenAI-compatible API for intelligent model routing
 */
class ModelPilot {
  /**
   * Initialize ModelPilot client
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - ModelPilot API key (required)
   * @param {string} [config.baseURL] - Base URL for ModelPilot API
   * @param {string} [config.routerId] - Router ID to use for requests
   * @param {number} [config.timeout] - Request timeout in milliseconds
   * @param {Object} [config.defaultHeaders] - Default headers to include
   * @param {number} [config.maxRetries] - Maximum number of retries
   */
  constructor(config={}) {
    // Validate configuration
    const validatedConfig=validateConfig(config);

    this.apiKey=validatedConfig.apiKey;
    this.baseURL=validatedConfig.baseURL||'https://your-firebase-project.cloudfunctions.net';
    this.routerId=validatedConfig.routerId||'default';
    this.timeout=validatedConfig.timeout||30000;
    this.defaultHeaders=validatedConfig.defaultHeaders||{};
    this.maxRetries=validatedConfig.maxRetries||3;

    // Validate API key format
    if(!this.apiKey.startsWith('mp_')) {
      throw new Error('Invalid ModelPilot API key format. API key must start with "mp_". Get your API key from https://modelpilot.co');
    }

    // Initialize API sections
    this.chat=new ChatCompletions(this);

    // Create axios instance with default configuration
    this.httpClient=axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders
      }
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use((config) => {
      config.headers=buildHeaders(this.apiKey,config.headers);
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => handleResponse(response),
      (error) => this._handleError(error)
    );
  }

  /**
   * Handle HTTP errors and convert to ModelPilot errors
   * @private
   */
  _handleError(error) {
    if(error.response) {
      const {status,data}=error.response;

      switch(status) {
        case 401:
          throw new AuthenticationError(data.message||'Invalid API key');
        case 429:
          throw new RateLimitError(data.message||'Rate limit exceeded');
        case 400:
          throw new APIError(data.message||'Bad request',status,data);
        case 422:
          throw new APIError(data.message||'Bad request',status,data);
        default:
          throw new APIError(data.message||'API error',status,data);
      }
    } else if(error.request) {
      throw new ModelPilotError('Network error: No response received');
    } else {
      throw new ModelPilotError(`Request error: ${error.message}`);
    }
  }

  /**
   * Make authenticated request to ModelPilot API
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint,options={}) {
    const config={
      url: endpoint,
      method: options.method||'POST',
      data: options.data,
      params: options.params,
      headers: options.headers,
      ...options
    };

    let lastError;

    // Retry logic
    for(let attempt=0;attempt<=this.maxRetries;attempt++) {
      try {
        const response=await this.httpClient(config);
        return response.data;
      } catch(error) {
        lastError=error;

        // Don't retry on authentication or client errors
        if(error instanceof AuthenticationError||
          (error instanceof APIError&&error.status<500)) {
          throw error;
        }

        // Don't retry on last attempt
        if(attempt===this.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay=Math.min(1000*Math.pow(2,attempt),10000);
        await new Promise(resolve => setTimeout(resolve,delay));
      }
    }

    throw lastError;
  }

  /**
   * Get router configuration
   * @returns {Promise<Object>} Router configuration
   */
  async getRouterConfig() {
    const endpoint=`/getRouterConfig/${this.routerId}`;
    return this.request(endpoint,{
      method: 'GET'
    });
  }

  /**
   * Get available models
   * @returns {Promise<Array>} Available models
   */
  async getModels() {
    const endpoint='/getModels';
    return this.request(endpoint,{
      method: 'GET'
    });
  }
}

module.exports=ModelPilot;
module.exports.ModelPilot=ModelPilot;
module.exports.ModelPilotError=ModelPilotError;
module.exports.APIError=APIError;
module.exports.AuthenticationError=AuthenticationError;
module.exports.RateLimitError=RateLimitError;

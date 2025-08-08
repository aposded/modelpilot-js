/**
 * Tests for ModelPilot main client
 */

const axios=require('axios');
const ModelPilot=require('../src/index');
const {ModelPilotError,APIError,AuthenticationError}=require('../src/errors');

// Mock axios
jest.mock('axios');
const mockedAxios=axios;

describe('ModelPilot',() => {
  let client;

  beforeEach(() => {
    client=new ModelPilot({
      apiKey: 'test-api-key',
    });
    jest.clearAllMocks();
  });

  describe('constructor',() => {
    it('should initialize with required config',() => {
      expect(client.apiKey).toBe('test-api-key');
    });

    it('should throw error without API key',() => {
      expect(() => new ModelPilot({})).toThrow('ModelPilot API key is required');
    });

    it('should accept custom configuration',() => {
      const customClient=new ModelPilot({
        apiKey: 'test-key',
        routerId: 'custom-router',
        timeout: 60000,
        maxRetries: 5
      });

      expect(customClient.routerId).toBe('custom-router');
      expect(customClient.timeout).toBe(60000);
      expect(customClient.maxRetries).toBe(5);
    });
  });

  describe('request',() => {
    it('should make successful request',async () => {
      const mockResponse=testUtils.createMockResponse({success: true});
      mockedAxios.mockResolvedValue(mockResponse);

      const result=await client.request('/test',{
        method: 'POST',
        data: {test: 'data'}
      });

      expect(result).toEqual({success: true});
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test',
          method: 'POST',
          data: {test: 'data'}
        })
      );
    });

    it('should handle authentication errors',async () => {
      const mockError=testUtils.createMockError('Invalid API key',401);
      mockedAxios.mockRejectedValue(mockError);

      await expect(client.request('/test')).rejects.toThrow(AuthenticationError);
    });

    it('should retry on server errors',async () => {
      const mockError=testUtils.createMockError('Server error',500);
      const mockSuccess=testUtils.createMockResponse({success: true});

      mockedAxios
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccess);

      const result=await client.request('/test');
      expect(result).toEqual({success: true});
      expect(mockedAxios).toHaveBeenCalledTimes(3);
    });
  });

  describe('getRouterConfig',() => {
    it('should fetch router configuration',async () => {
      const mockConfig={
        id: 'test-router',
        name: 'Test Router',
        mode: 'smartRouter',
        capabilities: {
          streaming: true,
          functionCalling: true,
          multimodal: false,
          retrieval: false
        }
      };
      mockedAxios.mockResolvedValue(testUtils.createMockResponse(mockConfig));

      const config=await client.getRouterConfig();
      expect(config).toEqual(mockConfig);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/getRouterConfig/default',
          method: 'GET'
        })
      );
    });
  });

  describe('getModels',() => {
    it('should fetch available models',async () => {
      const mockModels=[
        {
          id: 'openai:gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          available: true,
          capabilities: {
            chat: true,
            functions: true,
            vision: false,
            streaming: true
          }
        },
        {
          id: 'anthropic:claude-3',
          name: 'Claude 3',
          provider: 'anthropic',
          available: true,
          capabilities: {
            chat: true,
            functions: true,
            vision: true,
            streaming: true
          }
        }
      ];
      mockedAxios.mockResolvedValue(testUtils.createMockResponse(mockModels));

      const models=await client.getModels();
      expect(models).toEqual(mockModels);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/getModels',
          method: 'GET'
        })
      );
    });
  });

  describe('error handling',() => {
    it('should handle network errors',async () => {
      const networkError=new Error('Network error');
      networkError.request={};
      mockedAxios.mockRejectedValue(networkError);

      await expect(client.request('/test')).rejects.toThrow(ModelPilotError);
    });

    it('should handle request setup errors',async () => {
      const requestError=new Error('Request setup error');
      mockedAxios.mockRejectedValue(requestError);

      await expect(client.request('/test')).rejects.toThrow(ModelPilotError);
    });
  });
});

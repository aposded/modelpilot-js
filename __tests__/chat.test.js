/**
 * Tests for ModelPilot Chat Completions API
 */

const axios = require('axios');
const ModelPilot = require('../src/index');
const { ChatCompletions, ChatCompletionStream } = require('../src/chat');
const { InvalidRequestError } = require('../src/errors');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('ChatCompletions', () => {
  let client;
  let chat;

  beforeEach(() => {
    client = new ModelPilot({
      apiKey: 'test-api-key',
      baseURL: 'https://test.modelpilot.com'
    });
    chat = client.chat;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validMessages = [
      { role: 'user', content: 'Hello!' }
    ];

    it('should create basic chat completion', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'modelpilot-routed',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 12,
          total_tokens: 21
        },
        _meta: {
          modelUsed: 'openai:gpt-3.5-turbo',
          cost: 0.00003,
          latency: 1200
        }
      };

      mockedAxios.mockResolvedValue(testUtils.createMockResponse(mockResponse));

      const completion = await chat.create({
        messages: validMessages,
        max_tokens: 100
      });

      expect(completion).toEqual(mockResponse);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/routerHandler/default',
          method: 'POST',
          data: expect.objectContaining({
            messages: validMessages,
            max_tokens: 100,
            routerId: 'default'
          })
        })
      );
    });

    it('should validate required messages parameter', async () => {
      await expect(chat.create({})).rejects.toThrow(InvalidRequestError);
      await expect(chat.create({ messages: null })).rejects.toThrow(InvalidRequestError);
    });

    it('should validate messages format', async () => {
      await expect(chat.create({ messages: 'invalid' })).rejects.toThrow('messages must be an array');
      await expect(chat.create({ messages: [] })).rejects.toThrow('messages array cannot be empty');
      await expect(chat.create({ 
        messages: [{ role: 'invalid', content: 'test' }] 
      })).rejects.toThrow('role must be one of');
    });

    it('should validate optional parameters', async () => {
      await expect(chat.create({
        messages: validMessages,
        max_tokens: -1
      })).rejects.toThrow('max_tokens must be a positive number');

      await expect(chat.create({
        messages: validMessages,
        temperature: 3
      })).rejects.toThrow('temperature must be between 0 and 2');

      await expect(chat.create({
        messages: validMessages,
        top_p: 0
      })).rejects.toThrow('top_p must be between 0 and 1');
    });

    it('should handle function calling', async () => {
      const functions = [{
        name: 'get_weather',
        description: 'Get weather',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          }
        }
      }];

      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            function_call: {
              name: 'get_weather',
              arguments: '{"location": "New York"}'
            }
          }
        }]
      };

      mockedAxios.mockResolvedValue(testUtils.createMockResponse(mockResponse));

      const completion = await chat.create({
        messages: validMessages,
        functions,
        function_call: 'auto'
      });

      expect(completion.choices[0].message.function_call).toBeDefined();
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            functions,
            function_call: 'auto'
          })
        })
      );
    });

    it('should handle tools (modern function calling)', async () => {
      const tools = [{
        type: 'function',
        function: {
          name: 'calculate',
          description: 'Perform calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: { type: 'string' }
            }
          }
        }
      }];

      mockedAxios.mockResolvedValue(testUtils.createMockResponse({
        choices: [{ message: { role: 'assistant', content: 'Result: 42' } }]
      }));

      await chat.create({
        messages: validMessages,
        tools,
        tool_choice: 'auto'
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tools,
            tool_choice: 'auto'
          })
        })
      );
    });

    it('should validate functions parameter', async () => {
      await expect(chat.create({
        messages: validMessages,
        functions: 'invalid'
      })).rejects.toThrow('functions must be an array');

      await expect(chat.create({
        messages: validMessages,
        functions: [{ description: 'Missing name' }]
      })).rejects.toThrow('name is required');
    });

    it('should validate tools parameter', async () => {
      await expect(chat.create({
        messages: validMessages,
        tools: 'invalid'
      })).rejects.toThrow('tools must be an array');

      await expect(chat.create({
        messages: validMessages,
        tools: [{ function: { name: 'test' } }]
      })).rejects.toThrow('type is required');
    });
  });

  describe('streaming', () => {
    it('should handle streaming completions', async () => {
      const mockStream = {
        data: {
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
            yield Buffer.from('data: {"choices":[{"delta":{"content":" world"}}]}\n\n');
            yield Buffer.from('data: [DONE]\n\n');
          }
        }
      };

      mockedAxios.mockResolvedValue(mockStream);

      const stream = await chat.create({
        messages: [{ role: 'user', content: 'Hello!' }],
        stream: true
      });

      expect(stream).toBeInstanceOf(ChatCompletionStream);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stream: true
          }),
          responseType: 'stream',
          headers: expect.objectContaining({
            'Accept': 'text/event-stream'
          })
        })
      );
    });
  });
});

describe('ChatCompletionStream', () => {
  it('should iterate through stream chunks', async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
        yield Buffer.from('data: {"choices":[{"delta":{"content":" world"}}]}\n\n');
        yield Buffer.from('data: [DONE]\n\n');
      }
    };

    const stream = new ChatCompletionStream(mockStream);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].choices[0].delta.content).toBeDefined();
  });

  it('should convert stream to text', async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
        yield Buffer.from('data: {"choices":[{"delta":{"content":" world"}}]}\n\n');
        yield Buffer.from('data: [DONE]\n\n');
      }
    };

    const stream = new ChatCompletionStream(mockStream);
    const text = await stream.getText();

    expect(text).toBe('Hello world');
  });
});

/**
 * Test Both Interaction Methods with ModelPilot
 * 
 * Method 1: ModelPilot-JS SDK
 * Method 2: OpenAI SDK with modified baseURL
 */

// Method 1: Using ModelPilot-JS SDK
async function testModelPilotJS() {
  console.log('\n=== METHOD 1: ModelPilot-JS SDK ===\n');
  
  const ModelPilot = require('../src/index');
  
  const client = new ModelPilot({
    apiKey: process.env.MODELPILOT_API_KEY || 'mp_your_api_key_here',
    routerId: process.env.MODELPILOT_ROUTER_ID || 'your_router_id',
    baseURL: 'https://modelpilot.co/api', // or your custom domain
    timeout: 30000
  });

  try {
    const completion = await client.chat.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello from ModelPilot-JS!"' }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    console.log('✓ Success!');
    console.log('Response:', completion.choices[0].message.content);
    console.log('Model used:', completion._meta?.modelUsed);
    console.log('Cost:', `$${completion._meta?.cost?.toFixed(6) || '0.000000'}`);
    console.log('Latency:', `${completion._meta?.latency || 0}ms`);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

// Method 2: Using OpenAI SDK
async function testOpenAISDK() {
  console.log('\n=== METHOD 2: OpenAI SDK with ModelPilot ===\n');
  
  try {
    const { OpenAI } = require('openai');
    
    const client = new OpenAI({
      apiKey: process.env.MODELPILOT_API_KEY || 'mp_your_api_key_here',
      baseURL: `https://modelpilot.co/api/router/${process.env.MODELPILOT_ROUTER_ID || 'your_router_id'}`,
      timeout: 30000
    });

    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello from OpenAI SDK!"' }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    console.log('✓ Success!');
    console.log('Response:', completion.choices[0].message.content);
    console.log('Model used:', completion._meta?.modelUsed);
    console.log('Cost:', `$${completion._meta?.cost?.toFixed(6) || '0.000000'}`);
    console.log('Latency:', `${completion._meta?.latency || 0}ms`);
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('ℹ OpenAI SDK not installed. Run: npm install openai');
      console.log('Skipping OpenAI SDK test...');
    } else {
      console.error('✗ Error:', error.message);
    }
  }
}

// Streaming test with ModelPilot-JS
async function testStreamingModelPilotJS() {
  console.log('\n=== STREAMING: ModelPilot-JS SDK ===\n');
  
  const ModelPilot = require('../src/index');
  
  const client = new ModelPilot({
    apiKey: process.env.MODELPILOT_API_KEY || 'mp_your_api_key_here',
    routerId: process.env.MODELPILOT_ROUTER_ID || 'your_router_id',
    baseURL: 'https://modelpilot.co/api'
  });

  try {
    const stream = await client.chat.create({
      messages: [
        { role: 'user', content: 'Count to 5.' }
      ],
      stream: true,
      temperature: 0.7
    });

    console.log('Streaming response:');
    process.stdout.write('> ');
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
    
    console.log('\n✓ Streaming completed');
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

// Streaming test with OpenAI SDK
async function testStreamingOpenAI() {
  console.log('\n=== STREAMING: OpenAI SDK ===\n');
  
  try {
    const { OpenAI } = require('openai');
    
    const client = new OpenAI({
      apiKey: process.env.MODELPILOT_API_KEY || 'mp_your_api_key_here',
      baseURL: `https://modelpilot.co/api/router/${process.env.MODELPILOT_ROUTER_ID || 'your_router_id'}`
    });

    const stream = await client.chat.completions.create({
      messages: [
        { role: 'user', content: 'Count to 5.' }
      ],
      stream: true,
      temperature: 0.7
    });

    console.log('Streaming response:');
    process.stdout.write('> ');
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
    
    console.log('\n✓ Streaming completed');
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('ℹ OpenAI SDK not installed. Skipping...');
    } else {
      console.error('✗ Error:', error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('ModelPilot Integration Test');
  console.log('Testing both ModelPilot-JS and OpenAI SDK methods');
  console.log('='.repeat(60));

  if (!process.env.MODELPILOT_API_KEY || !process.env.MODELPILOT_ROUTER_ID) {
    console.log('\n⚠ Warning: Environment variables not set!');
    console.log('Set MODELPILOT_API_KEY and MODELPILOT_ROUTER_ID');
    console.log('Tests will use placeholder values and likely fail.\n');
  }

  await testModelPilotJS();
  await testOpenAISDK();
  await testStreamingModelPilotJS();
  await testStreamingOpenAI();

  console.log('\n' + '='.repeat(60));
  console.log('Tests completed!');
  console.log('='.repeat(60) + '\n');
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testModelPilotJS,
  testOpenAISDK,
  testStreamingModelPilotJS,
  testStreamingOpenAI,
  runAllTests
};

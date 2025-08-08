# ModelPilot NPM Package Deployment Guide

This guide covers how to deploy the ModelPilot npm package to the npm registry and set up the required backend infrastructure.

## 📋 Prerequisites

Before deploying the ModelPilot npm package, ensure you have:

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com)
2. **Firebase Project**: Set up Firebase project with Cloud Functions
3. **API Keys**: Configure OpenAI and Anthropic API keys
4. **Domain**: Optional custom domain for your API endpoints

## 🚀 Deployment Steps

### Step 1: Prepare the Package

1. **Install Dependencies**
   ```bash
   cd modelpilot
   npm install
   ```

2. **Build the Package**
   ```bash
   npm run build
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Lint Code**
   ```bash
   npm run lint
   ```

### Step 2: Deploy Backend Infrastructure

Before publishing the npm package, deploy the required Cloud Functions:

1. **Deploy ModelPilot Functions**
   ```bash
   cd ../modelpilot-functions
   firebase deploy --only functions
   ```

2. **Verify Endpoints**
   After deployment, verify these endpoints are working:
   - `https://your-project.cloudfunctions.net/routerHandler/{routerId}`
   - `https://your-project.cloudfunctions.net/getRouterConfig/{routerId}`
   - `https://your-project.cloudfunctions.net/getModels`

### Step 3: Configure Package

1. **Update package.json**
   ```json
   {
     "name": "modelpilot",
     "version": "1.0.0",
     "description": "Official JavaScript/TypeScript library for the ModelPilot API",
     "repository": {
       "type": "git",
       "url": "https://github.com/your-org/modelpilot-js.git"
     },
     "homepage": "https://your-domain.com"
   }
   ```

2. **Update Default Base URL**
   In `src/index.js`, update the default baseURL:
   ```javascript
   this.baseURL = validatedConfig.baseURL || 'https://your-project.cloudfunctions.net';
   ```

### Step 4: Publish to NPM

1. **Login to NPM**
   ```bash
   npm login
   ```

2. **Verify Package Contents**
   ```bash
   npm pack --dry-run
   ```

3. **Publish Package**
   ```bash
   npm publish
   ```

   For scoped packages:
   ```bash
   npm publish --access public
   ```

### Step 5: Verify Deployment

1. **Install Published Package**
   ```bash
   npm install modelpilot
   ```

2. **Test Installation**
   ```javascript
   const ModelPilot = require('modelpilot');
   
   const client = new ModelPilot({
     apiKey: 'mp_your_api_key',
     baseURL: 'https://your-project.cloudfunctions.net'
   });
   
   // Test basic functionality
   client.getModels().then(console.log);
   ```

## 🔧 Configuration

### Environment Variables

Set up the following environment variables in your Firebase Functions:

```bash
# In modelpilot-functions/.env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_env
```

### Firebase Configuration

1. **Enable Required APIs**
   - Cloud Functions API
   - Cloud Firestore API
   - Cloud Storage API

2. **Set up Firestore Collections**
   - `models` - Available AI models
   - `routers` - Router configurations
   - `users` - User accounts and API keys
   - `logs` - Request logs and analytics

### Custom Domain (Optional)

1. **Set up Custom Domain**
   ```bash
   firebase hosting:channel:deploy production
   ```

2. **Update Package Base URL**
   ```javascript
   this.baseURL = validatedConfig.baseURL || 'https://api.your-domain.com';
   ```

## 📚 Usage Examples

### Basic Usage

```javascript
const ModelPilot = require('modelpilot');

const client = new ModelPilot({
  apiKey: process.env.MODELPILOT_API_KEY
});

const completion = await client.chat.create({
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
});

console.log(completion.choices[0].message.content);
```

### TypeScript Usage

```typescript
import ModelPilot, { ChatCompletionCreateParams } from 'modelpilot';

const client = new ModelPilot({
  apiKey: process.env.MODELPILOT_API_KEY!
});

const params: ChatCompletionCreateParams = {
  messages: [
    { role: 'user', content: 'Hello, TypeScript!' }
  ]
};

const completion = await client.chat.create(params);
```

## 🔄 Version Management

### Semantic Versioning

Follow semantic versioning for releases:

- **Patch (1.0.1)**: Bug fixes, documentation updates
- **Minor (1.1.0)**: New features, backward compatible
- **Major (2.0.0)**: Breaking changes

### Release Process

1. **Update Version**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Update Changelog**
   ```bash
   # Update CHANGELOG.md with new features/fixes
   ```

3. **Publish Release**
   ```bash
   npm publish
   git push --tags
   ```

## 🔒 Security Considerations

### API Key Management

1. **Validate API Keys**
   - Ensure all API keys start with `mp_` prefix
   - Implement rate limiting per API key
   - Monitor for suspicious usage patterns

2. **Environment Security**
   ```bash
   # Never commit API keys to version control
   echo "*.env" >> .gitignore
   echo ".env.*" >> .gitignore
   ```

### CORS Configuration

```javascript
// In Firebase Functions
const cors = require('cors')({
  origin: [
    'https://your-domain.com',
    'http://localhost:3000' // For development
  ]
});
```

## 📊 Monitoring

### Analytics Setup

1. **Request Logging**
   - Log all API requests with metadata
   - Track usage patterns and costs
   - Monitor error rates and latency

2. **Performance Monitoring**
   ```javascript
   // Example monitoring in Cloud Functions
   const { performance } = require('perf_hooks');
   
   const startTime = performance.now();
   // ... process request
   const duration = performance.now() - startTime;
   
   console.log(`Request processed in ${duration}ms`);
   ```

### Error Tracking

1. **Error Reporting**
   ```bash
   npm install @google-cloud/error-reporting
   ```

2. **Custom Error Handling**
   ```javascript
   const { ErrorReporting } = require('@google-cloud/error-reporting');
   const errors = new ErrorReporting();
   
   try {
     // ... API logic
   } catch (error) {
     errors.report(error);
     throw error;
   }
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```
   Error: Invalid ModelPilot API key format
   ```
   **Solution**: Ensure API key starts with `mp_` prefix

2. **Endpoint Not Found**
   ```
   Error: 404 - Router not found
   ```
   **Solution**: Verify router ID exists and is active

3. **CORS Errors**
   ```
   Error: CORS policy blocked
   ```
   **Solution**: Add your domain to CORS whitelist

### Debug Mode

Enable debug logging:

```javascript
const client = new ModelPilot({
  apiKey: process.env.MODELPILOT_API_KEY,
  debug: true // Add debug flag
});
```

## 📞 Support

- **Documentation**: [docs.modelpilot.com](https://docs.modelpilot.com)
- **GitHub Issues**: [github.com/modelpilot/modelpilot-js/issues](https://github.com/modelpilot/modelpilot-js/issues)
- **Email Support**: support@modelpilot.com
- **Discord Community**: [discord.gg/modelpilot](https://discord.gg/modelpilot)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Next Steps After Deployment:**

1. ✅ Test package installation and basic functionality
2. ✅ Update documentation website
3. ✅ Create migration guides for popular frameworks
4. ✅ Set up automated testing and CI/CD
5. ✅ Monitor usage and gather user feedback

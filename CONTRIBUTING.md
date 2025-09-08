# Contributing to Telegram Resume Matcher Bot

Thank you for your interest in contributing to the Telegram Resume Matcher Bot! This document provides guidelines and information for contributors.

## 🚀 Quick Start for Contributors

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier)
- [Telegram Bot Token](https://core.telegram.org/bots#botfather)
- [OpenAI API Key](https://platform.openai.com/api-keys)

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/help-find-job.git
   cd help-find-job
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Choose Your Development Approach**

   #### **Option A: Quick Testing (Recommended for first-time contributors)**
   ```bash
   # Use shared staging bot - only need OpenAI API key
   cp .env.staging .env
   # Edit .env with your OpenAI API key only
   npm run dev
   # Test locally against @job_search_help_staging_bot
   ```

   #### **Option B: Full Development Setup**
   ```bash
   # Create your own development bot
   cp env.template .env
   # Edit .env with your personal bot credentials
   wrangler login
   npm run deploy:dev
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

### 🤖 **Testing with Staging Bot**

The easiest way to test your changes:

1. **No setup required** - use `.env.staging`
2. **Shared bot**: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)  
3. **Auto-deploys** on every PR for community testing
4. **Just need**: OpenAI API key for local development

### 🚀 **Staging Bot Workflow**

1. **Local development**: Test features using staging bot locally
2. **Create PR**: Your changes auto-deploy to staging  
3. **Community testing**: Others test via staging bot link in PR comments
4. **Merge**: Staging stays updated for next contributor

## 🗂️ Project Structure

```
help-find-job/
├── src/                    # Source code
│   ├── handlers/          # Telegram message handlers
│   ├── services/          # Core business logic
│   ├── utils/            # Shared utilities
│   ├── types/            # TypeScript definitions
│   ├── config/           # Configuration files
│   └── index.ts          # Main entry point
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/                 # Documentation
├── scripts/              # Build and deployment scripts
└── config/               # Environment configurations
```

## 🛠️ Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Development Process
- Write code following our [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Run tests locally: `npm test`
- Check types: `npm run type-check`
- Lint code: `npm run lint`

### 3. Testing Your Changes
```bash
# Run all tests
npm test

# Test specific areas
npm run test:unit
npm run test:integration

# Test with coverage
npm run test:coverage

# Deploy to your dev environment
npm run deploy:dev
```

### 4. Submit a Pull Request
- Push your branch to GitHub
- Create a pull request with a clear description
- Ensure all CI checks pass
- Address any review feedback

## 📝 Coding Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Provide explicit type annotations for function parameters and return types
- Avoid `any` types - use specific types or `unknown`
- Use meaningful variable and function names
- Follow camelCase for variables and functions, PascalCase for types and classes

### Code Style
- Use Prettier for formatting (configured in `package.json`)
- Follow ESLint rules (configured in `package.json`)
- Maximum line length: 80 characters
- Use semicolons
- Use single quotes for strings
- 2 spaces for indentation

### Naming Conventions
- **Files**: kebab-case (`telegram-handler.ts`)
- **Functions**: camelCase (`processResume`)
- **Classes**: PascalCase (`DocumentProcessor`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Interfaces**: PascalCase (`UserSession`)

### Documentation
- Add JSDoc comments for all public functions and classes
- Include examples in documentation where helpful
- Update README.md for user-facing changes
- Add inline comments for complex logic

## 🧪 Testing Guidelines

### Test Structure
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows

### Writing Tests
```typescript
describe('DocumentProcessor', () => {
  describe('extractText', () => {
    it('should extract text from PDF files', async () => {
      // Arrange
      const processor = new DocumentProcessor();
      const pdfBuffer = await readTestFile('sample.pdf');

      // Act
      const result = await processor.extractText(pdfBuffer, 'pdf');

      // Assert
      expect(result).toContain('expected text');
    });
  });
});
```

### Test Coverage
- Aim for >80% code coverage
- Focus on testing business logic
- Mock external dependencies (OpenAI, Telegram API)
- Test error conditions and edge cases

## 🔧 Environment Configuration

### Development Environment
```bash
# Copy and configure environment
cp env.example .env.local

# Required variables
TELEGRAM_BOT_TOKEN=your_dev_bot_token
OPENAI_API_KEY=your_openai_key
WEBHOOK_SECRET=random_secure_string
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### Creating KV Namespaces
```bash
# Create development namespaces
wrangler kv:namespace create "SESSIONS" --env development
wrangler kv:namespace create "CACHE" --env development

# Update wrangler.toml with the generated IDs
```

## 📋 Contribution Types

### 🐛 Bug Fixes
- Check existing issues before creating new ones
- Include reproduction steps
- Add regression tests
- Keep fixes focused and minimal

### ✨ New Features
- Discuss large features in issues first
- Break down complex features into smaller PRs
- Include comprehensive tests
- Update documentation

### 📚 Documentation
- Fix typos and improve clarity
- Add examples and use cases
- Keep README.md up to date
- Document configuration options

### 🔧 Infrastructure
- Improve build and deployment processes
- Enhance development tooling
- Optimize performance
- Improve security

## 🔍 Code Review Process

### Submitting for Review
- Ensure all tests pass
- Include clear PR description
- Reference related issues
- Add screenshots for UI changes
- Keep PRs focused and reasonably sized

### Review Criteria
- **Functionality**: Does it work as intended?
- **Code Quality**: Is it readable and maintainable?
- **Tests**: Are there adequate tests?
- **Documentation**: Is it properly documented?
- **Security**: Are there any security concerns?
- **Performance**: Any performance implications?

## 🚨 Issue Reporting

### Bug Reports
Include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Error messages and logs

### Feature Requests
Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Any breaking changes

## 🌟 Recognition

Contributors will be:
- Added to the CONTRIBUTORS.md file
- Mentioned in release notes for significant contributions
- Invited to be maintainers for sustained contributions

## 📞 Getting Help

- **Questions**: Use [GitHub Discussions](https://github.com/yourusername/help-find-job/discussions)
- **Bugs**: Create [GitHub Issues](https://github.com/yourusername/help-find-job/issues)
- **Chat**: Join our [Discord/Telegram] (coming soon)

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences
- Show empathy towards others

## 🎯 Development Tips

### Performance Optimization
- Use Cloudflare Workers best practices
- Minimize cold start times
- Optimize memory usage
- Cache responses when appropriate

### Security Considerations
- Never commit secrets or API keys
- Validate all user inputs
- Use environment variables for configuration
- Follow secure coding practices

### Debugging
```bash
# View worker logs
npm run logs

# Local development with debugging
npm run dev

# Test webhook locally with ngrok
npm run dev:tunnel
```

### Common Commands
```bash
# Development
npm run dev              # Local development
npm run deploy:dev      # Deploy to dev environment
npm run logs:dev        # View dev logs

# Testing  
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Code Quality
npm run lint           # Lint code
npm run format         # Format code
npm run type-check     # Type checking
```

## 🙏 Thank You

Thank you for contributing to the Telegram Resume Matcher Bot! Your contributions help job seekers worldwide improve their career prospects. Every contribution, no matter how small, makes a difference.

---

**Questions?** Feel free to ask in [Discussions](https://github.com/yourusername/help-find-job/discussions) or create an [Issue](https://github.com/yourusername/help-find-job/issues).

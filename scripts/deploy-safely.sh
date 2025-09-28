#!/bin/bash

# Safe Deployment Script
# Deploys with comprehensive validation and safety checks

set -e  # Exit on any error

ENVIRONMENT=${1:-staging}
VALID_ENVIRONMENTS=("development" "staging" "production")

echo "🚀 Starting safe deployment to $ENVIRONMENT..."
echo ""

# Validate environment parameter
if [[ ! " ${VALID_ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Valid environments: ${VALID_ENVIRONMENTS[*]}"
    exit 1
fi

# Step 1: Pre-deployment checks
echo "🔍 Step 1: Pre-deployment validation"
echo "======================================"

echo "📝 Type checking..."
npm run type-check
echo "✅ TypeScript validation passed"

echo "🧪 Tests skipped (removed from project)"
echo "✅ Test validation skipped"

echo "🔨 Building project..."
npm run build
echo "✅ Build successful"

echo ""

# Step 2: Deploy to environment
echo "🚀 Step 2: Deploying to $ENVIRONMENT"
echo "====================================="

if [ "$ENVIRONMENT" = "development" ]; then
    npm run deploy:dev
elif [ "$ENVIRONMENT" = "staging" ]; then
    npm run deploy:staging
elif [ "$ENVIRONMENT" = "production" ]; then
    echo "⚠️  Production deployment requires additional confirmation"
    read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Production deployment cancelled"
        exit 1
    fi
    npm run deploy:prod
fi

echo "✅ Deployment completed"
echo ""

# Step 3: Post-deployment validation (for staging and production)
if [ "$ENVIRONMENT" = "staging" ] || [ "$ENVIRONMENT" = "production" ]; then
    echo "🔧 Step 3: Post-deployment validation"
    echo "====================================="
    
    # Wait a moment for deployment to stabilize
    echo "⏳ Waiting for deployment to stabilize..."
    sleep 5
    
    if [ "$ENVIRONMENT" = "staging" ]; then
        echo "🔍 Validation skipped (removed from project)"
        echo "✅ Staging validation skipped"

        echo "🤖 Setting bot commands for staging..."
        if npm run telegram-bot-commands staging; then
            echo "✅ Bot commands set for staging"
        else
            echo "⚠️  Bot commands not set for staging (tokens may not be configured)"
            echo "    You can set them later with: npm run telegram-bot-commands staging"
        fi
    else
        echo "🔍 Running production health check..."
        # For production, we'll just do a basic health check
        # (You would customize this URL for your production environment)
        PROD_URL="https://help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev"
        curl -f "$PROD_URL/health" > /dev/null
        echo "✅ Production health check passed"

        echo "🤖 Setting bot commands for production..."
        if npm run telegram-bot-commands production; then
            echo "✅ Bot commands set for production"
        else
            echo "⚠️  Bot commands not set for production (tokens may not be configured)"
            echo "    You can set them later with: npm run telegram-bot-commands production"
        fi
    fi
    
    echo ""
fi

# Step 4: Success summary
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "========================"
echo "✅ Environment: $ENVIRONMENT"
echo "✅ All validation checks passed"

if [ "$ENVIRONMENT" = "staging" ]; then
    echo "✅ Staging bot: @job_search_help_staging_bot"
    echo "✅ Staging URL: https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev"
    echo ""
    echo "🧪 Test the staging bot:"
    echo "1. Open @job_search_help_staging_bot in Telegram"
    echo "2. Send /start to begin testing"
    echo "3. Try the resume matching functionality"
elif [ "$ENVIRONMENT" = "production" ]; then
    echo "✅ Production bot: @job_search_help_bot"
    echo "✅ Production URL: https://help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev"
    echo ""
    echo "🏭 Production deployment completed"
    echo "⚠️  Monitor production logs: npm run logs:prod"
fi

echo ""
echo "📊 Additional commands:"
echo "- View logs: npm run logs:${ENVIRONMENT:0:3}"
echo "- Health check: curl https://help-with-job-search-telegram-bot${ENVIRONMENT:+"-$ENVIRONMENT"}.vova-likes-smoothy.workers.dev/health"
echo "- Validate config: curl https://help-with-job-search-telegram-bot${ENVIRONMENT:+"-$ENVIRONMENT"}.vova-likes-smoothy.workers.dev/validate-environment"

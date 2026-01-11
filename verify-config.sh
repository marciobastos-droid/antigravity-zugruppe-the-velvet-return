#!/bin/bash
# Verification script to check if Base44 credentials are properly configured

echo "🔍 Checking Base44 Configuration..."
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local found"
    
    # Check for required variables
    if grep -q "VITE_BASE44_APP_ID=" .env.local; then
        APP_ID=$(grep "VITE_BASE44_APP_ID=" .env.local | cut -d '=' -f2)
        if [ "$APP_ID" != "your_app_id_here" ] && [ -n "$APP_ID" ]; then
            echo "✅ VITE_BASE44_APP_ID is configured"
        else
            echo "❌ VITE_BASE44_APP_ID needs to be set in .env.local"
        fi
    else
        echo "❌ VITE_BASE44_APP_ID not found in .env.local"
    fi
    
    if grep -q "VITE_BASE44_BACKEND_URL=" .env.local; then
        BACKEND_URL=$(grep "VITE_BASE44_BACKEND_URL=" .env.local | cut -d '=' -f2)
        if [ "$BACKEND_URL" != "your_backend_url_here" ] && [ -n "$BACKEND_URL" ]; then
            echo "✅ VITE_BASE44_BACKEND_URL is configured"
            
            # Check if it's a valid URL
            if [[ $BACKEND_URL == https://* ]]; then
                echo "✅ Backend URL starts with https://"
            else
                echo "⚠️  Backend URL should start with https://"
            fi
        else
            echo "❌ VITE_BASE44_BACKEND_URL needs to be set in .env.local"
        fi
    else
        echo "❌ VITE_BASE44_BACKEND_URL not found in .env.local"
    fi
else
    echo "❌ .env.local not found"
    echo "   Run: cp .env.example .env.local"
fi

echo ""
echo "📝 For GitHub Pages deployment, make sure to add these as GitHub Secrets:"
echo "   Settings → Secrets and variables → Actions"
echo "   - VITE_BASE44_APP_ID"
echo "   - VITE_BASE44_BACKEND_URL"

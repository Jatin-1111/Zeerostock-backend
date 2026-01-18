#!/bin/bash

# Bash Script to Set Environment Variables to AWS Elastic Beanstalk
# Usage: ./scripts/set-eb-env.sh <environment-name> [application-name] [env-file]

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENV_NAME="${1}"
APP_NAME="${2:-zeerostock-backend}"
ENV_FILE="${3:-.env}"

if [ -z "$ENV_NAME" ]; then
    echo -e "${RED}Error: Environment name is required${NC}"
    echo "Usage: $0 <environment-name> [application-name] [env-file]"
    echo "Example: $0 zeerostock-backend-prod zeerostock-backend .env"
    exit 1
fi

echo -e "${GREEN}Setting environment variables to Elastic Beanstalk environment: $ENV_NAME${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    echo -e "${YELLOW}Visit: https://aws.amazon.com/cli/${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE file not found!${NC}"
    exit 1
fi

# Read .env file and create option settings
OPTION_SETTINGS=""
COUNT=0

while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    # Parse key=value
    if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
        KEY="${BASH_REMATCH[1]}"
        VALUE="${BASH_REMATCH[2]}"
        
        # Trim whitespace
        KEY=$(echo "$KEY" | xargs)
        VALUE=$(echo "$VALUE" | xargs)
        
        # Remove quotes if present
        VALUE="${VALUE%\"}"
        VALUE="${VALUE#\"}"
        VALUE="${VALUE%\'}"
        VALUE="${VALUE#\'}"
        
        # Add to option settings
        if [ -n "$OPTION_SETTINGS" ]; then
            OPTION_SETTINGS="$OPTION_SETTINGS "
        fi
        OPTION_SETTINGS="${OPTION_SETTINGS}aws:elasticbeanstalk:application:environment,$KEY=$VALUE"
        
        echo -e "  ${CYAN}Adding: $KEY${NC}"
        ((COUNT++))
    fi
done < "$ENV_FILE"

if [ $COUNT -eq 0 ]; then
    echo -e "${YELLOW}No environment variables found in $ENV_FILE${NC}"
    exit 0
fi

echo -e "\n${GREEN}Total variables to set: $COUNT${NC}"
echo -e "\n${YELLOW}Uploading to Elastic Beanstalk...${NC}"

# Set environment variables using AWS CLI
if aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --option-settings $OPTION_SETTINGS 2>&1; then
    
    echo -e "\n${GREEN}Success! Environment variables have been set.${NC}"
    echo -e "${YELLOW}Note: The environment will restart to apply changes.${NC}"
else
    echo -e "\n${RED}Error setting environment variables${NC}"
    exit 1
fi

echo -e "\n${GREEN}Done!${NC}"

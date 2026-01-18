#!/bin/bash

# Alternative: Set EB Environment Variables using JSON format
# This approach is better for handling special characters and long values
# Usage: ./scripts/set-eb-env-json.sh <environment-name> [env-file]

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

ENV_NAME="${1}"
ENV_FILE="${2:-.env}"

if [ -z "$ENV_NAME" ]; then
    echo -e "${RED}Error: Environment name is required${NC}"
    echo "Usage: $0 <environment-name> [env-file]"
    echo "Example: $0 zeerostock-backend-prod .env"
    exit 1
fi

echo -e "${GREEN}Setting environment variables to Elastic Beanstalk: $ENV_NAME${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found!${NC}"
    exit 1
fi

# Create JSON array
JSON_SETTINGS="["
FIRST=true
COUNT=0

while IFS= read -r line || [ -n "$line" ]; do
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
        KEY="${BASH_REMATCH[1]}"
        VALUE="${BASH_REMATCH[2]}"
        
        KEY=$(echo "$KEY" | xargs)
        VALUE=$(echo "$VALUE" | xargs)
        
        # Remove quotes
        VALUE="${VALUE%\"}"
        VALUE="${VALUE#\"}"
        VALUE="${VALUE%\'}"
        VALUE="${VALUE#\'}"
        
        # Escape special characters for JSON
        VALUE=$(echo "$VALUE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
        
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            JSON_SETTINGS="${JSON_SETTINGS},"
        fi
        
        JSON_SETTINGS="${JSON_SETTINGS}{\"Namespace\":\"aws:elasticbeanstalk:application:environment\",\"OptionName\":\"$KEY\",\"Value\":\"$VALUE\"}"
        
        echo -e "  ${CYAN}Adding: $KEY${NC}"
        ((COUNT++))
    fi
done < "$ENV_FILE"

JSON_SETTINGS="${JSON_SETTINGS}]"

if [ $COUNT -eq 0 ]; then
    echo -e "${YELLOW}No environment variables found${NC}"
    exit 0
fi

echo -e "\n${GREEN}Total variables: $COUNT${NC}"
echo -e "${YELLOW}Uploading to EB...${NC}"

# Write to temp file
TEMP_FILE=$(mktemp)
echo "$JSON_SETTINGS" > "$TEMP_FILE"

# Update environment
if aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --option-settings file://"$TEMP_FILE" 2>&1; then
    
    echo -e "\n${GREEN}Success!${NC}"
    echo -e "${YELLOW}Environment will restart to apply changes${NC}"
else
    echo -e "\n${RED}Error occurred${NC}"
    rm "$TEMP_FILE"
    exit 1
fi

rm "$TEMP_FILE"
echo -e "\n${GREEN}Done!${NC}"

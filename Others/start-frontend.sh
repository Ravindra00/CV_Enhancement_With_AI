#!/bin/bash

# Frontend startup script
cd "$(dirname "$0")/frontend"
export BROWSER=none
export PORT=3000
npm start

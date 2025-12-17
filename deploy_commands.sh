#!/bin/bash

# 1. Deployment to GitHub
echo "--- 🚀 Deploying to GitHub ---"
# Enter your correct repo URL here if different
REPO_URL="https://github.com/vndangkhoa/spotify-clone.git"

if git remote | grep -q "origin"; then
    echo "Remote 'origin' already exists. Setting URL..."
    git remote set-url origin $REPO_URL
else
    git remote add origin $REPO_URL
fi

echo "Staging and Committing changes..."
git add .
git commit -m "Update: Add Media Session API for native mobile controls"

echo "Pushing code..."
# This might fail if the repo doesn't exist on GitHub yet.
# Go to https://github.com/new and create 'spotify-clone' first!
git push -u origin main

# 2. Deployment to Docker Hub
echo ""
echo "--- 🐳 Deploying to Docker Hub ---"
echo "Building Image..."
# Ensure Docker Desktop is running!
# Use --platform to build for Synology NAS (x86_64) from Apple Silicon Mac
docker build --platform linux/amd64 -t vndangkhoa/spotify-clone:latest .

echo "Pushing Image..."
docker push vndangkhoa/spotify-clone:latest

echo ""
echo "--- ✅ Deployment Script Finished ---"

#!/bin/bash

echo "Starting video processing container..."

echo "Processing video with ID: $VIDEO_ID"
echo "Input bucket: $INPUT_BUCKET"
echo "Output path: $OUTPUT_PATH"
echo "DB URL: $DATABASE_URL"

node index.js

echo "Video processing,,,!"

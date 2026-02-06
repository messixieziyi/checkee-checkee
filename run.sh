#!/bin/bash
# Helper script to run the scraper with virtual environment

cd "$(dirname "$0")"
source venv/bin/activate
python update_and_detect.py "$@"

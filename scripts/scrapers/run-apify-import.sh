#!/bin/bash
cd /opt/viberyte/lumina-web
node scripts/scrapers/apify-markdown-importer.js "https://api.apify.com/v2/datasets/UPqH8CGhoMSG9ulyG/items?token=apify_api_N5NyIilgQUceEgq7oC3p4nFiKjkt5t0ctmel" >> logs/apify-import.log 2>&1

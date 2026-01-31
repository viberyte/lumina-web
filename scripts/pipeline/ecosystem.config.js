module.exports = {
  apps: [
    {
      name: 'dc-enrichment',
      script: './dc/super_enrich_dc.js',
      interpreter: 'node',
      cwd: '/opt/viberyte/lumina-web/scripts/pipeline/dc',
      env: {
        GOOGLE_PLACES_API_KEY: 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs',
        ANTHROPIC_API_KEY: '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',
        OPENAI_API_KEY: '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',
        YELP_API_KEY: 'EsJhi3G_qFRGUMUKUM98OUp-uPKTo3ydHHYhwwvk0Iyn2_ldV7f6qx81m3r5RHjlVrzEz-NV8CxDzin8AJM0qycF_iEcTb00xr2e7XgOoh2rMdusfqo7TcKVmzMqaXYx'
      }
    },
    {
      name: 'philly-enrichment',
      script: './philly/super_enrich_philly.js',
      interpreter: 'node',
      cwd: '/opt/viberyte/lumina-web/scripts/pipeline/philly',
      env: {
        GOOGLE_PLACES_API_KEY: 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs',
        ANTHROPIC_API_KEY: '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',
        OPENAI_API_KEY: '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',
        YELP_API_KEY: 'EsJhi3G_qFRGUMUKUM98OUp-uPKTo3ydHHYhwwvk0Iyn2_ldV7f6qx81m3r5RHjlVrzEz-NV8CxDzin8AJM0qycF_iEcTb00xr2e7XgOoh2rMdusfqo7TcKVmzMqaXYx'
      }
    }
  ]
};

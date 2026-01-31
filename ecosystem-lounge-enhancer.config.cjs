module.exports = {
  apps: [{
    name: 'lounge-enhancer',
    script: './scripts/enhance-lounges-multi-api.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: false,
    watch: false,
    env: {
      NODE_ENV: 'production',
      OPENAI_API_KEY: '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',
      GOOGLE_PLACES_API_KEY: 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs',
      YELP_API_KEY: 's_HIAQCpglV2hAuxIQbaiAVH6cmSfmEX6rQlf1qcqxeogZD7hM3S3Xo-r_nf7bWg6tW26Xx5Y7-I8EfF9DqFGOmMo3UU_Y7CKbAOdlGzXIxzLV4NTTJ6Gvx8Odr5Z3Yx'
    }
  }]
};

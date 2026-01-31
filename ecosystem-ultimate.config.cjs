module.exports = {
  apps: [{
    name: 'ultimate-moat',
    script: 'scripts/enhance-complete-photos-comments.js',
    cwd: '/opt/viberyte/lumina-web',
    interpreter: 'node',
    autorestart: false,
    env: {
      OPENAI_API_KEY: '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',
      GOOGLE_PLACES_API_KEY: 'AIzaSyDz4lysVaUARLr3WSl0nqKvCuRmMd58_Rs',
      YELP_API_KEY: 'mmJ7tNWTJOrnlSDOH65eT8M6EdYjRj1si8UvV8zLno6Ig9nSv58h6zSNfnylZ97ULOt58rX2aSSPQ90Agdir3EoVBVt653_gJiuSsoGcHoXsU4kDzciomY1fur0GaXYx'
    }
  }]
};

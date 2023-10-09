const production = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
};

const development = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: '9000',
    Meta_WA_accessToken:'EAAJGS89SuJoBOyWHUIqHYZBym2VX5THdxhWSdvTRZBUCM04C9CaVIWK4YC8QZAZB6z2ZBmtsv1Tqr6RU7zLfCLJ5rh9HLgNmN9ohlQFCSNg46tDlSZAIZBIeB0jo20cToMK3bDjKGVSObeN6xTOaNnwV3RY1yiMQJRqwx66H9uFvqZCiJHNVlE9yW3Tx5Envk49rAAhoKZCkR9xy3lEaTM80FQk7ZBx9M9vKAZD',
    Meta_WA_SenderPhoneNumberId: '117553451225848',
    Meta_WA_wabaId: '111240965196342',
    Meta_WA_VerifyToken: 'YouCanSetYourOwnToken',
};

const fallback = {
    ...process.env,
    NODE_ENV: undefined,
};

module.exports = (environment) => {
    console.log(`Execution environment selected is: "${environment}"`);
    if (environment === 'production') {
        return production;
    } else if (environment === 'development') {
        return development;
    } else {
        return fallback;
    }
};
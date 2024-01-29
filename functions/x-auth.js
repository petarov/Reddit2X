const express = require('express');
const session = require('express-session');
const { TwitterApi } = require('twitter-api-v2');
// const open = require('open');
const config = require('./config.json');

const app = express();
app.use(session({
    secret: 'oqbtWjJsMIBadl1oqbtWjJsMIBadl1',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const port = 3000;
const CALLBACK_URL = `http://localhost:${port}/callback`;
const STORAGE = {}; // static storage

app.get('/callback', async (req, res) => {
    try {
        const { state, code } = req.query;
        const { codeVerifier, sessionState } = STORAGE;

        if (!codeVerifier || !state || !sessionState || !code) {
            return res.status(400).send('You denied the app or your session expired!');
        }

        if (state !== sessionState) {
            return res.status(400).send('Stored session tokens do not match!');
        }

        const client = new TwitterApi({
            clientId: config.twitter.clientId,
            clientSecret: config.twitter.clientSecret
        });

        client.loginWithOAuth2({ code, codeVerifier, redirectUri: CALLBACK_URL })
            .then(async ({ client: loggedClient, accessToken, refreshToken, expiresIn }) => {
                // {loggedClient} is an authenticated client in behalf of some user
                // Store {accessToken} somewhere, it will be valid until {expiresIn} is hit.
                // If you want to refresh your token later, store {refreshToken} (it is present if 'offline.access' has been given as scope)
                console.log('Here are your tokens:');
                console.log('-----------------');
                console.log(`accessToken: ${accessToken}`);
                console.log(`refreshToken: ${refreshToken}`);
                console.log(`accessTokenCreateTime: ${Date.now()}`);
                console.log(`accessTokenExpiresIn: ${expiresIn}`);
                console.log('-----------------');

                const { data } = await loggedClient.v2.me();
                console.debug('test /me', data);

                res.status(200).send('OK');
            })
            .catch((e) => {
                console.error(e);
                res.status(403).send('Invalid verifier or access tokens!')
            });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error occurred.');
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// Step 2: Open the authorization URL in the browser
(async () => {
    const client = new TwitterApi({
        clientId: config.twitter.clientId,
        clientSecret: config.twitter.clientSecret
    });
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
        CALLBACK_URL, { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] });
    //   const { redirect_url } = await client.getRequestToken({
    //     callback: `http://localhost:${port}/callback`,
    //   });
    STORAGE.codeVerifier = codeVerifier;
    STORAGE.sessionState = state;
    console.log('Write these down:');
    console.log('-----------------');
    console.log(`codeVerifier: ${STORAGE.codeVerifier}`);
    console.log(`state: ${STORAGE.sessionState}`);
    console.log('-----------------');
    console.log(`Open the redirect url in your browser: ${url}`);
})();

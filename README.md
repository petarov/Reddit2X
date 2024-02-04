Reddit2X
==========================

Auto-syncs posts from a `Reddit` subreddit to `X (Twitter)` or _Xwitter_ using Firebase functions

# How does it work?

It uses `Firestore` and `Functions` to synchronize and publish posts on regular intervals.

There are 3 functions in total:

  - `xpublish`: publishes new x posts
  - `redditdownloadandsave`: downloads the last `reddit.maxPosts` posts from Reddit and saves the new ones to Firebase as *unpublished*
  - `trasherdeleteoldposts`: removes reddit posts older than `reddit.postTTLDays` from Firebase to save on space

# Setup

Go to `./functions` in the repo and copy `config.json.template` to `config.json`.

Configure the [cron schedule](https://crontab.guru) for each function under `cron` or just leave the defaults.

## Firebase

Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.

Create the `firebase.collectionName` first. An index is required. You can check the `firestore.indexes.json` file or create it yourself.

```json
    {
      "collectionGroup": "<your-collection-name>",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "is_on_x",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "ASCENDING"
        }
      ]
    }
```

Note the `firebase.postTTLDays` config parameter - if the subbreddit is not quite active, you'd like to keep this value high.
Posts that are cleaned up from Firebase will be recongnized as new the next time `redditdownloadandsave` runs.

## Reddit

Create a new app and add the client id, key and refresh token to your `config.json`.

See [reddit.com/wiki/api](https://www.reddit.com/wiki/api/) for more details.

Use the [Reddit OAuth Helper](https://not-an-aardvark.github.io/reddit-oauth-helper/) to easily generate your refresh token.

TODO: [Refresh tokens validity?](https://www.reddit.com/r/redditdev/comments/kvzaot/oauth2_api_changes_upcoming/)

You can limit which posts are considered for posting and which not: `reddit.minUpvoteRatio` is checked first and then `reddit.minUpvotes`. Posts with insufficient upvote ratio or upvotes will be skipped.

## Xwitter

Xwitter is a real bummer to set up. You need to use the new OAuth 2.0 authentication scheme to get an access token that is only valid for about 2 hours. You will also get a refresh token with which you can get a new access token. 

Go to [developer.twitter.com/](https://developer.twitter.com/) and create a new app. 

Go to `User authentication settings` in the app and make sure the `Type of App` is set to `Web App, Automated App or Bot`. Use `http://localhost:3000/callback` as value for the `Callback URI / Redirect URL` field in `App Info`.

Go to `Keys and tokens` in the app ane generate your `OAuth 2.0 Client ID and Client Secret`. Copy those two to your `config.json` file.

Run `node x-auth.js` to initiate the access and refresh tokens generation process. Check the messages in the CLI on how to proceed. You'll need to manually open the url presented in the console in a browser in order to approve your app at Xwitter. After that, Xwitter will call the localhost url above to send back the tokens. This means you'll need to return to the console window and copy the `accessToken`, `refreshToken`, `accessTokenCreateTime` and `accessTokenExpiresIn` to your `config.json` file to finish the setup.

Note: The `xpublish` function checks for the validity of the access token before posting, however be advised that you should not post in intervals bigger than 2 hours. There seems to be a bug at Xwitter that prevents refresh tokens from working after the access token has expired.

Do not set a value greater than `140` for `twitter.maxPostLen`. The API does not support larger posts, yet.

# Deploy

Install the [google-cloud-sdk](https://cloud.google.com/sdk).

To deploy the functions to Firebase run:

    firebase deploy --only functions

# License

[MIT](LICENSE)
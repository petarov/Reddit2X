Reddit2X
==========================

Auto-syncs posts from a `Reddit` subreddit to `X (Twitter)` using Firebase functions

# How does it work?

It uses `Firestore` and `Functions` to synchronize and publish posts on regular intervals.

There are 3 functions in total:

  - `xpublish`: publishes new x posts
  - `redditdownloadandsave`: downloads the last `reddit.maxPosts` posts from Reddit and saves the new ones to Firebase as *unpublished*
  - `trasherdeleteoldposts`: removes reddit posts older than `reddit.postTTLDays` from Firebase to save on space

# Setup

Go to `./functions` in the repo and copy `config.json.template` to `config.json`.

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

## Twitter

TODO

# Deploy

Install the [google-cloud-sdk](https://cloud.google.com/sdk).

To deploy the functions to Firebase run:

    firebase deploy --only functions

# License

[MIT](LICENSE)
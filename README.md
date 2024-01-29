Reddit2X
==========================

Publish (sync) `Reddit` subreddit posts on `X (Twitter)` using Firebase functions

# Setup

Go to `./functions` and copy `config.json.template` to `config.json`. 

## Firebase

An index is required. You can check the `firestore.indexes.json` file or create it yourself.

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

## Reddit

Create a new app and add the client id, key and refresh token to your `config.json`.

You can use the [Reddit OAuth Helper](https://not-an-aardvark.github.io/reddit-oauth-helper/) to generate your refresh token.

See [reddit.com/wiki/api](https://www.reddit.com/wiki/api/) for more details.

TODO: [Refresh tokens validity?](https://www.reddit.com/r/redditdev/comments/kvzaot/oauth2_api_changes_upcoming/)

## Twitter

TODO

# Deploy

There are 3 functions in total:

  - `xpublish`: publishes new x post
  - `redditdownloadandsave`: downloads the last N posts from Reddit and saves the new ones to firebase as `unpublished`
  - `trasherdeleteoldposts`: removes old reddit posts from firebase to save on space

To deploy the functions to firebase run:

    firebase deploy --only functions

# License

[MIT](LICENSE)
Reddit2X
==========================

Publish (sync) `Reddit` subreddit posts on `X (Twitter)` using a Firebase function.

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

TODO

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
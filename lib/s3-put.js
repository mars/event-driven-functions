const loggers = require('./loggers');
var fs = require('fs');
var knox = require('knox');

module.exports = function s3Put(localFilename, remoteFilename, env, logger = loggers.default) {

  if (localFilename == null || localFilename === '') {
    throw new Error('localFilename argument is required');
  }
  if (remoteFilename == null || remoteFilename === '') {
    throw new Error('remoteFilename argument is required');
  }
  if (env == null) {
    throw new Error('env object argument is required');
  }
  if (env.AWS_REGION == null) {
    throw new Error('AWS_REGION env var is required');
  }
  if (env.AWS_ACCESS_KEY_ID == null) {
    throw new Error('AWS_ACCESS_KEY_ID env var is required');
  }
  if (env.AWS_SECRET_ACCESS_KEY == null) {
    throw new Error('AWS_SECRET_ACCESS_KEY env var is required');
  }
  if (env.BUCKET_NAME == null) {
    throw new Error('BUCKET_NAME env var is required');
  }

  return new Promise(function(resolve, reject) {

    const client = knox.createClient({
      region: env.AWS_REGION,
      key: env.AWS_ACCESS_KEY_ID,
      secret: env.AWS_SECRET_ACCESS_KEY,
      bucket: env.BUCKET_NAME
    });
    const headers = {
      'x-amz-acl': 'private'
    };

    logger(`       📦  uploading "${localFilename}" to S3`);
    client.putFile(localFilename, remoteFilename, headers, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });

  });
};

# End-to-end tests

Playwright tests run against the Docker image of the site.

## Run locally

Run `npm run test:e2e` in the repository root. Docker must be running.

Screenshot tests do not run locally. Only CI compares screenshots.

## Update reference screenshots

1. Check the diff in the Playwright report of the failed run.
2. Start the update run with `gh workflow run e2e.yml --ref <branch> -f update-snapshots=true`.
3. Find the run id with `gh run list --workflow e2e.yml`.
4. Remove the local images with `rm -r e2e/tests/__screenshots__`. The download refuses to overwrite files, and the artifact holds the full set.
5. Download the new images with `gh run download <run-id> -n screenshots -D e2e/tests/__screenshots__`.
6. Commit the images and push.

Until `e2e.yml` exists on `main`, the `gh workflow run` command cannot find the workflow. Take missing images from the `screenshots` artifact of the failed run instead.

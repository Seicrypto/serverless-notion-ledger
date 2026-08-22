# serverless-notion-ledger

## Deployment Setup

This project includes GitHub Actions workflows for test execution, OpenAPI artifact verification, pre-deploy pipeline checks, and manual deployment to Cloudflare Pages.

### Workflows

- `.github/workflows/tests.yml`
  Reusable/manual workflow that runs the current test suite with `npm test`.
- `.github/workflows/verify-api-artifact.yml`
  Reusable/manual workflow that downloads the latest `openapi.json` artifact from the API repository, regenerates local OpenAPI artifacts, and runs API adapter verification tests.
- `.github/workflows/pipeline.yml`
  Main CI workflow for pushes and pull requests. It runs both `tests.yml` and `verify-api-artifact.yml`, then summarizes all failures together before failing the pipeline.
- `.github/workflows/deploy.yml`
  Manual deployment workflow for Cloudflare Pages. It runs the full pipeline first, then builds and deploys `dist/`.

### Required GitHub Secrets

Set these in `Settings -> Secrets and variables -> Actions -> Secrets`:

- `CLOUDFLARE_API_TOKEN_FRONTEND`
  Cloudflare API token used by the manual deployment workflow.
- `CLOUDFLARE_ACCOUNT_ID`
  Cloudflare account ID for the Pages deployment target.
- `API_REPO_READ_TOKEN`
  Recommended when the API repository is private and `verify-api-artifact.yml` needs to download artifacts across repositories.

### Required GitHub Variables

Set these in `Settings -> Secrets and variables -> Actions -> Variables`:

- `CLOUDFLARE_PAGES_PROJECT_NAME`
  Cloudflare Pages project name used by `deploy.yml`.
- `PUBLIC_API_BASE_URL`
  Public base URL for the API used during the frontend build.
- `API_REPO`
  Full repository name of the API project, for example `your-org/your-api-repo`.
- `API_WORKFLOW`
  Workflow filename in the API repository that uploads the OpenAPI artifact, for example `upload-openapi-artifact.yml`.
- `API_ARTIFACT_NAME`
  Artifact name published by the API repository workflow.
- `API_ARTIFACT_FILE`
  File name inside the downloaded artifact bundle, usually `openapi.json`.

### Cloudflare Pages Notes

The manual deploy workflow uses the official Wrangler GitHub Action and runs:

```bash
pages deploy dist --project-name=$CLOUDFLARE_PAGES_PROJECT_NAME
```

Before using `deploy.yml`, make sure:

1. The Cloudflare Pages project already exists.
2. `npm run build` succeeds locally or in CI.
3. `PUBLIC_API_BASE_URL` points to the correct environment API.

### Typical Flow

1. Push to `dev` or `main` to trigger `tests.yml`, `verify-api-artifact.yml`, and `pipeline.yml`.
2. Fix any summarized failures reported by `pipeline.yml`.
3. Run `deploy.yml` manually from the GitHub Actions tab when you want to deploy to Cloudflare Pages.

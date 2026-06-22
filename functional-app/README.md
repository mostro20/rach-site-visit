# RACH Site Visit v2

Static mobile PWA with local drafts, voice recording, OpenAI transcription, and secure HubSpot note publishing through Azure Functions.

## Form configuration

Edit `form-config.js` to change the Agenda heading and checklist items or the Notes heading and fields. Labels and descriptions can be changed freely. Keep an existing field's `name` unchanged so drafts already saved on a device continue to load into the same field.

The transcript destination menu is generated from the Notes fields in this configuration. Sending a transcript appends it to the selected field and opens that field on the Notes page.

## Security model

Host the static app with Azure Static Web Apps or App Service Authentication using Microsoft Entra ID. Browser clients call only `/api/transcribe` and `/api/publish-hubspot`; OpenAI and HubSpot secrets stay in Azure Function app settings.

The functions trust Azure's `x-ms-client-principal` header and reject unauthenticated requests. If deploying the Functions app separately from Static Web Apps, enable App Service Authentication and block unauthenticated requests so that header is issued by Azure rather than accepted from the public internet. For local work only, set `ENABLE_DEV_AUTH=true`.

## Function settings

Copy `api/local.settings.example.json` to `api/local.settings.json` for local development and set:

- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIPTION_MODEL`, default `whisper-1`
- `HUBSPOT_PRIVATE_APP_TOKEN`
- `HUBSPOT_NOTE_TO_COMPANY_ASSOCIATION_TYPE_ID`, default `190`
- `ALLOWED_EMAIL_DOMAINS`, comma-separated

## API

- `POST /api/transcribe`: multipart form field `audio`, returns `{ text }`.
- `POST /api/publish-hubspot`: JSON payload with `companyId`, `visitDate`, `authorName`, `facilityName`, and `html`.

The default transcription model is `whisper-1` to match the current requirements. Uploaded audio is capped at 25 MB by the function before it is sent for transcription.

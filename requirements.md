# Purpose

PWA that support site visits to Residential Aged Care Homes. Should be used to support conversation via checkable / to-do style agenda, capture data via the form, use the phone's capability to take voice recordings and use OpenAI's Whisper to transcribe, and finally post the full package to HubSpot as a note to record a record of the visit.

# Functionality

The app will have four key areas:

1. Agenda Component
2. Digital Form
3. Voice capture and transcription
4. HubSpot publishing
5. Azure Function backend

## Agenda Component

Referencing `reference/talking-points.md` create an agenda where the staff member can be prompted to check off items, and potentially capture field notes.

## Digital Form

For each site visits produce a digital form inline with `reference/capture-form.docx` to capture data.

## Media capture

One important use case is recording a key conversation, transcribing that conversation and returning back a transcript of the conversation. In a previous version of the spec photos were required, this is no longer required and should be removed from the UI.

## HubSpot Publishing
We want to select a HubSpot company and publish all the text as a blob to a note. We only need org, date, author, and the rest is a HTML blob. This needs to be a secure publishing method.

## Azure Functions

We want two serverless Azure Function endpoints: (1) one to send a voice mp3 / webm voice recording for transcription and returning text; (2) publish to HubSpot notes via API. Ideally we'll have a secure way to publish so it can be intercepted.

# Specifications

This will be used in areas with low data receptions so a PWA that can work off-line is key. Data can be captured locally, or if needed into a SQLite database. If an app is needed, a Flask app can be used, but the simpler tech the better. If possible as a static JS app that is ideal.
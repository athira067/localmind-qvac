# LocalMind

LocalMind is a desktop AI chat application built with Electron, React, TypeScript, and Tether's QVAC SDK.

It runs an AI language model directly on the user's computer instead of sending prompts to a cloud AI service.

## Features

- Local AI inference using QVAC
- No cloud AI API key required
- Chat with a local language model
- Desktop application built with Electron
- AI processing happens on the user's device

## QVAC

LocalMind uses Tether's QVAC SDK.

QVAC SDK version:

`@qvac/sdk 0.20.0`

The application uses these QVAC functions:

- `loadModel()` — loads the local AI model
- `completion()` — generates the AI response

## Requirements

- Node.js
- npm
- Windows, macOS, or Linux desktop environment
- Sufficient RAM for the selected local model

## Installation

Clone the repository:

```bash
git clone YOUR_REPOSITORY_URL
cd localmind
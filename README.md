
# BillSnap – AI-Powered Bill Manager

BillSnap is an AI-powered bill management application that helps users organise their expenses by capturing or uploading bill and receipt images.

It uses Google's Gemini AI to identify bills, extract important information, and suggest expense categories.

## Features

- Capture bills using a device camera.
- Upload bill images from the gallery.
- AI-powered bill and non-bill detection.
- Automatic merchant name extraction.
- Transaction date extraction.
- Total amount extraction.
- Automatic expense category suggestion.
- Review and edit extracted information.
- Save bills locally.
- View saved bills and total expenses.
- Delete saved records.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend development |
| TypeScript | Type-safe development |
| Vite | Development and build tool |
| CSS | User interface styling |
| Google Gemini API | AI image analysis and data extraction |
| Vercel Serverless Functions | Backend API |
| Browser Local Storage | Local expense storage |

## Expense Categories

BillSnap supports the following categories:

- Food
- Groceries
- Utilities
- Transport
- Shopping
- Healthcare
- Education
- Other

## How It Works

1. User captures a bill or uploads an image.
2. The image is sent to the backend API.
3. Gemini AI checks whether the image contains a valid bill.
4. If valid, the AI extracts the merchant, date, total amount, and category.
5. The user reviews and edits the extracted information.
6. The bill is saved in browser Local Storage.

If the uploaded image is not a bill, the application displays a rejection message.

## Project Structure

```text
bill-snap/
├── api/
│   └── analyze.ts
├── docs/
│   └── evaluation-results.md
├── src/
├── public/
├── index.html
├── package.json
├── README.md
└── vercel.json
```

## Installation and Setup

### Prerequisites

- Node.js
- npm
- Google Gemini API key

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Open the project directory

```bash
cd bill-snap
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure the Gemini API key

Configure your API key in the Vercel development environment:

```text
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Never upload your actual API key or secret environment files to GitHub.

### 5. Run the application

```bash
npx vercel dev
```

Open the localhost URL displayed in the terminal.

## AI Evaluation

The application was tested using:

- 15 bill and receipt images.
- 5 non-bill images.
- 1 additional multiple-receipt image.

All five non-bill examples were correctly rejected.

The 15 bill records were successfully analysed and saved. Individual field accuracy has not yet been independently verified against every original receipt.

Refer to `docs/evaluation-results.md` for the testing details.

## Limitations

- Extraction accuracy may vary depending on image quality.
- Blurry and handwritten receipts may be difficult to process.
- AI analysis depends on API availability and usage quotas.
- Expense records are stored locally in the browser.
- Data is not automatically synchronised across devices.

## Future Improvements

- Improve handwritten and damaged receipt recognition.
- Add monthly expense analytics.
- Improve duplicate bill detection.
- Explore offline bill classification.
- Add cloud-based expense synchronisation.

## Project Goal

To make expense tracking easier by using AI to digitise and organise everyday bills and receipts.

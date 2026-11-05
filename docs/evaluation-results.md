
# BillSnap – AI Evaluation Report

## 1. Project Overview

BillSnap is an AI-powered bill management application that allows users to upload or capture receipts and automatically extract important expense information.

## 2. Testing Overview

A total of 20 required images were tested.

- 15 bill and receipt images.
- 5 non-bill images.

One additional multiple-receipt image was tested separately.

## 3. Bill Testing Results

15 bill records were successfully analysed and saved.

The application extracts:
- Merchant name
- Transaction date
- Total amount
- Expense category

The extracted records are stored locally in the application.

Note: Individual field accuracy has not yet been independently verified against all original receipts.

## 4. Non-Bill Testing Results

| No. | Image Type | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| 1 | Portrait photograph | Reject | Rejected | Pass |
| 2 | API key details screenshot | Reject | Rejected | Pass |
| 3 | Aadhaar identity card | Reject | Rejected | Pass |
| 4 | Signature-only image | Reject | Rejected | Pass |
| 5 | Car photograph | Reject | Rejected | Pass |

All five non-bill test images were correctly rejected.

## 5. Additional Test

| Test Image | Expected Result | Actual Result |
|---|---|---|
| Multiple receipts in one image | Reject | Rejected |

## 6. Key Observations

- AI-based bill identification and information extraction.
- Automatic merchant, date and amount extraction.
- Automatic expense category suggestion.
- Editable extracted information.
- Local storage of saved bills.
- Rejection of unrelated images.

## 7. Limitations

- Extraction accuracy requires further field-level verification.
- Blurry and handwritten receipts may affect extraction quality.
- AI analysis depends on API availability and usage quotas.
- Saved bills are currently stored locally in the browser.

## 8. Future Improvements

- Improve extraction of handwritten and damaged receipts.
- Improve duplicate detection.
- Add monthly expense analytics.
- Explore offline bill classification.

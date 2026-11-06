
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenAI } from '@google/genai'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
}

const categories = [
  'Food',
  'Groceries',
  'Utilities',
  'Transport',
  'Shopping',
  'Healthcare',
  'Education',
  'Other',
]

const responseSchema = {
  type: 'object',
  properties: {
    isBill: { type: 'boolean' },
    rejectionReason: { type: ['string', 'null'] },
    merchant: {
      type: 'object',
      properties: {
        value: { type: ['string', 'null'] },
        confidence: { type: 'number' },
      },
      required: ['value', 'confidence'],
    },
    date: {
      type: 'object',
      properties: {
        value: { type: ['string', 'null'] },
        confidence: { type: 'number' },
      },
      required: ['value', 'confidence'],
    },
    total: {
      type: 'object',
      properties: {
        value: { type: ['number', 'null'] },
        confidence: { type: 'number' },
      },
      required: ['value', 'confidence'],
    },
    category: {
      type: 'object',
      properties: {
        value: { type: ['string', 'null'] },
        confidence: { type: 'number' },
      },
      required: ['value', 'confidence'],
    },
  },
  required: [
    'isBill',
    'rejectionReason',
    'merchant',
    'date',
    'total',
    'category',
  ],
}

function safeField(
  field: any,
  allowedValues?: string[],
  expectedType?: 'string' | 'number',
) {
  const value = field?.value ?? null
  const confidence = Number(field?.confidence)

  const validType =
    value === null ||
    (expectedType
      ? typeof value === expectedType
      : typeof value === 'string' || typeof value === 'number')

  const validValue =
    validType &&
    (!allowedValues ||
      value === null ||
      allowedValues.includes(String(value)))

  return {
    value: validValue ? value : null,
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : 0,
  }
}

function isValidDate(value: unknown): boolean {
  if (typeof value !== 'string') return false

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      error: 'Gemini API key is not configured on the server.',
    })
  }

  try {
    const { imageBase64, mimeType } = req.body || {}

    if (
      typeof imageBase64 !== 'string' ||
      typeof mimeType !== 'string' ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
    ) {
      return res.status(400).json({ error: 'Invalid image input.' })
    }

    const cleanBase64 = imageBase64.replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/i,
      '',
    )

    if (!cleanBase64 || cleanBase64.length > 6_000_000) {
      return res.status(413).json({ error: 'Image is too large.' })
    }

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `
You are the receipt and bill analysis engine for BillSnap.

Carefully examine the supplied image.

FIRST: Decide whether the image contains a genuine bill, receipt, invoice, or payment document.

A valid bill should contain visible evidence of a purchase, service, payment, merchant, invoice, or transaction.

Reject:
- Selfies and ordinary photographs
- Identity cards
- Unrelated documents
- Screenshots, chats, and website screenshots
- Blank images and unrelated objects

If it is not a bill:
- Set isBill to false.
- Give a short, polite rejectionReason.
- Set all extracted field values to null.
- Set all confidence values to 0.

If it is a bill, extract these fields:

1. merchant:
The business, institution, service provider, or organization that issued the bill.

2. date:
The transaction or invoice date in YYYY-MM-DD format.
Do not use the current date or invent a date if it is not visible.

3. total:
The final amount paid or payable as a number.
Prefer the final total, grand total, or amount paid.
Do not use subtotal, tax amount, or individual item prices when a final total is available.

4. category:
Choose exactly one category from this list:
Food, Groceries, Utilities, Transport, Shopping, Healthcare, Education, Other.

IMPORTANT CATEGORY CLASSIFICATION RULES:

- Education:
University fees, college fees, school fees, tuition fees, examination fees,
admission fees, academic fees, hostel fees charged by an educational institution,
and other education-related payments.

- Utilities:
Mobile phone recharges, prepaid and postpaid mobile bills,
internet bills, broadband bills, Wi-Fi bills, electricity bills,
water bills, gas bills, and other household or communication services.

- Food:
Restaurant bills, cafe bills, food delivery, takeaway orders,
and meals purchased from food outlets.

- Groceries:
Supermarket bills, grocery stores, vegetables, fruits,
household food supplies, and daily provisions.

- Transport:
Fuel bills, petrol pumps, diesel purchases, taxi rides,
bus tickets, train tickets, and other transportation expenses.

- Shopping:
Clothing, footwear, electronics, accessories,
and general retail purchases that do not fit another category.

- Healthcare:
Hospital bills, doctor consultations, medical tests,
pharmacy purchases, and healthcare services.

- Other:
Bills that genuinely do not fit any of the categories above.

CATEGORY DECISION EXAMPLES:

- University tuition payment -> Education
- College examination fee -> Education
- School fee receipt -> Education
- Mobile recharge receipt -> Utilities
- Airtel or Jio postpaid bill -> Utilities
- Broadband or internet invoice -> Utilities
- Electricity payment receipt -> Utilities
- Restaurant receipt -> Food
- Supermarket receipt -> Groceries
- Petrol receipt -> Transport
- Hospital invoice -> Healthcare

Do not classify a bill as Other just because the merchant name is unfamiliar.
Use the bill's description, line items, and payment purpose to determine its category.

For every extracted field:
- Provide a confidence score between 0 and 1.
- Use null if the information cannot be read.
- Never invent or guess missing merchant names, dates, or amounts.
- Keep category confidence lower when the bill's purpose is unclear.

Return the result using the required JSON schema.
`

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchema,
      },
    })

    const responseText = response.text?.trim()

    if (!responseText) {
      console.error('Gemini returned an empty response:', {
        finishReason: response.candidates?.[0]?.finishReason,
        promptFeedback: response.promptFeedback,
      })

      throw new Error('Gemini returned an empty response.')
    }

    const result = JSON.parse(responseText)

    if (typeof result.isBill !== 'boolean') {
      throw new Error('Invalid AI response structure.')
    }

    if (!result.isBill) {
      return res.status(200).json({
        isBill: false,
        rejectionReason:
          result.rejectionReason ||
          'This image does not appear to be a bill.',
      })
    }

    const merchant = safeField(result.merchant, undefined, 'string')
    const date = safeField(result.date, undefined, 'string')
    const total = safeField(result.total, undefined, 'number')
    const category = safeField(result.category, categories, 'string')

    if (!isValidDate(date.value)) {
      date.value = null
      date.confidence = 0
    }

    if (
      total.value !== null &&
      (!Number.isFinite(total.value) || total.value < 0)
    ) {
      total.value = null
      total.confidence = 0
    }

    return res.status(200).json({
      isBill: true,
      rejectionReason: null,
      merchant,
      date,
      total,
      category,
    })
  } catch (error) {
    console.error('Bill analysis error:', error)

    return res.status(500).json({
      error: 'Unable to analyse this image. Please try again.',
    })
  }
}

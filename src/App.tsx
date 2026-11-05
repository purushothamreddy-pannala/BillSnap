
import { useEffect, useRef, useState } from 'react'
import './App.css'

type BillResult = {
  isBill: boolean
  rejectionReason?: string
  merchant?: unknown
  date?: unknown
  total?: unknown
  category?: unknown
  confidence?: Record<string, number>
}

type BillField = {
  value: string
  confidence: number
}

type SavedBill = {
  id: number
  merchant: string
  date: string
  total: number
  category: string
  savedAt: string
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

function getField(result: BillResult, key: string): BillField {
  const raw = result[key as keyof BillResult] as
    | string
    | number
    | { value?: string | number; confidence?: number }
    | undefined

  if (raw && typeof raw === 'object') {
    return {
      value: String(raw.value ?? ''),
      confidence: Number(
        raw.confidence ?? result.confidence?.[key] ?? 0
      ),
    }
  }

  return {
    value: raw == null ? '' : String(raw),
    confidence: Number(result.confidence?.[key] ?? 0),
  }
}

function confidenceLabel(value: number) {
  if (value >= 0.85) return 'High confidence'
  if (value >= 0.60) return 'Please review'
  return 'Low confidence — check this'
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rejection, setRejection] = useState('')
  const [billFound, setBillFound] = useState(false)

  const [merchant, setMerchant] = useState<BillField>({
    value: '',
    confidence: 0,
  })

  const [date, setDate] = useState<BillField>({
    value: '',
    confidence: 0,
  })

  const [total, setTotal] = useState<BillField>({
    value: '',
    confidence: 0,
  })

  const [category, setCategory] = useState<BillField>({
    value: 'Other',
    confidence: 0,
  })

  const [savedBills, setSavedBills] = useState<SavedBill[]>(() => {
    try {
      if (typeof window === 'undefined') return []

      const saved = localStorage.getItem('billsnap_bills')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [saveMessage, setSaveMessage] = useState('')

  function clearSelectedImage() {
    if (image) URL.revokeObjectURL(image)

    setImage(null)
    setImageFile(null)
    setFileName('')
    setBillFound(false)
    setRejection('')
    setSaveMessage('')
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  async function startCamera() {
    setError('')
    clearSelectedImage()

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Camera access is unavailable. Please use HTTPS or a supported browser.'
      )
      return
    }

    try {
      let stream: MediaStream

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      streamRef.current = stream
      setCameraOpen(true)
    } catch (err) {
      console.error(err)
      setError(
        'Could not access your camera. Please allow camera permission and try again.'
      )
    }
  }

  useEffect(() => {
    if (!cameraOpen) return

    const video = videoRef.current
    const stream = streamRef.current

    if (!video || !stream) return

    video.srcObject = stream
    video.muted = true
    video.playsInline = true

    video.play().catch(err => {
      console.error('Camera playback error:', err)
      setError('Unable to display camera preview. Please try again.')
    })

    return () => {
      video.pause()
      video.srcObject = null
    }
  }, [cameraOpen])

  function capturePhoto() {
    const video = videoRef.current

    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      blob => {
        if (!blob) {
          setError('Could not capture the photo. Please try again.')
          return
        }

        const file = new File([blob], 'camera-photo.jpg', {
          type: 'image/jpeg',
        })

        handleImage(file)
        stopCamera()
      },
      'image/jpeg',
      0.9
    )
  }

  function handleImage(file?: File) {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image.')
      return
    }

    if (image) URL.revokeObjectURL(image)

    setError('')
    setRejection('')
    setBillFound(false)
    setSaveMessage('')
    stopCamera()

    setImage(URL.createObjectURL(file))
    setImageFile(file)
    setFileName(file.name)
  }

  function removeImage() {
    clearSelectedImage()
    setError('')
  }

  
function saveBill() {
  const amount = Number(
    total.value.replace(/,/g, '').replace(/[₹\s]/g, '')
  )

  if (!merchant.value.trim()) {
    setSaveMessage('Please enter the merchant name.')
    return
  }

  if (!total.value.trim() || !Number.isFinite(amount) || amount <= 0) {
    setSaveMessage('Please enter a valid total amount.')
    return
  }

  try {
    // Read the latest saved bills to prevent rapid double-click duplicates.
    const storedBills = localStorage.getItem('billsnap_bills')
    const currentBills: SavedBill[] = storedBills
      ? JSON.parse(storedBills)
      : savedBills

    const normalizedMerchant = merchant.value.trim().toLowerCase()
    const normalizedDate = date.value.trim()
    const normalizedAmount = Number(amount.toFixed(2))

    // Check whether this bill has already been saved.
    const duplicateExists = currentBills.some(bill => {
      const sameMerchant =
        bill.merchant.trim().toLowerCase() === normalizedMerchant

      const sameDate = bill.date.trim() === normalizedDate

      const sameAmount =
        Number(bill.total.toFixed(2)) === normalizedAmount

      return sameMerchant && sameDate && sameAmount
    })

    if (duplicateExists) {
      setSaveMessage('You already added this bill.')
      return
    }

    const newBill: SavedBill = {
      id: Date.now(),
      merchant: merchant.value.trim(),
      date: date.value.trim(),
      total: normalizedAmount,
      category: category.value,
      savedAt: new Date().toISOString(),
    }

    const updatedBills = [...currentBills, newBill]

    localStorage.setItem(
      'billsnap_bills',
      JSON.stringify(updatedBills)
    )

    setSavedBills(updatedBills)
    setSaveMessage('Bill saved successfully!')
  } catch {
    setSaveMessage(
      'Unable to save bill. Browser storage may be full.'
    )
  }
}


  function deleteBill(id: number) {
    const updatedBills = savedBills.filter(bill => bill.id !== id)

    try {
      localStorage.setItem(
        'billsnap_bills',
        JSON.stringify(updatedBills)
      )

      setSavedBills(updatedBills)
    } catch {
      setError('Unable to delete bill. Please try again.')
    }
  }

  async function prepareImage(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file)

    const maxDimension = 1600
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height)
    )

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      throw new Error('Could not process this image.')
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result =>
          result
            ? resolve(result)
            : reject(new Error('Image compression failed.')),
        'image/jpeg',
        0.75
      )
    })

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read the image.'))

      reader.readAsDataURL(blob)
    })
  }

  async function analyseBill() {
    if (!imageFile) {
      setError('Please take a photo or choose an image first.')
      return
    }

    setLoading(true)
    setError('')
    setRejection('')
    setBillFound(false)
    setSaveMessage('')

    try {
      const imageBase64 = await prepareImage(imageFile)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/jpeg',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not analyse this image. Please try again.'
        )
      }

      const result = data as BillResult

      if (!result.isBill) {
        setRejection(
          result.rejectionReason ||
            'This image does not appear to be a bill. Please upload a receipt or invoice.'
        )
        return
      }

      setMerchant(getField(result, 'merchant'))
      setDate(getField(result, 'date'))
      setTotal(getField(result, 'total'))

      const extractedCategory = getField(result, 'category')

      setCategory({
        ...extractedCategory,
        value: categories.includes(extractedCategory.value)
          ? extractedCategory.value
          : 'Other',
      })

      setBillFound(true)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image)
    }
  }, [image])

  const totalExpenses = savedBills.reduce(
    (sum, bill) => sum + bill.total,
    0
  )

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-icon">₹</span>
          <span>Bill Snap</span>
        </div>

        <span className="tag">SMART EXPENSE TRACKER</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR EXPENSES, SIMPLIFIED</p>

        <h1>
          Every bill.
          <br />
          One simple place.
        </h1>

        <p className="subtitle">
          Snap a bill or choose a photo. We'll help organise your expenses.
        </p>
      </section>

      {/* Two-column dashboard */}
      <div className="dashboard-layout">

        {/* LEFT: Upload and AI analysis */}
        <section className="upload-card">
          <div className="upload-icon">↥</div>

          <h2>Upload your bill</h2>

          <p className="upload-description">
            Take a picture of your receipt or select one from your gallery.
          </p>

          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => {
              handleImage(e.target.files?.[0])
              e.currentTarget.value = ''
            }}
          />

          {!cameraOpen && (
            <button className="primary-button" onClick={startCamera}>
              Open camera
            </button>
          )}

          {cameraOpen && (
            <div className="camera-area">
              <video ref={videoRef} autoPlay playsInline muted />

              <button className="primary-button" onClick={capturePhoto}>
                Take photo
              </button>

              <button className="secondary-button" onClick={stopCamera}>
                Close camera
              </button>
            </div>
          )}

          <button
            className="secondary-button"
            onClick={() => galleryRef.current?.click()}
          >
            Choose from gallery
          </button>

          {error && <p className="error-message">{error}</p>}

          {image && (
            <div className="preview">
              <h3>Selected image</h3>

              <img src={image} alt="Selected bill preview" />

              <p>{fileName}</p>

              <button
                className="primary-button"
                onClick={analyseBill}
                disabled={loading}
              >
                {loading ? 'Analysing bill...' : 'Analyse bill with AI'}
              </button>

              <button
                className="secondary-button"
                onClick={removeImage}
                disabled={loading}
              >
                Remove image
              </button>
            </div>
          )}

          {loading && (
            <p className="upload-description">
              Gemini is checking your image and extracting the bill details.
              Please wait.
            </p>
          )}

          {rejection && (
            <div className="result-card">
              <h3>This doesn't look like a bill</h3>

              <p>{rejection}</p>

              <p>
                Please try uploading a clear photo of a receipt or invoice.
              </p>
            </div>
          )}

          {billFound && (
            <div className="result-card">
              <h2>Review your bill details</h2>

              <p>
                Please check the extracted information and correct anything
                that is wrong.
              </p>

              <label>
                Merchant
                <input
                  value={merchant.value}
                  onChange={e =>
                    setMerchant({ ...merchant, value: e.target.value })
                  }
                />
                <small>{confidenceLabel(merchant.confidence)}</small>
              </label>

              <label>
                Date
                <input
                  value={date.value}
                  onChange={e =>
                    setDate({ ...date, value: e.target.value })
                  }
                  placeholder="YYYY-MM-DD"
                />
                <small>{confidenceLabel(date.confidence)}</small>
              </label>

              <label>
                Total amount (₹)
                <input
                  value={total.value}
                  onChange={e =>
                    setTotal({ ...total, value: e.target.value })
                  }
                  inputMode="decimal"
                />
                <small>{confidenceLabel(total.confidence)}</small>
              </label>

              <label>
                Category
                <select
                  value={category.value}
                  onChange={e =>
                    setCategory({ ...category, value: e.target.value })
                  }
                >
                  {categories.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <small>{confidenceLabel(category.confidence)}</small>
              </label>

              <button className="primary-button" onClick={saveBill}>
                Save Bill
              </button>

              {saveMessage && (
                <p className="upload-description">{saveMessage}</p>
              )}
            </div>
          )}
        </section>

        {/* RIGHT: Saved bills and expenses */}
        <aside className="saved-bills">
          <h2>Saved Bills</h2>

          <p>Your expense history</p>

          <div className="expense-summary">
            <span>Total Expenses</span>
            <h2>₹{totalExpenses.toFixed(2)}</h2>
          </div>

          {savedBills.length === 0 ? (
            <p className="upload-description">No bills saved yet.</p>
          ) : (
            savedBills.map(bill => (
              <div className="saved-bill-item" key={bill.id}>
                <div>
                  <strong>{bill.merchant}</strong>
                  <p>
                    {bill.date || 'Date not available'} · {bill.category}
                  </p>
                </div>

                <strong>₹{bill.total.toFixed(2)}</strong>

                <button
                  className="delete-button"
                  onClick={() => deleteBill(bill.id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </aside>

      </div>

      <footer>Bill Snap · Your bills, organised simply.</footer>
    </main>
  )
}

export default App

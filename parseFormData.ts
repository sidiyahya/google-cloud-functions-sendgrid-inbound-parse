import busboy from 'busboy'
import type { Request } from 'express'

/**
 * Parses multipart/form-data request and returns the FormData
 */
export const parseFormData = ({
  headers,
  rawBody,
}: Pick<Request, 'headers' | 'rawBody'>): Promise<FormData> =>
  new Promise((resolve, reject) => {
    if (!rawBody) {
      reject(new Error('rawBody is required for parsing form data'))
      return
    }

    const fields: FormData = {}
    const bb = busboy({ headers })
    bb.on('field', (name, value) => void (fields[name] = value))
    bb.on('close', () => resolve(fields))
    bb.end(rawBody)
  })

export type FormData = { [k: string]: string }

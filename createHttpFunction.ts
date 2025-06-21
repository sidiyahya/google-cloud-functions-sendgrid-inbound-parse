import type { Topic } from '@google-cloud/pubsub'
import type { EmailData } from '@suin/email-data'
import { newEventData } from '@suin/event-data'
import type { Request as ExpressRequest, Response } from 'express'
import { parseEmailData } from './parseEmailData'
import { FormData, parseFormData } from './parseFormData'
import { parseSendgridPayload, SendgridPayload } from './sendgridPayload'

type Request = Pick<ExpressRequest, 'method' | 'headers' | 'rawBody'>

export const createHttpFunction = ({
  topic,
  logger = defaultLogger,
}: Dependencies) => async (
  req: Request,
  res: Pick<Response, 'send' | 'end' | 'status'>,
): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(405).send('Only POST method is supported').end()
    return
  }

  // Generate correlationId
  const correlationId = generateCorrelationId(req.headers, logger)
  logger.info(`CorrelationId generated: ${correlationId}`, { correlationId })

  if (!req.rawBody) {
    logger.error('Request body is empty')
    res.status(400).send('Request body is required').end()
    return
  }

  // Parses form data
  let formData: FormData
  try {
    formData = await parseFormData(req)
  } catch (error) {
    logger.error('Failed to parse the form data', { error })
    res.status(400).send((error as Error).message).end()
    return
  }
  logger.info(`Form data was parsed`)

  // Parses the SendGrid form data
  let sendgridPayload: SendgridPayload
  try {
    sendgridPayload = parseSendgridPayload(formData)
  } catch (error) {
    logger.error('Failed to parse the SendGrid form data', { error, formData })
    res.status(400).send((error as Error).message).end()
    return
  }
  logger.info('SendGrid payload was parsed')

  // Parses the email
  let emailData: EmailData
  try {
    emailData = await parseEmailData(sendgridPayload.email)
  } catch (error) {
    logger.error('Failed to parse email source', {
      email: sendgridPayload.email,
    })
    res.status(400).send((error as Error).message).end()
    return
  }
  logger.info('The email source was parsed')

  // Publishes email
  try {
    const event = newEventData({ correlationId, data: emailData })
    await topic.publish(Buffer.from(JSON.stringify(event), 'utf8'))
    logger.info(`Successfully published the email to topic ${topic.name}`)
  } catch (error) {
    logger.error(`Failed to publish the email to topic ${topic.name}`, {
      emailData,
    })
    res.status(500).send('Something wrong')
    return
  }

  res.status(200).send('OK')
}

const generateCorrelationId = (
  headers: ExpressRequest['headers'],
  logger: Logger,
): string => {
  const id = headers['function-execution-id']
  if (typeof id !== 'string') {
    logger.info('The request header is wrong', { headers, id })
    throw new Error(
      'function-execution-id header in the request is required and must be a single string value',
    )
  }
  return id
}

const defaultLogger: Logger = {
  error(message: string, meta?: unknown): void {
    console.error(JSON.stringify({ message, meta }))
  },
  info(message: string, meta?: unknown): void {
    console.info(JSON.stringify({ message, meta }))
  },
}

export type Dependencies = {
  readonly topic: Pick<Topic, 'publish' | 'name'>
  readonly logger?: Logger
}

export type Logger = Pick<Console, 'info' | 'error'>
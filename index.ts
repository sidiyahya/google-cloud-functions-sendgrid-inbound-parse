import { HttpFunction, Request, Response } from '@google-cloud/functions-framework'
import { PubSub } from '@google-cloud/pubsub'
import { simpleParser } from 'mailparser'

const pubsub = new PubSub()

/**
 * The main function that will be executed by Google Cloud Functions.
 */
export const publishEmailDataOnSendgridInboundParse: HttpFunction = async (
  req: Request,
  res: Response
) => {
  // Add a guard clause to check for the rawBody.
  // This satisfies the modern TypeScript types.
  if (!req.rawBody) {
    console.error('Request is missing rawBody.')
    res.status(400).send('Bad Request: No rawBody found.');
    return;
  }

  try {
    const mail = await simpleParser(req.rawBody)
    const topic = process.env.TOPIC
    if (topic === undefined) {
      throw new Error('The environment variable `TOPIC` is not defined.')
    }
    await pubsub.topic(topic).publishMessage({ json: mail })
    res.status(200).send('Success!')
  } catch (e) {
    const error = e as Error
    console.error(error)
    res.status(500).send(error.message)
  }
}
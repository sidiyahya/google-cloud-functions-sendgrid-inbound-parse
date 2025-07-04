import { EmailData } from '@suin/email-data'
import { AddressObject, simpleParser } from 'mailparser'

export const parseEmailData = (emailRawString: string): Promise<EmailData> =>
  new Promise<EmailData>((resolve, reject) =>
    simpleParser(emailRawString, {}, (err, parsed) =>
      err
        ? reject(err)
        : resolve({
            messageId: parsed.messageId,
            to: toAddressList(parsed.to),
            replyTo: toAddressList(parsed.replyTo),
            from: toAddressList(parsed.from),
            cc: toAddressList(parsed.cc),
            subject: parsed.subject,
            bodyText: parsed.text || undefined,
            bodyHtml: parsed.html || undefined,
            date: parsed.date?.toISOString(),
            source: emailRawString,
          }),
    ),
  )

const toAddressList = (addressObject?: AddressObject | AddressObject[]): EmailData['to'] => {
  if (!addressObject) return []

  // Handle array of AddressObject
  if (Array.isArray(addressObject)) {
    return addressObject.flatMap(addr => 
      addr.value.map(({ name, address }) => ({ 
        name, 
        address: address || '' 
      }))
    )
  }

  // Handle single AddressObject
  return addressObject.value.map(({ name, address }) => ({ 
    name, 
    address: address || '' 
  }))
}

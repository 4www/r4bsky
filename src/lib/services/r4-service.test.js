import {describe, it, expect, vi, beforeEach} from 'vitest'

vi.mock('./bsky-oauth.js', () => ({
  bskyOAuth: { agent: null }
}))

import { bskyOAuth } from './bsky-oauth.js'
import { findFollowUri } from './r4-service.js'

describe('r4-service follow helpers', () => {
  beforeEach(() => {
    bskyOAuth.agent = {
      accountDid: 'did:example:me',
      com: {
        atproto: {
          repo: {
            listRecords: vi.fn().mockResolvedValue({
              data: {
                records: [
                  { uri: 'at://did:example:me/app.bsky.graph.follow/123', value: { subject: 'did:plc:target' } },
                ]
              }
            })
          }
        }
      }
    }
  })

  it('findFollowUri returns record uri for subject', async () => {
    const uri = await findFollowUri('did:plc:target')
    expect(uri).toContain('app.bsky.graph.follow')
  })
})


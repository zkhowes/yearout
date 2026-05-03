// Dispatcher — given a CallContent + AiCopy, return the matching React element.
// Used by the admin test harness, the sponsor approval page, and the cron worker.

import * as React from 'react'
import type { CallContent } from './content'
import type { AiCopy } from '@/lib/ai/call-copy'

import { Stage1ColdStartEmail } from '@/emails/Stage1ColdStart'
import { Stage1OngoingEmail } from '@/emails/Stage1Ongoing'
import { Stage2VoteEmail } from '@/emails/Stage2Vote'
import { Stage3ConfirmedEmail } from '@/emails/Stage3Confirmed'
import { Stage3aCommitEmail } from '@/emails/Stage3aCommit'
import { Stage3bPackListEmail } from '@/emails/Stage3bPackList'
import { Stage4InTripEmail } from '@/emails/Stage4InTrip'
import { Stage5CloseoutEmail } from '@/emails/Stage5Closeout'
import { Stage6MythologyEmail } from '@/emails/Stage6Mythology'

export function renderCallElement(
  content: CallContent,
  copy: AiCopy
): React.ReactElement {
  switch (content.variant) {
    case 'stage1_cold_start':
      return React.createElement(Stage1ColdStartEmail, { content, copy })
    case 'stage1_ongoing':
      return React.createElement(Stage1OngoingEmail, { content, copy })
    case 'stage2_vote':
      return React.createElement(Stage2VoteEmail, { content, copy })
    case 'stage3_confirmed':
      return React.createElement(Stage3ConfirmedEmail, { content, copy })
    case 'stage3a_commit':
      return React.createElement(Stage3aCommitEmail, { content, copy })
    case 'stage3b_pack_list':
      return React.createElement(Stage3bPackListEmail, { content, copy })
    case 'stage4_in_trip':
      return React.createElement(Stage4InTripEmail, { content, copy })
    case 'stage5_closeout':
      return React.createElement(Stage5CloseoutEmail, { content, copy })
    case 'stage6_mythology':
      return React.createElement(Stage6MythologyEmail, { content, copy })
  }
}

/** Map variant → numeric stage column for call_sends. */
export function variantToStage(variant: CallContent['variant']): number {
  switch (variant) {
    case 'stage1_cold_start':
    case 'stage1_ongoing':
      return 1
    case 'stage2_vote':
      return 2
    case 'stage3_confirmed':
      return 3
    case 'stage3a_commit':
      return 31 // 3a sub-stage
    case 'stage3b_pack_list':
      return 32 // 3b sub-stage
    case 'stage4_in_trip':
      return 4
    case 'stage5_closeout':
      return 5
    case 'stage6_mythology':
      return 6
  }
}

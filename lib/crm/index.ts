/**
 * CRM Module — public API surface
 */

export { trackCrmEvent, getRecentEvents, getEventCounts, getRepeatedSearches, getRevisitedProducts } from './events'
export { classifySubscriber } from './segment-engine'
export { runQualityGates } from './quality-gates'
export { generateAlertMessage, generateWeeklyDigest } from './message-generator'
export { runCrmPipeline } from './pipeline'
export { getChannelMetrics, getJourneyMetrics, getAiMetrics, getSubscriberStats } from './metrics'
export type { CrmEventType, CrmEventPayload } from './events'
export type { UserSegment, UserTemperature, SegmentResult } from './segment-engine'
export type { QualityGateInput, QualityGateResult } from './quality-gates'
export type { MessageContext, MessageReason, GeneratedMessage, DigestItem } from './message-generator'
export type { PipelineInput, PipelineResult } from './pipeline'

import { EventLogModel } from "../models/EventLog";

/**
 * Emit and persist a domain event
 */
export async function emitDomainEvent(
  aggregateId: string,
  eventType: "CREATED" | "UPDATED" | "DELETED",
  payload: any,
  userId: string
): Promise<void> {
  try {
    // Strip sensitive fields or fields that don't need logging if needed
    const eventPayload = { ...payload };
    delete eventPayload._id;
    delete eventPayload.createdAt;
    delete eventPayload.updatedAt;

    await EventLogModel.create({
      aggregateId,
      aggregateType: "WorkItem",
      eventType,
      payload: eventPayload,
      userId,
    });
  } catch (error) {
    console.error(`Failed to emit domain event ${eventType} for ${aggregateId}:`, error);
  }
}

/**
 * Reconstruct state of a WorkItem by replaying events up to an optional timestamp (time-travel query)
 */
export async function reconstructState(
  aggregateId: string,
  untilTimestamp?: Date
): Promise<any> {
  const query: any = { aggregateId };
  if (untilTimestamp) {
    query.timestamp = { $lte: untilTimestamp };
  }

  // Sort by timestamp and then by ID to preserve precise insertion order
  const events = await EventLogModel.find(query).sort({ timestamp: 1, _id: 1 }).lean();
  if (events.length === 0) {
    return null;
  }

  let state: any = null;

  for (const event of events) {
    if (event.eventType === "CREATED") {
      state = { ...event.payload, _id: aggregateId };
    } else if (event.eventType === "UPDATED") {
      state = { ...state, ...event.payload };
    } else if (event.eventType === "DELETED") {
      if (state) {
        state.deletedAt = event.payload.deletedAt || new Date();
        state.deletedBy = event.payload.deletedBy || event.userId;
      }
    }
  }

  return state;
}
